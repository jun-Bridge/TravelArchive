/**
 * memo-manager.js
 * Manages memo CRUD operations - creating, editing, saving, and loading memorows.
 */

import { BackendHooks } from '../api.js';
import { CalendarManager } from '../calendar.js';
import { debounce, getSessionIdFromHash } from '../utils.js';
import { eventBus, EVENTS } from '../core/event-bus.js';

export const MemoManager = {
  /**
   * Initialize memo button bindings and load existing memos
   */
  init(elements) {
    const { addMemoRowBtn, removeMemoRowBtn, memoContent } = elements;
    const memoTableBody = document.getElementById('memoTableBody');

    if (!memoTableBody) return;

    const getSessionAndDate = () => {
        const selectedDate = CalendarManager.getSelectedDate();
        const dateKey = `${selectedDate.getFullYear()}-${selectedDate.getMonth()+1}-${selectedDate.getDate()}`;
        const sessionId = getSessionIdFromHash();
        return { sessionId, dateKey };
    };

    if (addMemoRowBtn) {
        addMemoRowBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (addMemoRowBtn.classList.contains('disabled') || memoContent.classList.contains('section-content-collapsed')) return;
            const nextIndex = memoTableBody.querySelectorAll('tr').length + 1;
            memoTableBody.appendChild(this.createMemoRow(nextIndex, '', memoTableBody, getSessionAndDate));
        });
    }

    if (removeMemoRowBtn) {
        removeMemoRowBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (removeMemoRowBtn.classList.contains('disabled') || memoContent.classList.contains('section-content-collapsed')) return;
            const rows = memoTableBody.querySelectorAll('tr');
            if (rows.length > 0) {
                memoTableBody.removeChild(rows[rows.length - 1]);
                this.saveMemos(memoTableBody, getSessionAndDate);
            }
        });
    }

    return this.initMemoRows(elements);
  },

  /**
   * Create a single memo row (table row with textarea)
   */
  createMemoRow(index, content, tableBody, getInfo) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="width: 32px; padding-top: 8px; text-align: center; color: rgba(31, 41, 55, 0.4); font-size: 13px; font-weight: 400; font-family: inherit; line-height: 1.4; border-right: 1px solid rgba(255,255,255,0.05);">${index}</td>
      <td>
        <textarea class="memo-input-flat" placeholder="메모를 입력하세요..." rows="1">${content}</textarea>
      </td>
    `;
    const textarea = tr.querySelector('textarea');
    const adjustHeight = (t) => {
        t.style.height = '1px';
        t.style.height = (t.scrollHeight) + 'px';
    };
    textarea.addEventListener('input', () => {
        adjustHeight(textarea);
        this.saveMemos(tableBody, getInfo);
    });
    setTimeout(() => adjustHeight(textarea), 0);
    return tr;
  },

  /**
   * Save all memos to backend (debounced)
   */
  saveMemos: debounce(async (tableBody, getInfo) => {
    const { sessionId, dateKey } = getInfo();
    const allMemos = Array.from(tableBody.querySelectorAll('textarea')).map(t => t.value).join('\n');
    await BackendHooks.saveMemo(sessionId, allMemos, dateKey);
    // Refresh calendar dots to show memo indicators
    if (CalendarManager && CalendarManager.refreshDots) {
      CalendarManager.refreshDots();
    }
    eventBus.emit(EVENTS.MEMO_UPDATED, { sessionId, dateKey, content: allMemos });
  }, 500),

  /**
   * Load and display memos for the selected date
   */
  async initMemoRows(elements) {
    const tableBody = document.getElementById('memoTableBody');
    if (!tableBody) return;

    const selectedDate = CalendarManager.getSelectedDate();
    const dateKey = `${selectedDate.getFullYear()}-${selectedDate.getMonth()+1}-${selectedDate.getDate()}`;
    const sessionId = getSessionIdFromHash();

    const getInfo = () => ({ sessionId, dateKey });

    try {
        const data = await BackendHooks.fetchMemo(sessionId, dateKey);
        tableBody.innerHTML = '';
        const savedContent = data.memo || '';
        if (savedContent) {
            const lines = savedContent.split('\n');
            lines.forEach((line, i) => tableBody.appendChild(this.createMemoRow(i + 1, line, tableBody, getInfo)));
        } else {
            for (let i = 1; i <= 3; i++) tableBody.appendChild(this.createMemoRow(i, '', tableBody, getInfo));
        }
    } catch (e) {
        console.error("Failed to load memo:", e);
        tableBody.innerHTML = '';
        for (let i = 1; i <= 3; i++) tableBody.appendChild(this.createMemoRow(i, '', tableBody, getInfo));
    }
  },

  /**
   * Refresh memo rows for current date (called after date selection)
   */
  async refresh(date) {
    return this.initMemoRows({});
  }
};
