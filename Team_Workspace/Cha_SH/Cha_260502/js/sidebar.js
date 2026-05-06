/**
 * sidebar.js
 * Facade wrapper that exports all sidebar functionality.
 */

import { SidebarBase }    from './managers/sidebar-base.js';
import { SidebarTabs }    from './managers/sidebar-tabs.js';
import { SidebarResizer } from './managers/sidebar-resizer.js';
import { SidebarFolding } from './managers/sidebar-folding.js';
import { MemoManager }    from './managers/memo-manager.js';
import { ScheduleManager } from './managers/schedule-manager.js';
import { initRightSidebarMarkerPanel } from './rightSidebarMarkerPanel.js';
import { initMapInfoResizer } from './mapHeightResizer.js';

let _markerPanel = null;
let _heightResizer = null;

function _initMarkerPanel() {
  const mapContainer = document.getElementById('kakaoMapContainer');
  if (!mapContainer || _markerPanel) return;
  _markerPanel = initRightSidebarMarkerPanel({ mapContainerEl: mapContainer });
}

function _initHeightResizer() {
  const mapContainer = document.getElementById('kakaoMapContainer');
  const dropdown = document.getElementById('rs-marker-dropdown');
  if (!mapContainer || !dropdown || _heightResizer) return;
  _heightResizer = initMapInfoResizer({ 
    mapContainerEl: mapContainer,
    dropdownEl: dropdown 
  });
}

function _initAll() {
  _initMarkerPanel();
  // 약간의 지연을 두고 리사이저 초기화 (dropdown DOM이 완전히 준비될 때까지)
  setTimeout(_initHeightResizer, 100);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _initAll);
} else {
  _initAll();
}

export const SidebarManager = {
  isMobile:           (...args) => SidebarBase.isMobile(...args),
  mobileSidebarMode:  (...args) => SidebarBase.mobileSidebarMode(...args),
  syncContentState:   (...args) => SidebarBase.syncContentState(...args),
  openSidebar:        (...args) => SidebarBase.openSidebar(...args),
  closeSidebar:       (...args) => SidebarBase.closeSidebar(...args),
  openRightSidebar:   (...args) => {
    _initMarkerPanel();
    setTimeout(_initHeightResizer, 100);
    return SidebarBase.openRightSidebar(...args);
  },
  closeRightSidebar:  (...args) => SidebarBase.closeRightSidebar(...args),
  initTabs:              (...args) => SidebarTabs.initTabs(...args),
  adjustAllMemoHeights:  (...args) => SidebarTabs.adjustAllMemoHeights(...args),
  initResizers:  (...args) => SidebarResizer.initResizers(...args),
  initFolding:  (...args) => SidebarFolding.initFolding(...args),
  initMemoRows:  (...args) => MemoManager.initMemoRows(...args),
  initScheduleRows:  (...args) => ScheduleManager.initScheduleRows(...args),
  destroyMarkerPanel()  { _markerPanel?.destroy(); _markerPanel = null; },
  destroyHeightResizer() { _heightResizer?.destroy(); _heightResizer = null; },
};
