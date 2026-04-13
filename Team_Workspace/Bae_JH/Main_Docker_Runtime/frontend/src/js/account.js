/**
 * account.js
 * 계정 페이지: 로그인/게스트/회원가입/로그아웃 + 로그인 상태별 UI
 */

import { Icons } from './assets.js';
import { renderTemplate } from './utils.js';
import { BackendHooks, TokenManager } from './api.js';

// --------------------------------------------------
// 회원가입 모달 (동적 생성)
// --------------------------------------------------

function createSignupModal() {
  const overlay = document.createElement('div');
  overlay.id = 'signupModalOverlay';
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 9999;
    background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center;
  `;

  overlay.innerHTML = `
    <div class="card-base" style="width:360px; padding:28px 32px; position:relative;">
      <button id="closeSignupModal" style="
        position:absolute; top:12px; right:16px;
        background:none; border:none; cursor:pointer;
        font-size:18px; color:var(--text-secondary,#888);
      ">✕</button>
      <h3 style="margin:0 0 20px; font-size:16px; font-weight:600;">회원가입</h3>
      <div class="login-form">
        <div class="input-field-wrapper">
          <input type="text" id="signupNickname" placeholder="닉네임" class="input-base" autocomplete="nickname">
        </div>
        <div class="input-field-wrapper" style="margin-top:10px;">
          <input type="email" id="signupEmail" placeholder="이메일" class="input-base" autocomplete="email">
        </div>
        <div class="input-field-wrapper" style="margin-top:10px;">
          <input type="password" id="signupPw" placeholder="비밀번호 (8자 이상)" class="input-base" autocomplete="new-password">
        </div>
        <div class="input-field-wrapper" style="margin-top:10px;">
          <input type="password" id="signupPwConfirm" placeholder="비밀번호 확인" class="input-base" autocomplete="new-password">
        </div>
        <p id="signupError" style="color:#e55; font-size:12px; margin:8px 0 0; min-height:16px;"></p>
        <button id="signupSubmitBtn" class="btn-base btn-primary w-full" style="margin-top:12px;">가입하기</button>
      </div>
    </div>
  `;

  return overlay;
}

function openSignupModal(onSuccess) {
  if (document.getElementById('signupModalOverlay')) return;

  const overlay = createSignupModal();
  document.body.appendChild(overlay);

  const nicknameInput = overlay.querySelector('#signupNickname');
  const emailInput    = overlay.querySelector('#signupEmail');
  const pwInput       = overlay.querySelector('#signupPw');
  const pwConfirmInput = overlay.querySelector('#signupPwConfirm');
  const errorEl       = overlay.querySelector('#signupError');
  const submitBtn     = overlay.querySelector('#signupSubmitBtn');
  const closeBtn      = overlay.querySelector('#closeSignupModal');

  const close = () => overlay.remove();
  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  const handleSubmit = async () => {
    errorEl.textContent = '';
    const nickname = nicknameInput.value.trim();
    const email    = emailInput.value.trim();
    const pw       = pwInput.value;
    const pwConfirm = pwConfirmInput.value;

    if (!nickname) { errorEl.textContent = '닉네임을 입력해주세요.'; nicknameInput.focus(); return; }
    if (!email || !email.includes('@')) { errorEl.textContent = '올바른 이메일을 입력해주세요.'; emailInput.focus(); return; }
    if (pw.length < 8) { errorEl.textContent = '비밀번호는 8자 이상이어야 합니다.'; pwInput.focus(); return; }
    if (pw !== pwConfirm) { errorEl.textContent = '비밀번호가 일치하지 않습니다.'; pwConfirmInput.focus(); return; }

    submitBtn.disabled = true;
    submitBtn.textContent = '처리 중...';

    try {
      await BackendHooks.signUp({ email, password: pw, nickname });
      close();
      if (onSuccess) onSuccess(email, pw);
      else alert('회원가입이 완료되었습니다. 로그인해주세요.');
    } catch (err) {
      errorEl.textContent = err.detail || '회원가입에 실패했습니다.';
      submitBtn.disabled = false;
      submitBtn.textContent = '가입하기';
    }
  };

  submitBtn.addEventListener('click', handleSubmit);
  [nicknameInput, emailInput, pwInput, pwConfirmInput].forEach(el => {
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleSubmit(); });
  });

  nicknameInput.focus();
}

// --------------------------------------------------
// 로그인 완료 후 프로필 뷰 렌더링
// --------------------------------------------------

function renderLoggedInView(container) {
  const userType = TokenManager.getUserType();
  const nickname = TokenManager.getNickname();
  const email    = TokenManager.getEmail();
  const isGuest  = userType === 'GST';
  const badgeText = isGuest ? '게스트' : '회원';
  const badgeStyle = isGuest
    ? 'background:rgba(255,200,0,0.15); color:#c8a000;'
    : 'background:rgba(80,180,120,0.15); color:#2a9d5c;';

  container.innerHTML = `
    <div class="page-view-content">
      <h2 class="title-main">ACCOUNT</h2>
      <div class="profile-header">
        <div class="profile-avatar">${Icons.UserLarge || '👤'}</div>
        <h3 class="profile-name">${nickname}</h3>
        ${email ? `<p class="profile-email">${email}</p>` : ''}
        <span style="
          display:inline-block; margin-top:6px; padding:3px 10px;
          border-radius:20px; font-size:12px; font-weight:600;
          ${badgeStyle}
        ">${badgeText}</span>
      </div>

      ${isGuest ? `
      <div class="card-base p-16-24" style="margin-top:16px;">
        <p class="settings-description m-0 fs-13" style="text-align:center;">
          게스트 세션은 <b>24시간 후 만료</b>됩니다.<br>
          회원가입 후 여행 아카이브를 영구 보관하세요.
        </p>
        <div style="display:flex; gap:10px; margin-top:14px;">
          <button class="btn-base btn-secondary w-full" id="guestSignupBtn">회원가입</button>
          <button class="btn-base btn-primary w-full" id="logoutBtn">로그아웃</button>
        </div>
      </div>
      ` : `
      <div class="card-base p-16-24" style="margin-top:16px;">
        <div style="display:flex; flex-direction:column; gap:10px;">
          <button class="btn-base btn-secondary w-full" id="logoutBtn">로그아웃</button>
        </div>
      </div>
      `}

      <div class="card-base p-16-24 text-center" style="margin-top:12px;">
        <p class="settings-description m-0 fs-13">
          TravelArchive에 오신 것을 환영합니다.
        </p>
      </div>
    </div>
  `;

  const logoutBtn = container.querySelector('#logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      logoutBtn.disabled = true;
      logoutBtn.textContent = '로그아웃 중...';
      await BackendHooks.logout();
      renderLoginView(container);
    });
  }

  const guestSignupBtn = container.querySelector('#guestSignupBtn');
  if (guestSignupBtn) {
    guestSignupBtn.addEventListener('click', () => {
      openSignupModal(async (email, pw) => {
        // 회원가입 성공 시 바로 로그인
        try {
          await BackendHooks.login(email, pw);
          const profile = await BackendHooks.getMyProfile();
          if (profile && profile.nickname) {
            TokenManager.setUserInfo({ nickname: profile.nickname, email: profile.email });
          }
          renderLoggedInView(container);
        } catch {
          renderLoginView(container);
        }
      });
    });
  }
}

// --------------------------------------------------
// 로그인 폼 뷰 렌더링
// --------------------------------------------------

function renderLoginView(container) {
  container.innerHTML = renderTemplate('account', {}, Icons);

  const loginBtn     = document.getElementById('loginBtn');
  const loginIdInput = document.getElementById('loginId');
  const loginPwInput = document.getElementById('loginPw');
  const rememberChk  = document.getElementById('rememberId');

  // 아이디 기억 복원
  const savedId = localStorage.getItem('ta_remember_id');
  if (savedId && loginIdInput) {
    loginIdInput.value = savedId;
    if (rememberChk) rememberChk.checked = true;
  }

  const handleLogin = async () => {
    const id = loginIdInput?.value?.trim();
    const pw = loginPwInput?.value;
    if (!id) { alert('아이디를 입력해주세요.'); loginIdInput?.focus(); return; }
    if (!pw) { alert('비밀번호를 입력해주세요.'); loginPwInput?.focus(); return; }

    if (loginBtn) { loginBtn.disabled = true; loginBtn.textContent = '로그인 중...'; }

    try {
      await BackendHooks.login(id, pw);

      // 아이디 기억 처리
      if (rememberChk?.checked) {
        localStorage.setItem('ta_remember_id', id);
      } else {
        localStorage.removeItem('ta_remember_id');
      }

      // 프로필 조회 후 닉네임/이메일 저장
      const profile = await BackendHooks.getMyProfile();
      if (profile) {
        TokenManager.setUserInfo({
          nickname: profile.nickname || '',
          email: profile.email || '',
        });
      }

      renderLoggedInView(container);
    } catch (err) {
      if (loginBtn) { loginBtn.disabled = false; loginBtn.textContent = '로그인'; }
      const msg = err.detail || '로그인에 실패했습니다.';
      alert(msg);
    }
  };

  if (loginIdInput) loginIdInput.addEventListener('keydown', (e) => e.key === 'Enter' && handleLogin());
  if (loginPwInput) loginPwInput.addEventListener('keydown', (e) => e.key === 'Enter' && handleLogin());
  if (loginBtn) loginBtn.addEventListener('click', handleLogin);

  // 게스트 로그인
  const guestBtn = document.getElementById('guestLoginBtn');
  if (guestBtn) {
    guestBtn.addEventListener('click', async () => {
      guestBtn.disabled = true;
      guestBtn.textContent = '연결 중...';
      try {
        await BackendHooks.guestLogin();
        renderLoggedInView(container);
      } catch {
        guestBtn.disabled = false;
        guestBtn.textContent = '게스트로 계속하기';
        alert('게스트 로그인에 실패했습니다.');
      }
    });
  }

  // SNS 로그인
  ['google', 'kakao', 'naver'].forEach(provider => {
    const btn = document.getElementById(`${provider}LoginBtn`);
    if (btn) {
      btn.addEventListener('click', async () => {
        try {
          const res = await BackendHooks.socialLogin(provider);
          alert(res.message || `${provider} 로그인은 준비 중입니다.`);
        } catch {
          alert(`${provider} 연동에 실패했습니다.`);
        }
      });
    }
  });

  // 회원가입
  const signUpBtn = document.getElementById('signUpBtn');
  if (signUpBtn) {
    signUpBtn.addEventListener('click', () => {
      openSignupModal(async (email, pw) => {
        // 회원가입 성공 시 자동 로그인
        try {
          await BackendHooks.login(email, pw);
          const profile = await BackendHooks.getMyProfile();
          if (profile) {
            TokenManager.setUserInfo({
              nickname: profile.nickname || '',
              email: profile.email || '',
            });
          }
          renderLoggedInView(container);
        } catch {
          // 자동 로그인 실패 시 로그인 폼으로
          renderLoginView(container);
          alert('회원가입 완료! 이제 로그인해주세요.');
        }
      });
    });
  }

  // 계정 찾기
  const findBtn = document.getElementById('findAccountBtn');
  if (findBtn) {
    findBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        const res = await BackendHooks.findAccount();
        alert(res.message || '계정 찾기는 준비 중입니다.');
      } catch {
        alert('계정 찾기 요청에 실패했습니다.');
      }
    });
  }
}

// --------------------------------------------------
// 진입점: 로그인 상태에 따라 적절한 뷰 렌더링
// --------------------------------------------------

export function renderAccountPage(container) {
  if (TokenManager.isLoggedIn()) {
    renderLoggedInView(container);
  } else {
    renderLoginView(container);
  }
}
