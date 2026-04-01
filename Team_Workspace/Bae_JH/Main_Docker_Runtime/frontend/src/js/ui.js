/**
 * ui.js
 * contains reusable UI components and utility functions for DOM manipulation.
 */

/**
 * updates the title of a session in the sidebar UI.
 * @param {string} sessionId 
 * @param {string} newTitle 
 */
export function updateSidebarSessionTitle(sessionId, newTitle) {
  const itemBtn = document.querySelector(`.sidebar-item[data-session-id="${sessionId}"]`);
  if (itemBtn) {
    itemBtn.innerHTML = `<span class="dot"></span>${newTitle}`;
  }

  const wrapper = itemBtn?.closest('.sidebar-item-wrapper');
  if (wrapper) {
    const editInput = wrapper.querySelector('.sidebar-item-edit-input');
    if (editInput) {
      editInput.value = newTitle;
    }
  }
}

/**
 * displays a global toast notification.
 * @param {string} message 
 */
export function showToast(message) {
  let toast = document.getElementById('global-toast');

  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'global-toast';
    toast.className = 'toast-notification';
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.add('show');

  if (toast.hideTimeout) {
    clearTimeout(toast.hideTimeout);
  }

  toast.hideTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

/**
 * automatically adjusts the height of a textarea based on its content.
 * @param {HTMLElement} chatInput 
 * @param {HTMLElement} chatBox 
 */
export function adjustTextareaHeight(chatInput, chatBox) {
  if (!chatInput) return;
  const style = window.getComputedStyle(chatInput);

  const lineHeight = parseFloat(style.lineHeight) || 21;
  const paddingTop = parseFloat(style.paddingTop) || 0;
  const paddingBottom = parseFloat(style.paddingBottom) || 0;
  const borderTop = parseFloat(style.borderTopWidth) || 0;
  const borderBottom = parseFloat(style.borderBottomWidth) || 0;

  const baseHeight = lineHeight + paddingTop + paddingBottom + borderTop + borderBottom;
  const minHeight = Math.max(32, Math.ceil(baseHeight));

  const isExpanded = chatBox.classList.contains('expanded');
  const maxHeight = isExpanded ? 360 : 180;

  chatInput.style.height = 'auto';

  const nextHeight = Math.min(Math.max(chatInput.scrollHeight, minHeight), maxHeight);

  chatInput.style.height = `${nextHeight}px`;
  chatInput.style.overflowY = nextHeight >= maxHeight ? 'auto' : 'hidden';
}

/**
 * appends a loading indicator to the chat history.
 * @param {HTMLElement} chatHistory 
 * @returns {string} The unique ID of the loading indicator.
 */
export function showLoadingIndicator(chatHistory) {
  const loadingId = 'loading-' + Date.now();

  const rowDiv = document.createElement('div');
  rowDiv.className = 'message-row bot';
  rowDiv.id = loadingId;

  const msgDiv = document.createElement('div');
  msgDiv.classList.add('message', 'bot');
  msgDiv.innerHTML = `<div class="loading-dots"><span></span><span></span><span></span></div>`;

  rowDiv.appendChild(msgDiv);
  chatHistory.appendChild(rowDiv);
  chatHistory.scrollTop = chatHistory.scrollHeight;

  return loadingId;
}

/**
 * removes a loading indicator from the DOM.
 * @param {string} id 
 */
export function removeLoadingIndicator(id) {
  const loadingEl = document.getElementById(id);
  if (loadingEl) {
    loadingEl.remove();
  }
}

/**
 * appends a new message to the chat history UI.
 * @param {HTMLElement} chatHistory 
 * @param {string} text 
 * @param {string} sender - 'user' or 'bot'.
 * @returns {HTMLElement} The created message row element.
 */
export function appendMessage(chatHistory, text, sender) {
  const rowDiv = document.createElement('div');
  rowDiv.className = `message-row ${sender}`;

  const msgDiv = document.createElement('div');
  msgDiv.classList.add('message', sender);

  // Parse markdown if sender is bot and marked is available
  if (sender === 'bot' && text && typeof marked !== 'undefined') {
    msgDiv.innerHTML = marked.parse(text);
  } else {
    msgDiv.textContent = text;
  }

  rowDiv.appendChild(msgDiv);

  // Add message actions (e.g., copy button)
  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'message-actions';

  const copyBtn = document.createElement('button');
  copyBtn.className = 'action-btn';
  copyBtn.title = "메시지 복사";
  copyBtn.innerHTML = `
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
    </svg>`;

  copyBtn.addEventListener('click', async () => {
    const currentText = msgDiv.innerText || msgDiv.textContent;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(currentText);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = currentText;
        textArea.style.position = 'absolute';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }

      const checkIcon = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#10B981" stroke-width="2"><path d="M5 13l4 4L19 7"></path></svg>`;
      const originalIcon = copyBtn.innerHTML;

      copyBtn.innerHTML = checkIcon;
      setTimeout(() => {
        copyBtn.innerHTML = originalIcon;
      }, 2000);

      showToast('메시지가 복사되었습니다.');
    } catch (err) {
      console.error('Copy failed:', err);
    }
  });

  actionsDiv.appendChild(copyBtn);
  rowDiv.appendChild(actionsDiv);
  chatHistory.appendChild(rowDiv);
  chatHistory.scrollTop = chatHistory.scrollHeight;

  return rowDiv;
}
