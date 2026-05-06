/**
 * sidebar-folding.js
 * Handles collapsing/expanding of sidebar sections (calendar, schedule, memo).
 * Also handles resizable widgets for adjusting memo/schedule heights.
 */

import { SidebarTabs } from './sidebar-tabs.js';
import { MemoManager } from './memo-manager.js';
import { ScheduleManager } from './schedule-manager.js';

export const SidebarFolding = {
  /**
   * Set up folding (collapse/expand) for sidebar sections
   */
  initFolding(elements) {
    const isSmallHeight = window.innerHeight < 850;
    const setupFolding = (btn, content, forceCollapse = false) => {
      if (!btn || !content) return;
      const header = btn.closest('.section-header');
      const rowButtons = header ? header.querySelectorAll('.row-action-btn') : [];

      const toggle = (collapse) => {
        content.classList.toggle('section-content-collapsed', collapse);
        btn.classList.toggle('collapsed', collapse);
        btn.title = collapse ? '펴기' : '접기';

        if (!collapse) {
          // Recalculate heights when unfolding to prevent 1px height bug
          if (content.id === 'memoContent' || content.contains(document.getElementById('memoTableBody'))) {
            setTimeout(() => SidebarTabs.adjustAllMemoHeights(), 10);
          }
        }

        rowButtons.forEach(rowBtn => {
          rowBtn.classList.toggle('disabled', collapse);
          rowBtn.style.pointerEvents = collapse ? 'none' : 'auto';
          rowBtn.style.opacity = collapse ? '0.3' : '1';
        });
      };

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const currentlyCollapsed = content.classList.contains('section-content-collapsed');
        toggle(!currentlyCollapsed);
      });

      if (forceCollapse) toggle(true);
    };

    setupFolding(elements.toggleCalendarBtn, elements.calendarContent, isSmallHeight);
    setupFolding(elements.toggleScheduleBtn, elements.scheduleContent, isSmallHeight);
    setupFolding(elements.toggleMemoBtn, elements.memoContent, isSmallHeight);

    // Initialize resizable widgets
    this.initResizableWidgets();

    // Initialize memo and schedule managers
    MemoManager.init(elements);
    ScheduleManager.init(elements);
  },

  /**
   * Make memo and schedule sections resizable by dragging a handle
   */
  initResizableWidgets() {
    const MIN_HEIGHT = 200;
    const targets = [
      document.querySelector('.memo-inner-scroll'),
      document.querySelector('.schedule-inner-scroll'),
    ];

    targets.forEach(el => {
      if (!el || el.closest('.widget-resizable')) return; // Prevent duplicate initialization

      // Wrap in resizable container
      const wrapper = document.createElement('div');
      wrapper.className = 'widget-resizable';
      el.parentNode.insertBefore(wrapper, el);
      wrapper.appendChild(el);

      // Create resize handle
      const handle = document.createElement('div');
      handle.className = 'widget-resize-handle';
      handle.title = '드래그하여 크기 조절';
      wrapper.appendChild(handle);

      let isDragging = false;
      let startY = 0;
      let startHeight = 0;

      handle.addEventListener('mousedown', (e) => {
        isDragging = true;
        startY = e.clientY;
        startHeight = el.getBoundingClientRect().height;
        handle.classList.add('dragging');
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'ns-resize';
        e.preventDefault();
        e.stopPropagation();
      });

      document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const delta = e.clientY - startY;
        const sidebarView = el.closest('.sidebar-view');
        const maxHeight = sidebarView
          ? Math.max(MIN_HEIGHT, sidebarView.clientHeight - 80)
          : 500;
        const newHeight = Math.max(MIN_HEIGHT, Math.min(startHeight + delta, maxHeight));
        el.style.maxHeight = newHeight + 'px';
      });

      document.addEventListener('mouseup', () => {
        if (!isDragging) return;
        isDragging = false;
        handle.classList.remove('dragging');
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
      });
    });
  }
};

