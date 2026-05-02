const COMPACT_BREAKPOINT        = 480;
const COMPACT_HEIGHT_BREAKPOINT = 340;

export function applyLayout(container, panel, zoomWrap, zoomCtrl) {
  const { width: w, height: h } = container.getBoundingClientRect();
  const isCompact = w < COMPACT_BREAKPOINT || h < COMPACT_HEIGHT_BREAKPOINT;

  if (isCompact) {
    Object.assign(panel.style, {
      flexDirection: 'row',
      flexWrap:      'nowrap',
      top:           'auto',
      right:         'auto',
      bottom:        '14px',
      left:          '50%',
      transform:     'translateX(-50%)',
      borderRadius:  '40px',
      padding:       '6px 10px',
    });
    zoomWrap.style.flexDirection = 'row';
    const track = zoomWrap.querySelector('.oc-bar-track');
    if (track) Object.assign(track.style, { width: '36px', height: '3px' });
    panel.querySelectorAll('.oc-section-label').forEach(l => { l.style.display = 'none'; });
    const sep = panel.querySelector('.oc-sep');
    if (sep) Object.assign(sep.style, { width: '1px', height: '22px', margin: '0 4px' });
    panel.querySelectorAll('.oc-btn').forEach(b => {
      Object.assign(b.style, { width: '34px', height: '34px', borderRadius: '50%' });
    });
  } else {
    Object.assign(panel.style, {
      flexDirection: 'column',
      top:           '50%',
      right:         '14px',
      bottom:        'auto',
      left:          'auto',
      transform:     'translateY(-50%)',
      borderRadius:  '16px',
      padding:       '10px 8px',
    });
    zoomWrap.style.flexDirection = 'column';
    const track = zoomWrap.querySelector('.oc-bar-track');
    if (track) Object.assign(track.style, { width: '3px', height: '36px' });
    panel.querySelectorAll('.oc-section-label').forEach(l => { l.style.display = ''; });
    const sep = panel.querySelector('.oc-sep');
    if (sep) Object.assign(sep.style, { width: '28px', height: '1px', margin: '4px 0' });
    panel.querySelectorAll('.oc-btn').forEach(b => {
      Object.assign(b.style, { width: '38px', height: '38px', borderRadius: '10px' });
    });
  }

  zoomCtrl.setCompact(isCompact);
}

export function bindResponsive(container, panel, zoomWrap, zoomCtrl) {
  const run = () => applyLayout(container, panel, zoomWrap, zoomCtrl);
  const ro  = new ResizeObserver(run);
  ro.observe(container);
  run();
  return () => ro.disconnect();
}
