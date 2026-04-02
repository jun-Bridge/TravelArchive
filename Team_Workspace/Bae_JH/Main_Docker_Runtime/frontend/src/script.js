/**
 * script.js (Root)
 * Application Entry Point.
 * Coordinates between modular logic in the js/ directory.
 */

import { BackendHooks } from './js/api.js';
import { adjustTextareaHeight } from './js/ui.js';
import { WeatherManager } from './js/weatherManager.js';
import { SidebarManager } from './js/sidebar.js';
import { ChatManager } from './js/chat.js';
import { SessionManager } from './js/session.js';
import { CalendarManager } from './js/calendar.js';
import { ScheduleManager } from './js/schedule.js';
import { router } from './js/router.js';

import { ThemeManager } from './js/theme.js';

document.addEventListener('DOMContentLoaded', async () => {
  // --- 1. DOM Element Collection ---
  const elements = {
    // Layout
    mainContent: document.getElementById('mainContent'),
    documentBody: document.body,
    
    // Sections
    heroSection: document.getElementById('heroSection'),
    pageSection: document.getElementById('pageSection'),
    topBarActions: document.getElementById('topBarActions'),
    
    // Chat
    chatWrap: document.getElementById('chatWrap'),
    chatHistory: document.getElementById('chatHistory'),
    chatInput: document.getElementById('chatInput'),
    chatBox: document.getElementById('chatBox'),
    sendBtn: document.getElementById('sendBtn'),
    expandBtn: document.getElementById('expandBtn'),
    attachBtn: document.getElementById('attachBtn'),
    fileInput: document.getElementById('fileInput'),
    downloadChatBtn: document.getElementById('downloadChatBtn'),
    shareChatBtn: document.getElementById('shareChatBtn'),
    
    // Left Sidebar
    sidebar: document.getElementById('sidebar'),
    sidebarList: document.getElementById('sidebarList'),
    menuToggle: document.getElementById('menuToggle'),
    sidebarOverlay: document.getElementById('sidebarOverlay'),
    leftSidebarResizer: document.getElementById('leftSidebarResizer'),
    resetLeftSidebarBtn: document.getElementById('resetLeftSidebarBtn'),
    
    // Sidebar Tabs & Views
    tabSessions: document.getElementById('tabSessions'),
    tabCalendar: document.getElementById('tabCalendar'),
    sessionView: document.getElementById('sessionView'),
    calendarView: document.getElementById('calendarView'),
    sessionHeaderControls: document.getElementById('sessionHeaderControls'),
    calendarHeaderControls: document.getElementById('calendarHeaderControls'),
    toggleCalendarBtn: document.getElementById('toggleCalendarBtn'),
    calendarContent: document.getElementById('calendarContent'),
    toggleScheduleBtn: document.getElementById('toggleScheduleBtn'),
    scheduleContent: document.getElementById('scheduleContent'),
    
    // Right Sidebar
    rightSidebar: document.getElementById('rightSidebar'),
    rightSidebarContent: document.getElementById('rightSidebarContent'),
    mapToggleBtn: document.getElementById('mapToggleBtn'),
    closeRightSidebarBtn: document.getElementById('closeRightSidebarBtn'),
    rightSidebarOverlay: document.getElementById('rightSidebarOverlay'),
    rightSidebarResizer: document.getElementById('rightSidebarResizer'),
    resetRightSidebarBtn: document.getElementById('resetRightSidebarBtn'),

    // Navigation Buttons
    homeBtn: document.getElementById('homeBtn'),
    newChatBtn: document.getElementById('newChatBtn'),
    settingsBtn: document.getElementById('settingsBtn'),
    accountBtn: document.getElementById('accountBtn'),
    helpBtn: document.getElementById('helpBtn'),
    
    // Theme
    themeBtn: document.getElementById('themeBtn'),
    themePopup: document.getElementById('themePopup'),
    themeSwatches: document.querySelectorAll('.theme-swatch'),
    weatherLayer: document.getElementById('weatherLayer'),
    bgPanorama: document.getElementById('bgPanorama')
  };

  // --- 2. Application State ---
  const state = {
    currentSessionId: null,
    isReceiving: false
  };

  const config = {
    currentLeftWidth: parseInt(localStorage.getItem('leftSidebarCustomWidth'), 10) || 300,
    currentRightWidth: parseInt(localStorage.getItem('rightSidebarCustomWidth'), 10) || 300
  };

  // Transparency Initialization
  const savedOpacity = localStorage.getItem('appGlassOpacity') || '14';
  document.documentElement.style.setProperty('--app-glass-opacity', savedOpacity / 100);

  // --- 3. Initial Setup ---
  
  // Background Panorama
  const bgImages = [
    '/resource/bg-long-1.jpg', 
    '/resource/bg-long-2.jpg', 
    '/resource/bg-long-3.jpg', 
    '/resource/bg-long-4.jpg', 
    '/resource/bg-long-5.jpg'
  ];
  if (elements.bgPanorama) {
    const randomIndex = Math.floor(Math.random() * bgImages.length);
    elements.bgPanorama.style.backgroundImage = `url('${bgImages[randomIndex]}')`;
  }

  // Initialize Modules
  await SessionManager.init(elements, state);
  CalendarManager.render(elements.calendarContent);
  ScheduleManager.render(elements.scheduleContent);
  SidebarManager.initTabs(elements);
  SidebarManager.initResizers(elements, config);
  SidebarManager.initFolding(elements);
  
  // Initial Routing
  window.addEventListener('hashchange', () => router(state, elements));
  window.addEventListener('load', () => router(state, elements));
  router(state, elements); // Call once manually

  // --- 4. Event Listeners ---

  // Sidebar Toggles
  elements.menuToggle.addEventListener('click', () => {
    const isMobile = SidebarManager.isMobile();
    if (isMobile) {
      elements.sidebar.classList.contains('open') 
        ? SidebarManager.closeSidebar(elements) 
        : SidebarManager.openSidebar(elements, config);
    } else {
      elements.sidebar.classList.contains('collapsed') 
        ? SidebarManager.openSidebar(elements, config) 
        : SidebarManager.closeSidebar(elements);
    }
  });

  if (elements.mapToggleBtn) {
    elements.mapToggleBtn.addEventListener('click', () => {
      const isMobile = SidebarManager.isMobile();
      if (isMobile) {
        elements.rightSidebar.classList.contains('open') 
          ? SidebarManager.closeRightSidebar(elements) 
          : SidebarManager.openRightSidebar(elements, config);
      } else {
        elements.rightSidebar.classList.contains('collapsed') 
          ? SidebarManager.openRightSidebar(elements, config) 
          : SidebarManager.closeRightSidebar(elements);
      }
    });
  }

  if (elements.closeRightSidebarBtn) {
    elements.closeRightSidebarBtn.addEventListener('click', () => SidebarManager.closeRightSidebar(elements));
  }

  if (elements.sidebarOverlay) {
    elements.sidebarOverlay.addEventListener('click', () => SidebarManager.closeSidebar(elements));
  }

  if (elements.rightSidebarOverlay) {
    elements.rightSidebarOverlay.addEventListener('click', () => SidebarManager.closeRightSidebar(elements));
  }

  // Sidebar Resets
  if (elements.resetLeftSidebarBtn) {
    elements.resetLeftSidebarBtn.addEventListener('click', () => {
      config.currentLeftWidth = 300;
      elements.sidebar.style.width = `${config.currentLeftWidth}px`;
      localStorage.setItem('leftSidebarCustomWidth', config.currentLeftWidth);
    });
  }

  if (elements.resetRightSidebarBtn) {
    elements.resetRightSidebarBtn.addEventListener('click', () => {
      config.currentRightWidth = 300;
      elements.rightSidebar.style.width = `${config.currentRightWidth}px`;
      localStorage.setItem('rightSidebarCustomWidth', config.currentRightWidth);
      setTimeout(() => {
        if (window.kakaoMap && typeof window.kakaoMap.relayout === 'function') {
          window.kakaoMap.relayout();
        }
      }, 310);
    });
  }

  // Navigation
  elements.homeBtn.addEventListener('click', () => {
    if (SidebarManager.isMobile()) SidebarManager.closeSidebar(elements);
    if (!state.isReceiving) window.location.hash = '#/';
  });

  elements.newChatBtn.addEventListener('click', () => {
    if (SidebarManager.isMobile()) SidebarManager.closeSidebar(elements);
    if (!state.isReceiving) window.location.hash = '#/';
  });

  ['settings', 'account', 'help'].forEach(view => {
    elements[`${view}Btn`].addEventListener('click', () => {
      if (SidebarManager.isMobile()) SidebarManager.closeSidebar(elements);
      window.location.hash = `#/${view}`;
    });
  });

  // Chat Interactions
  elements.sendBtn.addEventListener('click', () => ChatManager.handleSend(state, elements));
  
  elements.chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      ChatManager.handleSend(state, elements);
    }
  });

  elements.chatInput.addEventListener('input', () => {
    adjustTextareaHeight(elements.chatInput, elements.chatBox);
  });

  elements.expandBtn.addEventListener('click', () => {
    elements.chatBox.classList.toggle('expanded');
    adjustTextareaHeight(elements.chatInput, elements.chatBox);
  });

  elements.attachBtn.addEventListener('click', () => elements.fileInput.click());

  elements.fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      ChatManager.handleFileUpload(e.target.files, state, elements);
    }
  });

  // Drag & Drop
  elements.chatBox.addEventListener('dragover', (e) => {
    e.preventDefault();
    elements.chatBox.classList.add('drag-over');
  });

  elements.chatBox.addEventListener('dragleave', () => {
    elements.chatBox.classList.remove('drag-over');
  });

  elements.chatBox.addEventListener('drop', (e) => {
    e.preventDefault();
    elements.chatBox.classList.remove('drag-over');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      ChatManager.handleFileUpload(e.dataTransfer.files, state, elements);
    }
  });

  // Top Bar Actions
  elements.downloadChatBtn.addEventListener('click', () => {
    if (state.currentSessionId && confirm("다운로드하시겠습니까?")) {
      BackendHooks.downloadChat(state.currentSessionId);
    }
  });

  elements.shareChatBtn.addEventListener('click', () => {
    alert("공유하기 기능이 호출되었습니다.");
  });

  // Theme Management
  ThemeManager.init(elements);

  // Global Resizing & Utilities
  function updatePlaceholder() {
    if (window.innerWidth <= 860) {
      elements.chatInput.placeholder = "메시지를 입력하세요";
    } else {
      elements.chatInput.placeholder = "메시지 또는 파일을 이곳에 드롭하세요 (Shift+Enter로 줄바꿈)";
    }
  }

  window.addEventListener('resize', () => {
    adjustTextareaHeight(elements.chatInput, elements.chatBox);
    updatePlaceholder();
    
    if (!SidebarManager.isMobile()) {
      SidebarManager.closeSidebar(elements, { silent: true });
      SidebarManager.closeRightSidebar(elements, { silent: true });
    }
    SidebarManager.syncContentState(elements);
  });

  // Initialize UI state
  updatePlaceholder();
  adjustTextareaHeight(elements.chatInput, elements.chatBox);
  SidebarManager.syncContentState(elements);
});
