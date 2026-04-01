/**
 * router.js
 * handles hash-based routing and view transitions.
 */

import { BackendHooks } from './api.js';
import { 
  showLoadingIndicator, 
  removeLoadingIndicator, 
  appendMessage, 
  adjustTextareaHeight 
} from './ui.js';
import { renderSettingsPage } from './settings.js';
import { renderAccountPage } from './account.js';
import { renderHelpPage } from './help.js';

/**
 * switches the main view of the application.
 * @param {string} viewName - The name of the view to switch to ('home', 'chat', 'page').
 * @param {Object} elements - DOM elements used for switching views.
 */
export function switchView(viewName, elements) {
  const { 
    heroSection, 
    chatHistory, 
    chatWrap, 
    pageSection, 
    topBarActions 
  } = elements;

  // Hide all sections first
  heroSection.style.display = 'none';
  chatHistory.style.display = 'none';
  chatWrap.style.display = 'none';
  pageSection.style.display = 'none';
  
  // Top bar actions are usually visible
  topBarActions.style.display = 'flex';

  switch (viewName) {
    case 'home':
      heroSection.style.display = 'flex';
      chatWrap.style.display = 'block';
      break;
    case 'chat':
      chatHistory.style.display = 'flex';
      chatWrap.style.display = 'block';
      break;
    case 'page':
      pageSection.style.display = 'flex';
      break;
  }
}

/**
 * router function that handles hash changes.
 * @param {Object} state - Application state (currentSessionId, etc.).
 * @param {Object} elements - DOM elements for manipulation.
 */
export async function router(state, elements) {
  const path = window.location.hash;
  const { 
    chatHistory, 
    chatInput, 
    chatBox, 
    pageSection 
  } = elements;

  if (path === '' || path === '#/') {
    state.currentSessionId = null;
    switchView('home', elements);
    chatHistory.innerHTML = '';
    chatInput.value = '';
    adjustTextareaHeight(chatInput, chatBox);
    chatBox.classList.remove('expanded');
  } 
  else if (path === '#/settings') {
    state.currentSessionId = null;
    switchView('page', elements);
    renderSettingsPage(pageSection);
  } 
  else if (path === '#/account') {
    state.currentSessionId = null;
    switchView('page', elements);
    renderAccountPage(pageSection);
  } 
  else if (path === '#/help') {
    state.currentSessionId = null;
    switchView('page', elements);
    renderHelpPage(pageSection);
  } 
  else if (path.startsWith('#/chat/')) {
    const ssid = path.replace('#/chat/', '');
    
    if (state.currentSessionId !== ssid) {
      switchView('chat', elements);
      chatHistory.innerHTML = '';
      const loadingId = showLoadingIndicator(chatHistory);
      state.currentSessionId = ssid;
      
      try {
        const historyData = await BackendHooks.fetchChatHistory(ssid);
        removeLoadingIndicator(loadingId);
        historyData.forEach(msg => appendMessage(chatHistory, msg.content, msg.role));
      } catch (error) {
        console.error("Failed to load chat history:", error);
        removeLoadingIndicator(loadingId);
      }
    } else {
      switchView('chat', elements);
    }
  }
}
