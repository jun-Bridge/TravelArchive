/**
 * sidebar.js
 * manages left and right sidebar toggling, resizing, and synchronization.
 */

export const SidebarManager = {
  isMobile: () => window.matchMedia('(max-width: 768px)').matches,
  mobileSidebarMode: () => window.matchMedia('(max-width: 560px)').matches ? 'hide' : 'peek',

  /**
   * syncs main content class based on mobile sidebar state.
   */
  syncContentState(elements) {
    const { mainContent, sidebar, rightSidebar } = elements;
    if (!this.isMobile()) {
      mainContent.classList.remove('content-obscured', 'content-glass-peek');
      return;
    }

    const leftOpen = sidebar.classList.contains('open');
    const rightOpen = rightSidebar.classList.contains('open');

    mainContent.classList.remove('content-obscured', 'content-glass-peek');
    if (leftOpen || rightOpen) {
      mainContent.classList.add(this.mobileSidebarMode() === 'hide' ? 'content-obscured' : 'content-glass-peek');
    }
  },

  /**
   * opens the left sidebar.
   */
  openSidebar(elements, config) {
    const { sidebar, sidebarOverlay, documentBody } = elements;
    sidebar.classList.remove('collapsed'); 
    
    if (this.isMobile()) { 
      this.closeRightSidebar(elements, { silent: true });
      sidebar.classList.add('open'); 
      documentBody.classList.add('left-open');
      if (sidebarOverlay) { 
        sidebarOverlay.style.display = 'block'; 
        requestAnimationFrame(() => sidebarOverlay.classList.add('show')); 
      }
      this.syncContentState(elements);
    } else { 
      sidebar.style.width = `${config.currentLeftWidth}px`;
    }
  },

  /**
   * closes the left sidebar.
   */
  closeSidebar(elements, options = {}) {
    const { sidebar, sidebarOverlay, documentBody } = elements;
    const { silent = false } = options;
    
    sidebar.classList.add('collapsed'); 
    if (this.isMobile()) { 
      sidebar.classList.remove('open'); 
      documentBody.classList.remove('left-open');
      if (sidebarOverlay) { 
        sidebarOverlay.classList.remove('show'); 
        setTimeout(() => { sidebarOverlay.style.display = 'none'; }, 300); 
      }
      if (!silent) this.syncContentState(elements);
    } else { 
      sidebar.style.width = ''; 
    }
  },

  /**
   * opens the right sidebar.
   */
  openRightSidebar(elements, config) {
    const { rightSidebar, rightSidebarOverlay, documentBody } = elements;
    rightSidebar.classList.remove('collapsed');
    
    if (this.isMobile()) { 
      this.closeSidebar(elements, { silent: true });
      rightSidebar.classList.add('open'); 
      documentBody.classList.add('right-open');
      if (rightSidebarOverlay) { 
        rightSidebarOverlay.style.display = 'block'; 
        requestAnimationFrame(() => rightSidebarOverlay.classList.add('show')); 
      }
      this.syncContentState(elements);
    } else { 
      rightSidebar.style.width = `${config.currentRightWidth}px`; 
    }

    // Relayout map if exists
    setTimeout(() => { 
      if (window.kakaoMap && typeof window.kakaoMap.relayout === 'function') { 
        window.kakaoMap.relayout(); 
      } 
    }, 310);
  },

  /**
   * closes the right sidebar.
   */
  closeRightSidebar(elements, options = {}) {
    const { rightSidebar, rightSidebarOverlay, documentBody } = elements;
    const { silent = false } = options;
    
    rightSidebar.classList.add('collapsed');
    if (this.isMobile()) { 
      rightSidebar.classList.remove('open'); 
      documentBody.classList.remove('right-open');
      if (rightSidebarOverlay) { 
        rightSidebarOverlay.classList.remove('show'); 
        setTimeout(() => { rightSidebarOverlay.style.display = 'none'; }, 300); 
      }
      if (!silent) this.syncContentState(elements);
    } else { 
      rightSidebar.style.width = ''; 
    }
  },

  /**
   * initializes sidebar tabs (Sessions vs Calendar).
   */
  initTabs(elements) {
    const { 
      tabSessions, 
      tabCalendar, 
      sessionView, 
      calendarView,
      sessionHeaderControls,
      calendarHeaderControls
    } = elements;

    if (!tabSessions || !tabCalendar) return;

    tabSessions.addEventListener('click', () => {
      tabSessions.classList.add('active');
      tabCalendar.classList.remove('active');
      
      sessionView.style.display = 'flex';
      calendarView.style.display = 'none';
      
      sessionHeaderControls.style.display = 'block';
      calendarHeaderControls.style.display = 'none';
    });

    tabCalendar.addEventListener('click', () => {
      tabCalendar.classList.add('active');
      tabSessions.classList.remove('active');
      
      sessionView.style.display = 'none';
      calendarView.style.display = 'flex';
      
      sessionHeaderControls.style.display = 'none';
      calendarHeaderControls.style.display = 'block';
    });
  },

  /**
   * initializes folding for calendar and schedule sections.
   */
  initFolding(elements) {
    const { toggleCalendarBtn, calendarContent, toggleScheduleBtn, scheduleContent } = elements;

    if (toggleCalendarBtn && calendarContent) {
      toggleCalendarBtn.addEventListener('click', () => {
        const isCollapsed = calendarContent.classList.toggle('section-content-collapsed');
        toggleCalendarBtn.classList.toggle('collapsed', isCollapsed);
        toggleCalendarBtn.title = isCollapsed ? '펴기' : '접기';
      });
    }

    if (toggleScheduleBtn && scheduleContent) {
      toggleScheduleBtn.addEventListener('click', () => {
        const isCollapsed = scheduleContent.classList.toggle('section-content-collapsed');
        toggleScheduleBtn.classList.toggle('collapsed', isCollapsed);
        toggleScheduleBtn.title = isCollapsed ? '펴기' : '접기';
      });
    }
  },

  /**
   * initializes sidebar resizers.
   */
  initResizers(elements, config) {
    const { 
      leftSidebarResizer, 
      rightSidebarResizer, 
      sidebar, 
      rightSidebar, 
      documentBody,
      rightSidebarContent 
    } = elements;

    let isLeftSidebarDragging = false;
    let lsStartX = 0;
    let lsStartWidth = 0;

    let isRightSidebarDragging = false;
    let rsStartX = 0;
    let rsStartWidth = 0;

    if (leftSidebarResizer) {
      leftSidebarResizer.addEventListener('mousedown', (e) => {
        if (this.isMobile()) return; 
        isLeftSidebarDragging = true; 
        lsStartX = e.clientX; 
        lsStartWidth = sidebar.getBoundingClientRect().width;
        sidebar.classList.add('notransition'); 
        leftSidebarResizer.classList.add('active');
        documentBody.style.userSelect = 'none'; 
        documentBody.style.cursor = 'col-resize';
      });
    }

    if (rightSidebarResizer) {
      rightSidebarResizer.addEventListener('mousedown', (e) => {
        if (this.isMobile()) return; 
        isRightSidebarDragging = true; 
        rsStartX = e.clientX; 
        rsStartWidth = rightSidebar.getBoundingClientRect().width;
        rightSidebar.classList.add('notransition'); 
        rightSidebarResizer.classList.add('active');
        if (rightSidebarContent) rightSidebarContent.classList.add('map-drag-shield');
        documentBody.style.userSelect = 'none'; 
        documentBody.style.cursor = 'col-resize';
      });
    }

    document.addEventListener('mousemove', (e) => {
      const minMiddleWidth = Math.max(400, window.innerWidth * 0.3); // Ensure at least 400px or 30% for middle

      if (isLeftSidebarDragging) {
        const mouseDelta = e.clientX - lsStartX;
        let newWidth = lsStartWidth + mouseDelta;

        // Calculate available space for left sidebar
        const currentRightWidth = rightSidebar.classList.contains('collapsed') ? 0 : rightSidebar.getBoundingClientRect().width;
        const maxAllowed = window.innerWidth - currentRightWidth - minMiddleWidth;

        if (newWidth < 300) newWidth = 300;
        if (newWidth > maxAllowed) newWidth = maxAllowed;
        
        // Final safety check to not exceed 45% of total width
        const absoluteMax = window.innerWidth * 0.45;
        if (newWidth > absoluteMax) newWidth = absoluteMax;

        sidebar.style.width = `${newWidth}px`; 
        config.currentLeftWidth = newWidth;
      }
      
      if (isRightSidebarDragging) {
        const mouseDelta = rsStartX - e.clientX; 
        let newWidth = rsStartWidth + mouseDelta;

        // Calculate available space for right sidebar
        const currentLeftWidth = sidebar.classList.contains('collapsed') ? 0 : sidebar.getBoundingClientRect().width;
        const maxAllowed = window.innerWidth - currentLeftWidth - minMiddleWidth;

        if (newWidth < 300) newWidth = 300;
        if (newWidth > maxAllowed) newWidth = maxAllowed;

        // Final safety check to not exceed 60% of total width (since it's a map)
        const absoluteMax = window.innerWidth * 0.65;
        if (newWidth > absoluteMax) newWidth = absoluteMax;

        rightSidebar.style.width = `${newWidth}px`; 
        config.currentRightWidth = newWidth; 
      }
    });


    document.addEventListener('mouseup', () => {
      if (isLeftSidebarDragging) {
        isLeftSidebarDragging = false; 
        sidebar.classList.remove('notransition'); 
        leftSidebarResizer.classList.remove('active');
        documentBody.style.userSelect = ''; 
        documentBody.style.cursor = ''; 
        localStorage.setItem('leftSidebarCustomWidth', config.currentLeftWidth);
      }
      if (isRightSidebarDragging) {
        isRightSidebarDragging = false; 
        rightSidebar.classList.remove('notransition'); 
        rightSidebarResizer.classList.remove('active');
        if (rightSidebarContent) rightSidebarContent.classList.remove('map-drag-shield');
        documentBody.style.userSelect = ''; 
        documentBody.style.cursor = ''; 
        localStorage.setItem('rightSidebarCustomWidth', config.currentRightWidth);
        if (window.kakaoMap && typeof window.kakaoMap.relayout === 'function') { 
          window.kakaoMap.relayout(); 
        }
      }
    });
  }
};
