/**
 * schedule.js
 * handles rendering and logic for the travel schedule/itinerary.
 */

export const ScheduleManager = {
  render(container) {
    if (!container) return;

    container.innerHTML = `
      <table class="schedule-table">
        <thead>
          <tr>
            <th>시간</th>
            <th>장소/내용</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>10:00</td>
            <td>공항 도착</td>
          </tr>
          <tr>
            <td>12:30</td>
            <td>점심 식사 (로컬 맛집)</td>
          </tr>
          <tr>
            <td>15:00</td>
            <td>호텔 체크인</td>
          </tr>
          <tr>
            <td>17:00</td>
            <td>주변 산책</td>
          </tr>
          <tr>
            <td>19:00</td>
            <td>저녁 식사</td>
          </tr>
        </tbody>
      </table>
    `;
  }
};
