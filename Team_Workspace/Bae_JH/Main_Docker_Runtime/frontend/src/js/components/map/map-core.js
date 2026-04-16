/**
 * map-core.js
 * 
 * 카카오맵 초기화 및 부모 창과의 통신을 담당합니다.
 * Bae_JH와 Cha_260414의 기능을 통합한 고급 지도 모듈입니다.
 *
 * 의존 모듈
 *  - map-overlay-controls.js   → 레이어 토글 + 줌 사이드바 (지도 위 absolute)
 *  - map-marker-info.js        → 마커 주소 정보 (Geocoder 기반)
 *
 * 기능
 *  - 현재 위치 버튼 (GPS + IP 폴백)
 *  - 클릭 마커 추가/삭제
 *  - 오버레이 컨트롤 패널 (레이어, 줌)
 *  - 마커 주소 지오코딩
 *  - postMessage 기반 부모-자식 통신
 */

import { initOverlayControls } from './map-overlay-controls.js';
import { initMarkerInfo }       from './map-marker-info.js';

// ── API 키 ────────────────────────────────────────────────────────
const KAKAO_API_KEY = import.meta.env.VITE_KAKAO_MAP_KEY;

// ── SDK 로드 (services 라이브러리 포함) ───────────────────────────
// services 라이브러리는 Geocoder 기능에 필요합니다
const script = document.createElement('script');
script.src = [
  'https://dapi.kakao.com/v2/maps/sdk.js',
  `?appkey=${KAKAO_API_KEY}`,
  '&autoload=false',     // 스크립트 로드 완료 후 수동으로 init
  '&libraries=services', // Geocoder 활성화
].join('');

