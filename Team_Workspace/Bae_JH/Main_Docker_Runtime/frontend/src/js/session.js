/**
 * session.js
 */

import { BackendHooks } from './api.js';
import { Icons } from './assets.js';
import { renderTemplate, createElementFromHTML } from './utils.js';
import { updateSidebarSessionTitle, showToast } from './ui.js';

const TEAM_COLOR     = '#2a9d5c';
const PERSONAL_COLOR = '#f97316';

// 드롭다운 외부 클릭 시 닫기 — 세션 수에 관계없이 단 한 번만 등록
document.addEventListener('click', () => {
  document.querySelectorAll('.session-dropdown-menu.show').forEach(m => m.classList.remove('show'));
});

export const SessionManager = {
  _initSeq: 0,

  renderSidebarItem(session, elements, state, isPrepend = false) {
    const sessionId        = session.session_id || session.id;
    const title            = session.title || '(제목 없음)';
    const tripColor        = session.trip_color || null;
    const userRole         = session.user_role  || 'master';
    const participantCount = session.participant_count || 1;
    const unreadCount      = session.unread_count      || 0;
    // 참여자 2명 이상이면 팀, 마스터 혼자면 개인
    const isTeam           = participantCount > 1;

    const tripColorStyle = tripColor ? `background:${tripColor}` : '';

    // 팀=세션/트립 색상 or 기본 초록, 개인(마스터 혼자)=주황
    const barColor      = isTeam ? (session.color || tripColor || TEAM_COLOR) : PERSONAL_COLOR;
    const colorBarStyle = `background:${barColor}`;

    const html = renderTemplate('session_item', {
      title,
      sessionId,
      tripColorStyle,
      colorBarStyle,
    }, Icons);
    const wrapper = createElementFromHTML(html);

    // 미읽음: trip-color-dot에 unread 클래스 on/off
    if (unreadCount > 0) {
      const dot = wrapper.querySelector('.trip-color-dot');
      if (dot) dot.classList.add('unread');
    }

    const newBtn             = wrapper.querySelector('.sidebar-item');
    const editInput          = wrapper.querySelector('.sidebar-item-edit-input');
    const actionsDiv         = wrapper.querySelector('.session-actions');
    const moreBtn            = wrapper.querySelector('.more-btn');
    const dropdownMenu       = wrapper.querySelector('.session-dropdown-menu');
    const editBtn            = wrapper.querySelector('.edit-btn');
    const deleteBtn          = wrapper.querySelector('.delete-btn');
    const leaveBtn           = wrapper.querySelector('.leave-btn');
    const inviteBtn          = wrapper.querySelector('.invite-btn');
    const colorChangeBtn     = wrapper.querySelector('.color-change-btn');
    const convertPersonalBtn = wrapper.querySelector('.convert-personal-btn');
    const colorBar           = wrapper.querySelector('.session-color-bar');

    // 색상 변경: 팀 세션에서 참여자 누구나
    if (isTeam) colorChangeBtn.style.display = 'flex';

    if (userRole === 'master') {
      // 마스터: 삭제 + (팀일 때) 개인 전환
      deleteBtn.style.display = 'flex';
      if (isTeam) convertPersonalBtn.style.display = 'flex';
    } else {
      // 팀원: 나가기
      leaveBtn.style.display = 'flex';
    }

    newBtn.addEventListener('click', () => {
      if (state.isReceiving) return;
      window.location.hash = `#/chat/${sessionId}`;
    });

    moreBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.session-dropdown-menu.show').forEach(menu => {
        if (menu !== dropdownMenu) menu.classList.remove('show');
      });
      dropdownMenu.classList.toggle('show');
    });

    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdownMenu.classList.remove('show');
      newBtn.style.display = 'none';
      actionsDiv.style.display = 'none';
      editInput.style.display = 'block';
      editInput.focus();
    });

    deleteBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      dropdownMenu.classList.remove('show');
      const confirmMsg = isTeam
        ? '세션에서 나가시겠습니까? 팀원이 있으면 가장 오래된 팀원이 마스터가 됩니다.'
        : '세션을 삭제하시겠습니까?';
      if (confirm(confirmMsg)) {
        try {
          const response = await BackendHooks.deleteSession(sessionId);
          if (response.success) {
            wrapper.remove();
            showToast(response.deleted ? '세션이 삭제되었습니다.' : '세션에서 나갔습니다.');
            if (state.currentSessionId === sessionId) window.location.hash = '#/';
          }
        } catch (error) { console.error(error); }
      }
    });

    leaveBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      dropdownMenu.classList.remove('show');
      if (confirm('세션에서 나가시겠습니까?')) {
        try {
          const response = await BackendHooks.leaveSession(sessionId);
          if (response.success) {
            wrapper.remove();
            showToast('나갔습니다.');
            if (state.currentSessionId === sessionId) window.location.hash = '#/';
          }
        } catch (error) {
          showToast('나가기에 실패했습니다.');
          console.error(error);
        }
      }
    });

    convertPersonalBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      dropdownMenu.classList.remove('show');
      if (!confirm('개인 세션으로 전환하면 모든 팀원이 퇴장됩니다. 계속하시겠습니까?')) return;
      try {
        await BackendHooks.convertToPersonal(sessionId);
        showToast('개인 세션으로 전환되었습니다.');
        // 사이드바 색상 바를 주황으로 즉시 갱신
        if (colorBar) colorBar.style.background = PERSONAL_COLOR;
      } catch {
        showToast('전환에 실패했습니다.');
      }
    });

    inviteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdownMenu.classList.remove('show');

      // 초대 모달 — 이메일 검색 + 스테이징 목록 + 일괄 초대
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal-content" style="max-width:380px;width:90%;">
          <div class="modal-header">
            <h3 style="margin:0;font-size:15px;font-weight:700;">참여자 초대</h3>
            <button class="modal-close-btn" style="font-size:22px;background:none;border:none;cursor:pointer;color:#9ca3af;line-height:1;">&times;</button>
          </div>
          <div style="display:flex;gap:6px;margin-bottom:10px;">
            <input id="inviteEmailInput" type="email" placeholder="이메일 입력 후 검색"
              style="flex:1;padding:7px 10px;border:1px solid var(--border-color,#e2e8f0);border-radius:8px;font-size:13px;background:var(--bg-secondary,#f8fafc);color:var(--text-primary,#222);" autocomplete="off" />
            <button id="inviteSearchBtn"
              style="padding:7px 14px;border-radius:8px;background:var(--accent,#2563eb);color:#fff;border:none;cursor:pointer;font-size:13px;white-space:nowrap;">검색</button>
          </div>
          <div id="inviteSearchResult" style="min-height:28px;margin-bottom:8px;font-size:13px;color:var(--text-secondary,#888);"></div>
          <div id="inviteStagingLabel" style="font-size:12px;color:var(--text-secondary,#888);margin-bottom:4px;display:none;">초대 목록</div>
          <div id="inviteStagingList" style="display:flex;flex-direction:column;gap:4px;margin-bottom:12px;"></div>
          <button id="inviteSendBtn" disabled
            style="width:100%;padding:9px;border-radius:8px;background:var(--accent,#2563eb);color:#fff;border:none;cursor:pointer;font-size:14px;font-weight:600;opacity:0.45;">초대 보내기</button>
        </div>`;
      document.body.appendChild(modal);
      setTimeout(() => modal.classList.add('show'), 10);

      const emailInput   = modal.querySelector('#inviteEmailInput');
      const searchBtn2   = modal.querySelector('#inviteSearchBtn');
      const resultDiv    = modal.querySelector('#inviteSearchResult');
      const stagingLabel = modal.querySelector('#inviteStagingLabel');
      const stagingList  = modal.querySelector('#inviteStagingList');
      const sendBtn      = modal.querySelector('#inviteSendBtn');

      const close = () => { modal.classList.remove('show'); setTimeout(() => modal.remove(), 300); };
      modal.querySelector('.modal-close-btn').addEventListener('click', close);
      modal.addEventListener('click', ev => { if (ev.target === modal) close(); });

      // 스테이징 목록 관리
      const staged = new Map(); // user_id → {nickname, email}

      const refreshStaging = () => {
        stagingList.innerHTML = '';
        if (staged.size === 0) {
          stagingLabel.style.display = 'none';
          sendBtn.disabled = true;
          sendBtn.style.opacity = '0.45';
          sendBtn.style.cursor = 'not-allowed';
          return;
        }
        stagingLabel.style.display = '';
        sendBtn.disabled = false;
        sendBtn.style.opacity = '1';
        sendBtn.style.cursor = 'pointer';
        staged.forEach((u, uid) => {
          const row = document.createElement('div');
          row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:5px 8px;border-radius:6px;background:var(--bg-secondary,#f1f5f9);';
          const nameSpan = document.createElement('span');
          nameSpan.style.cssText = 'font-size:13px;color:var(--text-primary,#222);';
          nameSpan.textContent = `${u.nickname || uid} (${u.email || ''})`;
          const removeBtn = document.createElement('button');
          removeBtn.textContent = '−';
          removeBtn.style.cssText = 'background:none;border:none;cursor:pointer;font-size:16px;color:#ef4444;padding:0 4px;line-height:1;';
          removeBtn.addEventListener('click', () => { staged.delete(uid); refreshStaging(); });
          row.appendChild(nameSpan);
          row.appendChild(removeBtn);
          stagingList.appendChild(row);
        });
      };

      const doSearch = async () => {
        const q = emailInput.value.trim();
        if (!q) return;
        resultDiv.textContent = '검색 중...';
        try {
          const users = await BackendHooks.searchUsers(q);
          if (!users.length) { resultDiv.textContent = '해당 이메일로 가입된 사용자가 없습니다.'; return; }
          const user = users[0];
          if (staged.has(user.user_id)) { resultDiv.textContent = '이미 목록에 추가된 사용자입니다.'; return; }
          staged.set(user.user_id, { nickname: user.nickname, email: user.email || q });
          refreshStaging();
          resultDiv.textContent = `${user.nickname || user.user_id} 추가됨`;
          emailInput.value = '';
        } catch { resultDiv.textContent = '검색에 실패했습니다.'; }
      };

      searchBtn2.addEventListener('click', doSearch);
      emailInput.addEventListener('keydown', ev => { if (ev.key === 'Enter') doSearch(); });

      sendBtn.addEventListener('click', async () => {
        if (!staged.size) return;
        sendBtn.disabled = true;
        sendBtn.textContent = '초대 중...';
        let ok = 0, fail = 0;
        for (const uid of staged.keys()) {
          try { await BackendHooks.inviteUserToSession(sessionId, uid); ok++; }
          catch { fail++; }
        }
        if (ok) showToast(`${ok}명 초대 완료${fail ? `, ${fail}명 실패` : ''}`);
        else showToast('초대에 실패했습니다.');
        close();
      });

      emailInput.focus();
    });

    colorChangeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdownMenu.classList.remove('show');

      // 기존 팔레트 제거
      document.querySelectorAll('.session-color-palette').forEach(p => p.remove());

      const COLORS = [
        '#2a9d5c', '#3b82f6', '#8b5cf6', '#ec4899',
        '#f97316', '#eab308', '#ef4444', '#06b6d4',
        '#64748b', '#000000',
      ];
      const palette = document.createElement('div');
      palette.className = 'session-color-palette';
      palette.style.cssText = [
        'position:absolute', 'z-index:9999', 'background:var(--bg-primary,#fff)',
        'border:1px solid var(--border-color,#e2e8f0)', 'border-radius:10px',
        'padding:10px', 'display:flex', 'flex-wrap:wrap', 'gap:6px',
        'width:160px', 'box-shadow:0 4px 16px rgba(0,0,0,.15)',
      ].join(';');

      COLORS.forEach(c => {
        const swatch = document.createElement('button');
        swatch.style.cssText = `width:24px;height:24px;border-radius:50%;background:${c};border:2px solid transparent;cursor:pointer;transition:transform .15s`;
        swatch.addEventListener('mouseenter', () => { swatch.style.transform = 'scale(1.2)'; });
        swatch.addEventListener('mouseleave', () => { swatch.style.transform = ''; });
        swatch.addEventListener('click', async (ev) => {
          ev.stopPropagation();
          palette.remove();
          try {
            await BackendHooks.updateSessionColor(sessionId, c);
            if (colorBar) colorBar.style.background = c;
            showToast('색상이 변경되었습니다.');
          } catch {
            showToast('색상 변경에 실패했습니다.');
          }
        });
        palette.appendChild(swatch);
      });

      // 커스텀 색상 입력
      const customInput = document.createElement('input');
      customInput.type = 'color';
      customInput.style.cssText = 'width:24px;height:24px;border:none;padding:0;cursor:pointer;border-radius:50%';
      customInput.addEventListener('change', async () => {
        const c = customInput.value;
        palette.remove();
        try {
          await BackendHooks.updateSessionColor(sessionId, c);
          if (colorBar) colorBar.style.background = c;
          showToast('색상이 변경되었습니다.');
        } catch {
          showToast('색상 변경에 실패했습니다.');
        }
      });
      palette.appendChild(customInput);

      // 위치 계산: wrapper 기준
      const rect = wrapper.getBoundingClientRect();
      palette.style.left = `${rect.right + 4}px`;
      palette.style.top  = `${rect.top}px`;
      document.body.appendChild(palette);

      const closePalette = (ev) => {
        if (!palette.contains(ev.target)) {
          palette.remove();
          document.removeEventListener('click', closePalette);
        }
      };
      setTimeout(() => document.addEventListener('click', closePalette), 0);
    });

    let currentTitle = title;
    const saveTitle = async () => {
      const newTitle = editInput.value.trim();
      if (newTitle && newTitle !== currentTitle) {
        try {
          await BackendHooks.updateSessionTitle(sessionId, newTitle);
          updateSidebarSessionTitle(sessionId, newTitle);
          currentTitle = newTitle;
        } catch (error) { console.error(error); }
      }
      editInput.style.display = 'none';
      newBtn.style.display = 'flex';
      actionsDiv.style.display = '';
    };

    editInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') saveTitle();
      else if (e.key === 'Escape') {
        editInput.value = currentTitle;
        editInput.style.display = 'none';
        newBtn.style.display = 'flex';
        actionsDiv.style.display = '';
      }
    });
    editInput.addEventListener('blur', saveTitle);

    if (isPrepend) elements.sidebarList.prepend(wrapper);
    else elements.sidebarList.appendChild(wrapper);
  },

  async init(elements, state) {
    const seq    = ++this._initSeq;
    elements.sidebarList.innerHTML = '';
    const tripId = state.currentTripId || null;

    try {
      const sessions = await BackendHooks.fetchSessionList(tripId);
      if (seq !== this._initSeq) return;
      for (const session of sessions) {
        this.renderSidebarItem(session, elements, state, false);
      }
    } catch (error) { console.error(error); }
  },

  // 미읽음 dot를 해당 세션 아이템에서 지움 (세션 진입 시 호출)
  clearUnreadDot(sessionId) {
    const wrapper = document.querySelector(`.sidebar-item-wrapper[data-session-id="${sessionId}"]`);
    if (wrapper) {
      const dot = wrapper.querySelector('.trip-color-dot');
      if (dot) dot.classList.remove('unread');
    }
  },
};
