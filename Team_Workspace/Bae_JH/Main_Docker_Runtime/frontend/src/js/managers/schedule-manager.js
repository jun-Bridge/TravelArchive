/**
 * schedule-manager.js
 * Manages schedule CRUD operations - creating, editing, saving, and loading schedule rows.
 */

import { BackendHooks } from '../api.js';
import { CalendarManager } from '../calendar.js';
import { debounce, getSessionIdFromHash } from '../utils.js';
import { eventBus, EVENTS } from '../core/event-bus.js';

export const ScheduleManager = {
  /**
   * Initialize schedule button bindings and load existing schedules
   */
  init(elements) {
    const { addScheduleRowBtn, removeScheduleRowBtn, scheduleContent } = elements;
    const scheduleTableBody = document.getElementById('scheduleTableBody');

    if (!scheduleTableBody) return;

    const getSessionAndDate = () => {
        const selectedDate = CalendarManager.getSelectedDate();
        const dateKey = `${selectedDate.getFullYear()}-${selectedDate.getMonth()+1}-${selectedDate.getDate()}`;
        const sessionId = getSessionIdFromHash();
        return { sessionId, dateKey };
    };

    if (addScheduleRowBtn) {
        addScheduleRowBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (addScheduleRowBtn.classList.contains('disabled') || scheduleContent.classList.contains('section-content-collapsed')) return;
            scheduleTableBody.appendChild(this.createScheduleRow('', '', scheduleTableBody, getSessionAndDate));
        });
    }

    if (removeScheduleRowBtn) {
        removeScheduleRowBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (removeScheduleRowBtn.classList.contains('disabled') || scheduleContent.classList.contains('section-content-collapsed')) return;
            const rows = scheduleTableBody.querySelectorAll('tr');
            if (rows.length > 0) {
                scheduleTableBody.removeChild(rows[rows.length - 1]);
                this.saveSchedules(scheduleTableBody, getSessionAndDate);
            }
        });
    }

    return this.initScheduleRows(elements);
  },

  /**
   * Create a single schedule row (table row with time and activity inputs)
   */
  createScheduleRow(time, activity, tableBody, getInfo) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="text" class="schedule-time-input" value="${time}" placeholder="0900" maxlength="4" style="width:100%; background:transparent; border:none; color:inherit; font:inherit; outline:none;"></td>
      <td><input type="text" value="${activity}" placeholder="활동 입력" style="width:100%; background:transparent; border:none; color:inherit; font:inherit; outline:none;"></td>
    `;

    const timeInput = tr.querySelector('.schedule-time-input');
    timeInput.addEventListener('input', (e) => {
      let val = e.target.value.replace(/[^0-9]/g, '');
      if (val.length > 4) val = val.substring(0, 4);
      e.target.value = val;
    });

    tr.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', () => {
            this.saveSchedules(tableBody, getInfo);
        });
    });
    return tr;
  },

  /**
   * Save all schedules to backend (debounced)
   */
  saveSchedules: debounce(async (tableBody, getInfo) => {
    const { sessionId, dateKey } = getInfo();
    const plan = Array.from(tableBody.querySelectorAll('tr')).map(row => {
        const inputs = row.querySelectorAll('input');
        if (inputs.length < 2) return null;
        return { time: inputs[0].value, activity: inputs[1].value };
    }).filter(p => p !== null);
    await BackendHooks.updateSchedule(sessionId, plan, dateKey);
    // Refresh calendar dots to show schedule indicators
    if (CalendarManager && CalendarManager.refreshDots) {
      CalendarManager.refreshDots();
    }
    eventBus.emit(EVENTS.SCHEDULE_UPDATED, { sessionId, dateKey, plan });
  }, 500),

  /**
   * Load and display schedules for the selected date
   */
  async initScheduleRows(elements) {
    const tableBody = document.getElementById('scheduleTableBody');
    if (!tableBody) return;

    const selectedDate = CalendarManager.getSelectedDate();
    const dateKey = `${selectedDate.getFullYear()}-${selectedDate.getMonth()+1}-${selectedDate.getDate()}`;
    const sessionId = getSessionIdFromHash();
    const getInfo = () => ({ sessionId, dateKey });

    try {
        const data = await BackendHooks.fetchSchedule(sessionId, dateKey);
        tableBody.innerHTML = '';
        const savedPlan = data.plan || [];
        if (savedPlan.length > 0) {
            savedPlan.forEach(p => tableBody.appendChild(this.createScheduleRow(p.time, p.activity, tableBody, getInfo)));
        } else {
            tableBody.appendChild(this.createScheduleRow('', '', tableBody, getInfo));
        }
    } catch (e) {
        console.error("Failed to load schedule:", e);
        tableBody.innerHTML = '';
    }
  },

  /**
   * Refresh schedule rows for current date (called after date selection)
   */
  async refresh(date) {
    return this.initScheduleRows({});
  }
};