script.onload = () => {
  kakao.maps.load(() => {
    const container  = document.getElementById('map');
    const defaultPos = new kakao.maps.LatLng(37.5665, 126.9780); // 서울

    // ── 상태 관리 변수 ─────────────────────────────────────────────────
    let activeMarkerPos   = null;        // 현재 활성화된 마커의 좌표
    let lastValidCenter   = null;        // 마지막 유효한 지도 중심
    const clickMarkers    = new Map();   // 생성된 마커 객체 추적 (markerId -> Marker)
    let markerSeq         = 0;           // 마커 ID 생성용 시퀀스
    let _markerImage      = null;        // 마커 이미지 캐싱
    let currentLocationMarker = null;    // 현재 위치 마커

    // ── 마커 이미지 (오렌지-레드 SVG) ────────────────────────────
    function getMarkerImage() {
      if (_markerImage) return _markerImage;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40">
        <path fill="#FF5733" stroke="#CC3300" stroke-width="1.5"
          d="M14 0C6.268 0 0 6.268 0 14c0 10.667 14 26 14 26S28 24.667 28 14C28 6.268 21.732 0 14 0z"/>
        <circle fill="white" cx="14" cy="14" r="6"/>
      </svg>`;
      _markerImage = new kakao.maps.MarkerImage(
        `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
        new kakao.maps.Size(28, 40),
        { offset: new kakao.maps.Point(14, 40) }
      );
      return _markerImage;
    }

    // ── 마커 추가 ─────────────────────────────────────────────────
    function addMarker(map, latlng, markerId, markerInfo) {
      const marker = new kakao.maps.Marker({ 
        position: latlng, 
        map, 
        image: getMarkerImage() 
      });

      // 우클릭 → 삭제
      kakao.maps.event.addListener(marker, 'rightclick', () => {
        marker.setMap(null);
        clickMarkers.delete(markerId);

        // 삭제 후 남은 마커 중 마지막 마커를 활성 상태로 변경
        const remaining = [...clickMarkers.values()];
        activeMarkerPos = remaining.length ? remaining[remaining.length - 1].getPosition() : null;
        markerInfo?.hide(markerId);

        // 서버 API 동기화
        const sid = window.parent?.currentSessionId;
        if (sid) {
          fetch(`/api/sessions/${sid}/map/markers/${encodeURIComponent(markerId)}`, { 
            method: 'DELETE' 
          }).catch(() => {});
        }

        // 부모 창에 이벤트 전달
        if (window.parent) {
          window.parent.postMessage({ type: 'MARKER_REMOVED', markerId }, '*');
        }
      });

      // 좌클릭 → 정보 패널 열기
      kakao.maps.event.addListener(marker, 'click', () => {
        kakao.maps.event.preventMap();
        markerInfo?.show(latlng, markerId);
      });

      clickMarkers.set(markerId, marker);
      activeMarkerPos = latlng;
      return marker;
    }

    // ── 마커 ID로 제거 ────────────────────────────────────────────
    function removeMarkerById(markerId, markerInfo) {
      const m = clickMarkers.get(markerId);
      if (!m) return;
      m.setMap(null);
      clickMarkers.delete(markerId);
      const remaining = [...clickMarkers.values()];
      activeMarkerPos = remaining.length 
        ? remaining[remaining.length - 1].getPosition() 
        : null;
      markerInfo?.hide(markerId);
    }

    // ── 지도 공통 초기화 ──────────────────────────────────────────
    function initMap(map) {
      lastValidCenter = map.getCenter();

      // 부모 창에 지도 객체 노출 (리사이징 등에서 필요)
      if (window.parent) {
        window.parent.kakaoMap       = map;
        window.parent.kakaoMapCenter = lastValidCenter;
        
        kakao.maps.event.addListener(map, 'center_changed', () => {
          lastValidCenter = map.getCenter();
          window.parent.kakaoMapCenter = lastValidCenter;
        });
      }

      // 모듈 초기화
      initOverlayControls(map, container);
      const markerInfo = initMarkerInfo(map, container);

      // 이벤트 리스너 설정
      addLocationButton(map, container);
      setupClickListener(map, markerInfo);
      setupMessageListener(map, markerInfo);
    }

    // ── IP 기반 초기 위치로 지도 생성 ────────────────────────────
    fetch('https://ipapi.co/json/')
      .then(r => r.json())
      .then(d => {
        const pos = (d.latitude && d.longitude)
          ? new kakao.maps.LatLng(d.latitude, d.longitude)
          : defaultPos;
        const map = new kakao.maps.Map(container, { center: pos, level: 8 });
        initMap(map);
      })
      .catch(() => {
        const map = new kakao.maps.Map(container, { center: defaultPos, level: 8 });
        initMap(map);
      });

    // ── 내 위치 버튼 ──────────────────────────────────────────────
    function addLocationButton(map, container) {
      const btn = document.createElement('button');
      btn.id    = 'location-btn';
      btn.title = '내 위치 보기';
      btn.innerHTML = `<svg viewBox="0 0 24 24">
        <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3
          c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06
          c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06
          zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/>
      </svg>`;

      const moveTo = (locPos, level = 3) => {
        map.setCenter(locPos);
        map.setLevel(level);
        if (currentLocationMarker) currentLocationMarker.setMap(null);
        currentLocationMarker = new kakao.maps.Marker({ position: locPos, map });
        activeMarkerPos = locPos;
      };

      const ipFallback = () =>
        fetch('https://ipapi.co/json/')
          .then(r => r.json())
          .then(d => {
            if (d.latitude && d.longitude) {
              moveTo(new kakao.maps.LatLng(d.latitude, d.longitude), 5);
              alert('IP 기반 대략적인 위치로 이동합니다.');
            }
          });

      btn.onclick = e => {
        e.stopPropagation();
        if (navigator.geolocation && window.isSecureContext) {
          navigator.geolocation.getCurrentPosition(
            p  => moveTo(new kakao.maps.LatLng(p.coords.latitude, p.coords.longitude)),
            () => ipFallback(),
            { enableHighAccuracy: true }
          );
        } else {
          ipFallback();
        }
      };

      container.appendChild(btn);
    }

    // ── 지도 클릭 → 마커 추가 ──────────────────────────────────────
    function setupClickListener(map, markerInfo) {
      kakao.maps.event.addListener(map, 'click', e => {
        const latlng   = e.latLng;
        const markerId = `click_${Date.now()}_${markerSeq++}`;

        addMarker(map, latlng, markerId, markerInfo);
        markerInfo.show(latlng, markerId); // 주소 조회 트리거

        // 서버 저장
        const sid = window.parent?.currentSessionId;
        if (sid) {
          fetch(`/api/sessions/${sid}/map/markers/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              marker_id: markerId,
              lat: latlng.getLat(),
              lng: latlng.getLng()
            })
          }).catch(() => {});
        }

        // 부모 창 통지
        if (window.parent) {
          window.parent.postMessage({
            type: 'MARKER_ADDED',
            markerId,
            lat: latlng.getLat(),
            lng: latlng.getLng(),
          }, '*');
        }
      });
    }

    // ── 부모 창으로부터의 메시지 수신 ───────────────────────────────
    function setupMessageListener(map, markerInfo) {
      window.addEventListener('message', e => {
        const { type, lat, lng, title, markerId } = e.data;

        if (type === 'MOVE_TO') {
          // 특정 좌표로 이동 및 정보창 표시
          const pos = new kakao.maps.LatLng(lat, lng);
          activeMarkerPos = pos;
          map.setCenter(pos);
          map.setLevel(3);

          const marker = new kakao.maps.Marker({ position: pos, map });
          const infoWindow = new kakao.maps.InfoWindow({
            content: `<div style="padding:6px 10px;font-size:13px;color:#333;">${title}</div>`
          });
          infoWindow.open(map, marker);

        } else if (type === 'relayout' || type === 'recenter') {
          // 리사이즈 시 지도 레이아웃 재계산
          map.relayout();
          const targetPos = activeMarkerPos || lastValidCenter;
          if (targetPos) map.setCenter(targetPos);

        } else if (type === 'ADD_MARKER') {
          // 백엔드 요청으로 마커 추가
          if (lat == null || lng == null) return;
          const pos = new kakao.maps.LatLng(lat, lng);
          const id = markerId || `ext_${Date.now()}_${markerSeq++}`;
          addMarker(map, pos, id, markerInfo);

        } else if (type === 'REMOVE_MARKER') {
          // 백엔드 요청으로 마커 제거
          if (markerId) removeMarkerById(markerId, markerInfo);
        }
      });
    }
  });
};

document.head.appendChild(script);
