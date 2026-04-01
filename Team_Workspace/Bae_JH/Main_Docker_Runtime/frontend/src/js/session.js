/**
 * session.js
 * manages session list rendering and state in the sidebar.
 */

import { BackendHooks } from './api.js';
import { updateSidebarSessionTitle, showToast } from './ui.js';

export const SessionManager = {
  /**
   * renders a session item in the sidebar list.
   */
  renderSidebarItem(title, sessionId, elements, state, isPrepend = true) {
    const { sidebarList } = elements;
    
    const wrapper = document.createElement('div');
    wrapper.className = 'sidebar-item-wrapper';
    
    const newBtn = document.createElement('button');
    newBtn.classList.add('sidebar-item');
    newBtn.setAttribute('data-session-id', sessionId);
    newBtn.innerHTML = `<span class="dot"></span>${title}`;
    
    const editInput = document.createElement('input');
    editInput.className = 'sidebar-item-edit-input';
    editInput.type = 'text';
    editInput.value = title;
    
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'session-actions';
    
    const editBtn = document.createElement('button');
    editBtn.className = 'session-action-btn';
    editBtn.innerHTML = '✎';
    editBtn.title = "이름 변경";
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'session-action-btn';
    deleteBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      </svg>`;
    
    actionsDiv.appendChild(editBtn);
    actionsDiv.appendChild(deleteBtn);
    
    // Event Handlers
    newBtn.addEventListener('click', () => {
      if (state.isReceiving) return;
      window.location.hash = `#/chat/${sessionId}`;
    });
    
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      newBtn.style.display = 'none';
      actionsDiv.style.display = 'none';
      editInput.style.display = 'block';
      editInput.focus();
    });
    
    deleteBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if(confirm("삭제하시겠습니까?")) {
        try {
          const response = await BackendHooks.deleteSession(sessionId);
          if (response.success) {
            wrapper.remove();
            showToast(`삭제됨`);
            if (state.currentSessionId === sessionId) {
              window.location.hash = '#/';
            }
          }
        } catch (error) {
          console.error("Failed to delete session:", error);
        }
      }
    });

    const saveTitle = async () => {
      const newTitle = editInput.value.trim();
      if (newTitle && newTitle !== title) {
        try {
          await BackendHooks.updateSessionTitle(sessionId, newTitle);
          updateSidebarSessionTitle(sessionId, newTitle);
          title = newTitle;
        } catch (error) {
          console.error("Failed to update title:", error);
        }
      } else {
        editInput.value = title;
      }
      editInput.style.display = 'none';
      newBtn.style.display = 'flex';
      actionsDiv.style.display = ''; 
    };

    editInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') saveTitle();
      else if (e.key === 'Escape') {
        editInput.value = title;
        editInput.style.display = 'none';
        newBtn.style.display = 'flex';
        actionsDiv.style.display = '';
      }
    });
    
    editInput.addEventListener('blur', saveTitle);

    wrapper.appendChild(newBtn);
    wrapper.appendChild(editInput);
    wrapper.appendChild(actionsDiv);
    
    if (isPrepend) sidebarList.prepend(wrapper);
    else sidebarList.appendChild(wrapper);
  },

  /**
   * initializes the session list.
   */
  async init(elements, state) {
    elements.sidebarList.innerHTML = '';
    try {
      const sessions = await BackendHooks.fetchSessionList();
      sessions.forEach(session => {
        this.renderSidebarItem(session.title, session.id, elements, state, false);
      });
    } catch (error) {
      console.error("Failed to fetch session list:", error);
    }
  }
};
