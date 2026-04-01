/**
 * settings.js
 */

export function renderSettingsPage(container) {
  container.innerHTML = `
      <div class="settings-group">
        <label class="settings-label" for="transparencySlider">배경 투명도 조절</label>
        <div class="slider-wrapper">
          <div class="slider-container">
            <span class="slider-hint">0%</span>
            <div class="range-with-ticks">
              <input type="range" id="transparencySlider" min="0" max="25" step="5" value="14">
              <div class="slider-ticks">
                <span></span><span></span><span></span><span></span><span></span><span></span>
              </div>
            </div>
            <span class="slider-hint">25%</span>
          </div>
        </div>
        <p class="settings-description">패널의 투명도를 0%에서 25% 사이로 조절합니다. (5% 단위 고정)</p>
      </div>

      <div class="settings-group">
        <label class="settings-label">시스템 설정</label>
        <p class="help-answer">여기에 나중에 다양한 설정 옵션이 추가될 예정입니다.</p>
      </div>
    </div>
  `;

  const slider = container.querySelector('#transparencySlider');
  if (slider) {
    const savedOpacity = localStorage.getItem('appGlassOpacity') || '14';
    slider.value = savedOpacity;
    document.documentElement.style.setProperty('--app-glass-opacity', savedOpacity / 100);

    slider.addEventListener('input', (e) => {
      const val = e.target.value;
      document.documentElement.style.setProperty('--app-glass-opacity', val / 100);
      localStorage.setItem('appGlassOpacity', val);
    });
  }
}
