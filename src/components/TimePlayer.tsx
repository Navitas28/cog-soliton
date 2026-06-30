import { useEffect, useRef, useState } from 'react';
import { useNetworkStore } from '../store/networkStore';

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function TimePlayer() {
  const epsResult = useNetworkStore(s => s.epsResult);
  const epsTimeIndex = useNetworkStore(s => s.epsTimeIndex);
  const setEpsTimeIndex = useNetworkStore(s => s.setEpsTimeIndex);
  const [playing, setPlaying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (playing && epsResult) {
      intervalRef.current = setInterval(() => {
        const state = useNetworkStore.getState();
        const next = state.epsTimeIndex + 1;
        if (next >= (state.epsResult?.timestamps.length ?? 0)) {
          setPlaying(false);
        } else {
          state.setEpsTimeIndex(next);
        }
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing, epsResult]);

  if (!epsResult || epsResult.timestamps.length === 0) return null;

  const timestamps = epsResult.timestamps;
  const currentTime = timestamps[epsTimeIndex] ?? 0;

  const jumpToNow = () => {
    const nowHour = new Date().getHours();
    const targetSeconds = nowHour * 3600;
    let closest = 0;
    let minDiff = Infinity;
    for (let i = 0; i < timestamps.length; i++) {
      const diff = Math.abs(timestamps[i] - targetSeconds);
      if (diff < minDiff) { minDiff = diff; closest = i; }
    }
    setEpsTimeIndex(closest);
  };

  return (
    <div className="time-player">
      <button
        className="time-player-btn"
        onClick={() => setPlaying(!playing)}
        title={playing ? 'Pause' : 'Play'}
      >
        {playing ? '⏸' : '▶'}
      </button>
      <button className="time-player-btn" onClick={jumpToNow} title="Jump to now">
        Now
      </button>
      <span className="time-player-label">{formatTime(currentTime)}</span>
      <input
        type="range"
        className="time-player-slider"
        min={0}
        max={timestamps.length - 1}
        value={epsTimeIndex}
        onChange={e => setEpsTimeIndex(parseInt(e.target.value))}
      />
      <span className="time-player-label">
        {formatTime(timestamps[0])} — {formatTime(timestamps[timestamps.length - 1])}
      </span>
    </div>
  );
}
