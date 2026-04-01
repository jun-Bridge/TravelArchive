/**
 * account.js
 */

export function renderAccountPage(container) {
  container.innerHTML = `
    <div class="page-view-content">
      <h2 class="page-title">계정</h2>
      
      <div class="profile-header">
        <div class="profile-avatar">
          <svg viewBox="0 0 24 24" width="50" height="50" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
        </div>
        <h3 class="profile-name">Traveler</h3>
        <p class="profile-email">traveler@example.com</p>
      </div>

      <div class="settings-group">
        <label class="settings-label">프로필 관리</label>
        <p class="help-answer">여기에 나중에 프로필 관리 기능이 추가될 예정입니다.</p>
      </div>
    </div>
  `;
}
