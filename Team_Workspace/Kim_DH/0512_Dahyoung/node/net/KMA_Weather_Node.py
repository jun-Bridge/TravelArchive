import difflib
import urllib.parse
from datetime import datetime, timedelta
from typing import Any, Optional

import aiohttp

from module.node.net.API_Query_Node import APIQueryProcessor

# 기상청 단기예보 발표 시각 (매일 해당 시각 +10분 이후 조회 가능)
_FCST_BASE_HOURS = [2, 5, 8, 11, 14, 17, 20, 23]

JEJU_GRID = {
    "제주특별자치도": {"nx": 52, "ny": 38},
    "제주시": {"nx": 53, "ny": 38},
    "제주시 한림읍": {"nx": 48, "ny": 36},
    "제주시 애월읍": {"nx": 49, "ny": 37},
    "제주시 구좌읍": {"nx": 59, "ny": 38},
    "제주시 조천읍": {"nx": 55, "ny": 39},
    "제주시 한경면": {"nx": 46, "ny": 35},
    "제주시 추자면": {"nx": 48, "ny": 48},
    "제주시 우도면": {"nx": 60, "ny": 38},
    "제주시 일도1동": {"nx": 53, "ny": 38},
    "제주시 일도2동": {"nx": 53, "ny": 38},
    "제주시 이도1동": {"nx": 53, "ny": 38},
    "제주시 이도2동": {"nx": 53, "ny": 38},
    "제주시 삼도1동": {"nx": 53, "ny": 38},
    "제주시 삼도2동": {"nx": 53, "ny": 38},
    "제주시 용담1동": {"nx": 52, "ny": 38},
    "제주시 용담2동": {"nx": 52, "ny": 38},
    "제주시 건입동": {"nx": 53, "ny": 38},
    "제주시 화북동": {"nx": 53, "ny": 38},
    "제주시 삼양동": {"nx": 54, "ny": 38},
    "제주시 봉개동": {"nx": 54, "ny": 38},
    "제주시 아라동": {"nx": 53, "ny": 37},
    "제주시 오라동": {"nx": 52, "ny": 38},
    "제주시 연동": {"nx": 52, "ny": 38},
    "제주시 노형동": {"nx": 52, "ny": 38},
    "제주시 외도동": {"nx": 51, "ny": 38},
    "제주시 이호동": {"nx": 51, "ny": 38},
    "제주시 도두동": {"nx": 52, "ny": 38},
    "서귀포시": {"nx": 53, "ny": 33},
    "서귀포시 대정읍": {"nx": 48, "ny": 32},
    "서귀포시 대정읍/마라도포함": {"nx": 48, "ny": 32},
    "서귀포시 남원읍": {"nx": 56, "ny": 33},
    "서귀포시 성산읍": {"nx": 60, "ny": 37},
    "서귀포시 안덕면": {"nx": 49, "ny": 32},
    "서귀포시 표선면": {"nx": 58, "ny": 34},
    "서귀포시 송산동": {"nx": 53, "ny": 32},
    "서귀포시 정방동": {"nx": 53, "ny": 32},
    "서귀포시 중앙동": {"nx": 53, "ny": 32},
    "서귀포시 천지동": {"nx": 53, "ny": 32},
    "서귀포시 효돈동": {"nx": 54, "ny": 33},
    "서귀포시 영천동": {"nx": 54, "ny": 33},
    "서귀포시 동홍동": {"nx": 53, "ny": 33},
    "서귀포시 서홍동": {"nx": 53, "ny": 33},
    "서귀포시 대륜동": {"nx": 52, "ny": 32},
    "서귀포시 대천동": {"nx": 52, "ny": 32},
    "서귀포시 중문동": {"nx": 51, "ny": 32},
    "서귀포시 예래동": {"nx": 50, "ny": 32},
}


