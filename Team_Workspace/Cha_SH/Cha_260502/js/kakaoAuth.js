/**
 * kakaoAuth.js
 *
 * 카카오 OAuth 2.0 인증 프로토콜을 처리하는 클라이언트 모듈입니다.
 * 주요 기능:
 * - 카카오 인증 서버로의 리다이렉션 (인가 코드 요청)
 * - 인가 코드를 이용한 백엔드 인증 처리 (콜백 처리)
 * - 세션 및 로컬 스토리지를 이용한 인증 데이터 관리
 *
 * @module kakaoAuth
 */

/**
 * 보안(CSRF 방지)을 위한 무작위 상태 토큰을 생성합니다.
 * @returns {string} 16진수 문자열 상태 값
 */
function generateState() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * 현재 URL의 쿼리 파라미터를 분석하여 인증 관련 정보를 추출합니다.
 * @returns {object} code, state, error 등의 정보를 포함한 객체
 */
function parseQueryParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    code: params.get('code'),
    state: params.get('state'),
    error: params.get('error'),
    errorDescription: params.get('error_description'),
  };
}

/**
 * 카카오 인증 프로세스를 관리하는 클래스입니다.
 */
export class KakaoAuthClient {
  /**
   * @param {string} restApiKey 카카오 REST API 키
   * @param {string} redirectUri 카카오 개발자 콘솔에 등록된 리다이렉트 URI
   */
  constructor(restApiKey, redirectUri) {
    this.restApiKey = restApiKey;
    this.redirectUri = redirectUri;
    this.authorizationUrl = 'https://kauth.kakao.com/oauth/authorize';
    this.accessTokenUrl = 'https://kauth.kakao.com/oauth/token';
    this.userInfoUrl = 'https://kapi.kakao.com/v2/user/me';
    this.logoutUrl = 'https://kapi.kakao.com/v2/user/logout';
  }

  /**
   * 사용자 브라우저를 카카오 로그인 페이지로 리다이렉트합니다.
   * CSRF 방지를 위해 생성된 state 값을 세션 스토리지에 보관합니다.
   */
  loginWithKakao() {
    const state = generateState();
    sessionStorage.setItem('oauth_state', state);

    const params = new URLSearchParams({
      client_id: this.restApiKey,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      state: state,
      scope: 'profile_nickname,profile_image,account_email',
    });

    window.location.href = `${this.authorizationUrl}?${params.toString()}`;
  }

  /**
   * 인증 콜백 페이지에서 전달받은 인가 코드를 백엔드로 전달하여 로그인을 완료합니다.
   * @returns {Promise<object>} 백엔드로부터 발급받은 토큰 및 사용자 정보
   */
  async handleCallback() {
    const { code, state, error, errorDescription } = parseQueryParams();

    // 카카오 인증 서버에서 전달된 오류 확인
    if (error) {
      throw new Error(`카카오 인증 오류 (${error}): ${errorDescription || '알 수 없는 오류가 발생했습니다.'}`);
    }

    // State 값 검증 (CSRF 공격 방지)
    const savedState = sessionStorage.getItem('oauth_state');
    if (state !== savedState) {
      throw new Error('인증 상태 토큰이 일치하지 않습니다. 보안 위험이 있을 수 있습니다.');
    }
    sessionStorage.removeItem('oauth_state');

    if (!code) {
      throw new Error('인증 코드를 전달받지 못했습니다.');
    }

    // 백엔드로 인가 코드 전달 및 세션 토큰 요청
    const response = await fetch('/api/auth/kakao/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, redirectUri: this.redirectUri }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || '서버 로그인 처리에 실패했습니다.');
    }

    const data = await response.json();

    // 획득한 인증 데이터를 브라우저 스토리지에 저장
    this.saveAuthData(data);

    return data;
  }

  /**
   * 성공적으로 수신된 인증 및 사용자 데이터를 스토리지에 영구/세션 저장합니다.
   * @param {object} data accessToken, user 정보를 포함한 데이터
   */
  saveAuthData(data) {
    // 보안을 위해 Access Token은 세션 스토리지에 저장
    sessionStorage.setItem('accessToken', data.accessToken);

    // 사용자 프로필 정보는 로컬 스토리지에 저장하여 세션 유지
    localStorage.setItem('user', JSON.stringify(data.user));
    // 하위 호환성 또는 편의를 위한 추가 저장
    localStorage.setItem('authToken', data.accessToken);
  }

  /**
   * 현재 스토리지에 저장된 인증 상태 데이터를 조회합니다.
   * @returns {object} accessToken, user, isLoggedIn 상태 객체
   */
  getAuthData() {
    const accessToken = sessionStorage.getItem('accessToken');
    const user = JSON.parse(localStorage.getItem('user') || 'null');

    return {
      accessToken,
      user,
      isLoggedIn: !!accessToken && !!user,
    };
  }

  /**
   * 로그아웃을 처리합니다. 백엔드 세션을 종료하고 로컬 데이터를 클리어합니다.
   */
  async logout() {
    const { accessToken } = this.getAuthData();

    if (!accessToken) return;

    try {
      // 서비스 백엔드에 로그아웃 요청
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });
    } catch (error) {
      console.error('로그아웃 요청 중 오류 발생:', error);
    } finally {
      // 로컬 스토리지 데이터 정리
      sessionStorage.removeItem('accessToken');
      sessionStorage.removeItem('oauth_state');
      localStorage.removeItem('user');
      localStorage.removeItem('authToken');

      // 로그인 페이지로 이동
      window.location.href = '/login';
    }
  }

  /**
   * 만료된 Access Token을 갱신하기 위해 백엔드에 요청을 보냅니다.
   * @returns {Promise<string|null>} 새롭게 발급된 Access Token
   */
  async refreshToken() {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('토큰 갱신에 실패했습니다.');
      }

      const data = await response.json();
      sessionStorage.setItem('accessToken', data.accessToken);

      return data.accessToken;
    } catch (error) {
      console.error('토큰 자동 갱신 중 오류:', error);
      this.logout();
      return null;
    }
  }

  /**
   * HTTP 요청 헤더에 포함할 인증 정보 객체를 반환합니다.
   * @returns {object} Authorization 헤더 객체
   */
  getAuthHeader() {
    const { accessToken } = this.getAuthData();
    if (!accessToken) return {};
    return {
      'Authorization': `Bearer ${accessToken}`,
    };
  }
}

/**
 * 전역 환경을 위한 클라이언트 인스턴스 초기화
 */
if (typeof window !== 'undefined') {
  window.kakaoAuth = new KakaoAuthClient(
    import.meta?.env?.VITE_KAKAO_REST_API_KEY || '',
    import.meta?.env?.VITE_KAKAO_LOGIN_REDIRECT_URI || ''
  );
}

