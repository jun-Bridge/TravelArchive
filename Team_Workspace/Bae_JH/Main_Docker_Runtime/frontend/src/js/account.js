/**
 * account.js
 */

export function renderAccountPage(container) {
  container.innerHTML = `
    <div class="page-view-content">
      <h2 class="page-title">ACCOUNT</h2>
      
      <div class="profile-header">
        <div class="profile-avatar">
          <svg viewBox="0 0 24 24" width="44" height="44" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        </div>
        <h3 class="profile-name">Guest Traveler</h3>
        <p class="profile-email">로그인하여 여정을 기록하고 보관하세요</p>
      </div>

      <div class="settings-group login-box">
        <label class="settings-label">Login to Archive</label>
        <div class="login-form">
          <div class="input-field">
            <input type="text" id="loginId" placeholder="아이디" class="login-input" autocomplete="username">
          </div>
          <div class="input-field">
            <input type="password" id="loginPw" placeholder="비밀번호" class="login-input" autocomplete="current-password">
          </div>
          
          <div class="login-options" style="display: flex; justify-content: space-between; font-size: 13px;">
            <label class="remember-id" style="display: flex; gap: 8px; cursor: pointer;">
              <input type="checkbox" id="rememberId">
              <span style="color: rgba(31, 41, 55, 0.6);">아이디 기억</span>
            </label>
            <a href="#" class="find-account-link" id="findAccountBtn" style="color: #3b82f6; font-weight: 600; text-decoration: none;">계정 찾기</a>
          </div>

          <div class="login-actions">
            <button class="login-btn primary" id="loginBtn">로그인</button>
            <button class="login-btn secondary" id="guestLoginBtn">게스트로 계속하기</button>
            
            <div class="social-login-divider">SNS 로그인 및 회원가입</div>
            
            <div class="social-login-grid">
              <button class="login-btn social google" id="googleLoginBtn">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Google
              </button>
              <button class="login-btn social kakao" id="kakaoLoginBtn">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M12 3c-4.97 0-9 3.185-9 7.115 0 2.558 1.707 4.8 4.27 6.054l-.841 3.097c-.102.375.125.513.311.39l3.653-2.428C11.127 17.182 11.558 17.23 12 17.23c4.97 0 9-3.185 9-7.115S16.97 3 12 3z"/>
                </svg>
                Kakao
              </button>
              <button class="login-btn social naver" id="naverLoginBtn">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                   <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727v12.845z"/>
                </svg>
                Naver
              </button>
              <button class="login-btn social signup" id="signUpBtn">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="8.5" cy="7" r="4"></circle>
                  <line x1="20" y1="8" x2="20" y2="14"></line>
                  <line x1="17" y1="11" x2="23" y2="11"></line>
                </svg>
                회원가입
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="settings-group" style="padding: 16px 24px; text-align: center;">
        <p class="settings-description" style="margin: 0; font-size: 13px;">
          계정이 없으신가요? <b>회원가입</b>을 통해 나만의 여행 아카이브를 시작하세요.
        </p>
      </div>
    </div>
  `;

  // --- Logic & Event Listeners ---
  const loginBtn = document.getElementById('loginBtn');
  const loginIdInput = document.getElementById('loginId');
  const loginPwInput = document.getElementById('loginPw');

  const handleLogin = () => {
    const id = loginIdInput.value;
    const pw = loginPwInput.value;
    if (id && pw) {
      alert(`${id}님, 환영합니다! (목업 로그인 성공)`);
    } else if (!id) {
      alert('아이디를 입력해주세요.');
      loginIdInput.focus();
    } else {
      alert('비밀번호를 입력해주세요.');
      loginPwInput.focus();
    }
  };

  const handleEnterKey = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleLogin();
    }
  };

  if (loginIdInput) loginIdInput.addEventListener('keydown', handleEnterKey);
  if (loginPwInput) loginPwInput.addEventListener('keydown', handleEnterKey);
  if (loginBtn) loginBtn.addEventListener('click', handleLogin);

  ['google', 'kakao', 'naver'].forEach(provider => {
    const btn = document.getElementById(`${provider}LoginBtn`);
    if (btn) btn.addEventListener('click', () => alert(`${provider} 연동 준비 중`));
  });

  const signUpBtn = document.getElementById('signUpBtn');
  if (signUpBtn) signUpBtn.addEventListener('click', () => alert('회원가입 준비 중'));
}
