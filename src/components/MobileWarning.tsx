import { useState } from 'react';

export function MobileWarning() {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem('soliton-mobile-dismissed') === '1'
  );

  if (dismissed) return null;

  return (
    <div className="mobile-warning">
      <div style={{ fontSize: 24, marginBottom: 8 }}>&#x1F4BB;</div>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>Desktop Recommended</div>
      <div style={{ fontSize: 12, color: '#8a8a9e', marginBottom: 12, lineHeight: 1.4 }}>
        This tool requires a desktop browser for drawing tools and map interactions.
      </div>
      <button
        onClick={() => { setDismissed(true); localStorage.setItem('soliton-mobile-dismissed', '1'); }}
        style={{
          padding: '6px 16px', border: '1px solid #3a5fcf', borderRadius: 6,
          background: '#3a5fcf', color: '#fff', cursor: 'pointer', fontSize: 12,
        }}
      >Continue anyway</button>
    </div>
  );
}
