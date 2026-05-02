/**
 * authGuard.js
 *
 * 프론트엔드 애플리케이션의 인증 보안 및 토큰 라이프사이클을 관리하는 모듈입니다.
 * 주요 기능:
 * - 애플리케이션 라우트 접근 권한 제어
 * - JWT(Access Token) 및 사용자 세션 상태 유지
 * - 만료 전 자동 토큰 갱신 (Silent Refresh) 처리
 * - 인증이 필요한 API 요청을 위한 보안 Fetch 유틸리티 제공
 *
 * @module authGuard
 */

/**
 * 인증 관리 및 보호를 담당하는 AuthGuard 클래스입니다.
 */
export class AuthGuard {
  constructor() {
    this.listeners = []; // 인증 상태 변화를 감지하는 리스너 목록
    this.refreshTimer = null; // 자동 갱신을 위한 타이머 인스턴스
  }

  /**
   * 현재 사용자의 로그인 여부를 확인합니다.
   * 세션 스토리지의 토큰과 로컬 스토리지의 사용자 정보 존재 여부를 검사합니다.
   * @returns {boolean} 로그인 상태 여부
   */
  isLoggedIn() {
    const token = sessionStorage.getItem('accessToken');
    const user = localStorage.getItem('user');
    return !!token && !!user;
  }

  /**
   * 로컬 스토리지에 저장된 현재 사용자 정보를 반환합니다.
   * @returns {object|null} 사용자 객체 또는 null
   */
  getCurrentUser() {
    if (!this.isLoggedIn()) return null;
    try {
      return JSON.parse(localStorage.getItem('user'));
    } catch (e) {
      console.error('사용자 정보 파싱 오류:', e);
      return null;
    }
  }

  /**
   * 현재 유효한 Access Token을 가져옵니다.
   * @returns {string|null} Access Token 문자열
   */
  getAccessToken() {
    return sessionStorage.getItem('accessToken');
  }

  /**
   * API 요청 시 사용할 Authorization 헤더 객체를 생성합니다.
   * @returns {object} Bearer 토큰이 포함된 헤더 객체
   */
  getAuthHeader() {
    const token = this.getAccessToken();
    if (!token) return {};
    return {
      'Authorization': `Bearer ${token}`,
    };
  }

  /**
   * 현재 세션을 종료하고 로그아웃을 처리합니다.
   * 백엔드에 로그아웃 알림을 보낸 후 로컬 인증 데이터를 삭제합니다.
   */
  async logout() {
    try {
      const token = this.getAccessToken();
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error('로그아웃 요청 중 오류 발생:', error);
    } finally {
      this.clearAuth();
      this.notifyListeners('logout');
      // 로그아웃 후 로그인 페이지로 리다이렉트
      window.location.href = '/login';
    }
  }

  /**
   * 백엔드 API를 호출하여 Access Token을 갱신합니다.
   * 실패 시(401 등) 세션을 종료합니다.
   * @returns {Promise<boolean>} 갱신 성공 여부
   */
  async refreshToken() {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        if (response.status === 401) {
          this.clearAuth();
          this.notifyListeners('tokenExpired');
        }
        return false;
      }

      const data = await response.json();
      sessionStorage.setItem('accessToken', data.accessToken);
      this.notifyListeners('tokenRefreshed');

