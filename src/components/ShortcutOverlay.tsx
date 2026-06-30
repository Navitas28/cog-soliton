/**
 * Keyboard shortcut overlay — press ? to toggle.
 */

interface ShortcutOverlayProps {
  onClose: () => void;
}

const SHORTCUTS = [
  { key: 'S', action: 'Select tool' },
  { key: 'R', action: 'Place reservoir' },
  { key: 'J', action: 'Place junction' },
  { key: 'T', action: 'Place tank' },
  { key: 'P', action: 'Draw pipe' },
  { key: 'U', action: 'Draw pump' },
  { key: 'V', action: 'Draw valve' },
  { key: 'Delete', action: 'Delete selected element' },
  { key: 'Escape', action: 'Deselect / cancel drawing' },
  { key: '⌘Z / Ctrl+Z', action: 'Undo' },
  { key: '⌘⇧Z / Ctrl+Y', action: 'Redo' },
  { key: '/', action: 'Search nodes & pipes' },
  { key: '?', action: 'Toggle this overlay' },
];

export function ShortcutOverlay({ onClose }: ShortcutOverlayProps) {
  return (
    <div className="shortcut-overlay-backdrop" onClick={onClose}>
      <div className="shortcut-overlay" onClick={e => e.stopPropagation()}>
        <div className="shortcut-overlay-header">
          <span style={{ fontWeight: 700, fontSize: 15 }}>Keyboard Shortcuts</span>
          <button className="shortcut-overlay-close" onClick={onClose}>×</button>
        </div>
        <table className="shortcut-table">
          <tbody>
            {SHORTCUTS.map(s => (
              <tr key={s.key}>
                <td className="shortcut-key"><kbd>{s.key}</kbd></td>
                <td className="shortcut-action">{s.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