def _get_fcst_base_datetime() -> tuple:
    """현재 시각 기준 가장 최근 단기예보 발표 시각(base_date, base_time)을 반환합니다."""
    now = datetime.now()
    for h in reversed(_FCST_BASE_HOURS):
        # 발표 시각 +10분 이후부터 조회 가능
        if now.hour > h or (now.hour == h and now.minute >= 10):
            return now.strftime("%Y%m%d"), f"{h:02d}00"
    # 자정~02:10 사이이면 전날 2300 발표 데이터 사용
    yesterday = now - timedelta(days=1)
    return yesterday.strftime("%Y%m%d"), "2300"


def _find_nearest_location(query: str) -> Optional[str]:
    """입력 문자열과 가장 가까운 JEJU_GRID 키를 찾습니다.

    매칭 우선순위:
        1) 완전 일치
        2) query가 key의 부분 문자열 (예: "한림" -> "제주시 한림읍")
        3) key가 query의 부분 문자열 (예: "서귀포시 대정읍 마라도" -> "서귀포시 대정읍")
        4) difflib 유사도 fallback (오타 대응, cutoff=0.5)
    매칭 실패 시 None.
    """
    if not query:
        return None
    keys = list(JEJU_GRID.keys())
    if query in JEJU_GRID:
        return query
    for k in keys:
        if query in k:
            return k
    for k in keys:
        if k in query:
            return k
    matches = difflib.get_close_matches(query, keys, n=1, cutoff=0.5)
    return matches[0] if matches else None


# 단기예보 카테고리 라벨 매핑
_SKY_LABEL = {"1": "맑음", "3": "구름많음", "4": "흐림"}
_PTY_LABEL = {
    "0": "없음", "1": "비", "2": "비·눈", "3": "눈", "4": "소나기",
    "5": "빗방울", "6": "빗방울·눈날림", "7": "눈날림",
}


def _format_weather_summary(api_response: Any, location: str) -> str:
    """KMA API 응답(dict)에서 가장 이른 예보 시각 1건을 골라 요약 문자열로 변환합니다.

    파싱에 실패하면 원본 응답의 일부 문자열을 그대로 돌려줍니다.
    """
    try:
        items = api_response["response"]["body"]["items"]["item"]
    except (KeyError, TypeError):
        return f"[KMA] 응답 파싱 실패: {str(api_response)[:200]}"

    if not items:
        return f"{location}: 예보 데이터 없음"

    # 가장 이른 (fcstDate, fcstTime)의 카테고리들을 묶어 dict 화.
    # 초단기실황(getUltraSrtNcst)은 fcst* 대신 base*/obsrValue를 쓰므로 fallback 처리.
    first = items[0]
    fcst_date = first.get("fcstDate") or first.get("baseDate", "")
    fcst_time = first.get("fcstTime") or first.get("baseTime", "")
    by_cat: dict = {}
    for it in items:
        d = it.get("fcstDate") or it.get("baseDate", "")
        t = it.get("fcstTime") or it.get("baseTime", "")
        if d == fcst_date and t == fcst_time:
            by_cat[it.get("category")] = it.get("fcstValue", it.get("obsrValue"))

    if len(fcst_date) == 8 and len(fcst_time) >= 4:
        when = f"{fcst_date[:4]}-{fcst_date[4:6]}-{fcst_date[6:8]} {fcst_time[:2]}:{fcst_time[2:4]}"
    else:
        when = f"{fcst_date} {fcst_time}"

    lines = [f"{location} ({when} 예보)"]
    if "SKY" in by_cat:
        lines.append(f"하늘: {_SKY_LABEL.get(by_cat['SKY'], by_cat['SKY'])}")
    if "PTY" in by_cat:
        pop = by_cat.get("POP")
        pop_str = f" (확률 {pop}%)" if pop is not None else ""
        lines.append(f"강수: {_PTY_LABEL.get(by_cat['PTY'], by_cat['PTY'])}{pop_str}")
    temp = by_cat.get("TMP") or by_cat.get("T1H")
    if temp is not None:
        lines.append(f"기온: {temp}°C")
    if "REH" in by_cat:
        lines.append(f"습도: {by_cat['REH']}%")
    if "WSD" in by_cat:
        lines.append(f"풍속: {by_cat['WSD']} m/s")

    return "\n".join(lines)