      return true;

    } catch (error) {
      console.error('토큰 갱신 중 오류 발생:', error);
      return false;
    }
  }

  /**
   * 설정된 간격마다 토큰을 자동으로 갱신하는 프로세스를 시작합니다.
   * 기본적으로 30분마다 갱신을 시도합니다.
   * @param {number} intervalMinutes 갱신 주기 (분 단위)
   */
  startAutoRefresh(intervalMinutes = 30) {
    if (this.refreshTimer) return;

    this.refreshTimer = setInterval(async () => {
      if (this.isLoggedIn()) {
        await this.refreshToken();
      }
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * 실행 중인 자동 토큰 갱신 타이머를 중지합니다.
   */
  stopAutoRefresh() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * 서버에 현재 토큰의 유효성을 검증하고 최신 사용자 정보를 동기화합니다.
   * @returns {Promise<boolean>} 인증 유효성 여부
   */
  async verifyAuth() {
    try {
      const response = await fetch('/api/auth/check', {
        headers: this.getAuthHeader(),
      });

      if (!response.ok) {
        this.clearAuth();
        return false;
      }

      const data = await response.json();
      if (data.authenticated) {
        localStorage.setItem('user', JSON.stringify(data.user));
        return true;
      }

      return false;

    } catch (error) {
      console.error('인증 상태 검증 중 오류 발생:', error);
      return false;
    }
  }

  /**
   * 브라우저에 저장된 모든 인증 관련 데이터를 삭제합니다.
   */
  clearAuth() {
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('oauth_state');
    localStorage.removeItem('user');
    localStorage.removeItem('authToken');
  }

  /**
   * 인증 상태 변화를 감지할 콜백 함수를 등록합니다.
   * @param {function} callback 상태 변화 시 호출될 함수
   */
  onAuthStateChanged(callback) {
    this.listeners.push(callback);
  }

  /**
   * 등록된 인증 상태 변화 콜백 함수를 제거합니다.
   * @param {function} callback 제거할 함수
   */
  offAuthStateChanged(callback) {
    this.listeners = this.listeners.filter(l => l !== callback);
  }

  /**
   * 등록된 모든 리스너에게 인증 이벤트 발생을 알립니다.
   * @param {string} event 이벤트 유형 ('logout', 'tokenExpired', 'tokenRefreshed' 등)
   */
  notifyListeners(event) {
    this.listeners.forEach(listener => {
      try {
        listener({
          type: event,
          isLoggedIn: this.isLoggedIn(),
          user: this.getCurrentUser(),
        });
      } catch (error) {
        console.error('인증 리스너 실행 중 오류 발생:', error);
      }
    });
  }
}

/**
 * 전역에서 사용할 AuthGuard 싱글톤 인스턴스
 */
export const authGuard = new AuthGuard();

// 브라우저 환경에서 전역 객체에 노출 및 초기화
if (typeof window !== 'undefined') {
  window.authGuard = authGuard;

  // 페이지 가시성 상태가 변경될 때(탭 전환 등) 인증 상태를 다시 확인합니다.
  document.addEventListener('visibilitychange', async () => {
    if (!document.hidden && authGuard.isLoggedIn()) {
      await authGuard.verifyAuth();
    }
  });
}

/**
 * 인증이 필요한 API 호출을 위한 Fetch 래퍼 함수입니다.
 * 401 오류 발생 시 자동으로 토큰 갱신을 시도하고 재요청합니다.
 * 
 * @param {string} url 요청 URL
 * @param {object} options Fetch 옵션
 * @returns {Promise<Response>} Fetch 응답 객체
 */
export async function protectedFetch(url, options = {}) {
  let headers = {
    ...options.headers,
    ...authGuard.getAuthHeader(),
  };

  let response = await fetch(url, { ...options, headers });

  // 401 Unauthorized 발생 시 토큰 갱신 후 재시도
  if (response.status === 401) {
    const refreshed = await authGuard.refreshToken();
    if (refreshed) {
      headers = {
        ...options.headers,
        ...authGuard.getAuthHeader(),
      };
      response = await fetch(url, { ...options, headers });
    } else {
      // 갱신 실패 시 로그아웃 처리
      authGuard.clearAuth();
      window.location.href = '/login';
    }
  }

  return response;
}

/**
 * 인증이 필요한 JSON API 요청을 처리하고 결과를 반환합니다.
 * 
 * @param {string} url 요청 URL
 * @param {object} options Fetch 옵션
 * @returns {Promise<object>} 파싱된 JSON 응답 데이터
 */
export async function protectedJsonFetch(url, options = {}) {
  const response = await protectedFetch(url, options);
  return response.json();
}