class KMAWeatherProcessor(APIQueryProcessor):
    """
    기상청 단기예보 조회서비스(VilageFcstInfoService_2.0) 전용 프로세서.

    - 제주특별자치도 격자 좌표(JEJU_GRID) 기반 위치 지정 지원.
    - base_date / base_time 생략 시 현재 시각 기준 자동 계산.

    사용 가능한 operation:
        getVilageFcst   - 단기예보 (기본값, 3일치)
        getUltraSrtFcst - 초단기예보 (6시간)
        getUltraSrtNcst - 초단기실황
        getFcstVersion  - 예보 버전 조회
    """

    def __init__(self, service_key: str = None):
        from setting.config import KMA_SERVICE_KEY, KMA_BASE_URL
        key = service_key or KMA_SERVICE_KEY
        super().__init__(base_url=KMA_BASE_URL, service_key=key)

    def list_locations(self) -> list:
        """사용 가능한 제주 지역 목록을 반환합니다."""
        return list(JEJU_GRID.keys())

    async def process(self, data: Any) -> Optional[Any]:
        """
        Args:
            data (dict): {
                "location"  : "제주시",          # JEJU_GRID 키 (부분 일치 허용, 예: "한림" -> "제주시 한림읍")
                "operation" : "getVilageFcst",   # 생략 시 기본값
                "numOfRows" : 100,               # 생략 시 기본값
                "pageNo"    : 1,                 # 생략 시 기본값
                "dataType"  : "JSON",            # 생략 시 기본값
                "base_date" : "20250430",        # 생략 시 자동 계산
                "base_time" : "0800",            # 생략 시 자동 계산
                "nx"        : 53,                # location 생략 시 직접 지정
                "ny"        : 38,                # location 생략 시 직접 지정
            }

        Returns:
            str: 사람이 읽기 쉬운 한국어 날씨 요약 문자열
            None: 오류 발생 시
        """
        if not isinstance(data, dict):
            self.signal("error", "Input must be a dict.")
            return None

        if not self.session:
            self.signal("error", "HTTP session is not initialized.")
            return None

        location = data.get("location")
        matched_location = None
        if location:
            matched_location = _find_nearest_location(location)
            if matched_location is None:
                self.signal("error", f"Unknown location: '{location}'. Call list_locations() to see available options.")
                return None

        grid = JEJU_GRID.get(matched_location) if matched_location else {}
        base_date, base_time = _get_fcst_base_datetime()
        operation = data.get("operation", "getVilageFcst")

        params = {
            "numOfRows": data.get("numOfRows", 100),
            "pageNo":    data.get("pageNo", 1),
            "dataType":  data.get("dataType", "JSON"),
            "base_date": data.get("base_date", base_date),
            "base_time": data.get("base_time", base_time),
            "nx":        grid.get("nx", data.get("nx")),
            "ny":        grid.get("ny", data.get("ny")),
        }
        # None 값 제거
        params = {k: v for k, v in params.items() if v is not None}

        if self.service_key:
            params["serviceKey"] = self.service_key

        from setting.config import KMA_BASE_URL
        request_url = f"{KMA_BASE_URL}/{operation}?{urllib.parse.urlencode(params)}"

        display_location = matched_location or f"nx={params.get('nx')},ny={params.get('ny')}"
        try:
            async with self.session.get(request_url, ssl=False) as response:
                if response.status == 200:
                    try:
                        json_data = await response.json()
                        return _format_weather_summary(json_data, display_location)
                    except aiohttp.ContentTypeError:
                        return await response.text()
                else:
                    error_msg = await response.text()
                    self.signal("error", f"HTTP {response.status}: {error_msg}")
                    return None
        except Exception as e:
            self.signal("error", f"API Connection Error: {str(e)}")
            return None
