/**
 * Interactive time series chart for EPS results.
 * Shows pressure/flow/velocity over 24hr simulation with CPHEEO threshold lines.
 * Supports multi-node overlay comparison.
 */
import { useCallback, useRef, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
  ResponsiveContainer, Area, AreaChart, Legend,
} from 'recharts';
import { useNetworkStore } from '../store/networkStore';
import {
  extractNodeSeries, extractLinkSeries, computeSeriesStats, formatTime,
  type TimeSeriesPoint, type NodeSeriesParam, type LinkSeriesParam,
} from '../model/timeSeries';

/* ─── Types ─── */

interface ChartConfig {
  elementId: string;
  elementType: 'node' | 'link';
  param: NodeSeriesParam | LinkSeriesParam;
  label: string;
  unit: string;
  thresholdValue?: number;
  thresholdLabel?: string;
}

interface TimeSeriesModalProps {
  config: ChartConfig;
  onClose: () => void;
  /** Additional element IDs to overlay (same param) */
  compareIds?: string[];
}

/* ─── Chart colors ─── */

const CHART_COLORS = [
  '#3a5fcf', '#e85d75', '#2ecc71', '#f39c12', '#9b59b6',
  '#1abc9c', '#e74c3c', '#3498db', '#e67e22', '#8e44ad',
];

/* ─── Sparkline (inline mini chart for PropertiesPanel) ─── */

export function Sparkline({ data, threshold, color = '#3a5fcf' }: {
  data: TimeSeriesPoint[];
  threshold?: number;
  color?: string;
}) {
  if (data.length < 2) return null;

  const stats = computeSeriesStats(data);
  const padding = (stats.max - stats.min) * 0.1 || 1;
  const yMin = stats.min - padding;
  const yMax = stats.max + padding;

  return (
    <div className="sparkline-container">
      <ResponsiveContainer width="100%" height={48}>
        <AreaChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <defs>
            <linearGradient id={`spark-grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#spark-grad-${color.replace('#', '')})`}
            dot={false}
            isAnimationActive={false}
          />
          {threshold !== undefined && (
            <ReferenceLine y={threshold} stroke="#e85d75" strokeDasharray="3 3" strokeWidth={1} />
          )}
          <YAxis domain={[yMin, yMax]} hide />
          <XAxis dataKey="time" hide />
        </AreaChart>
      </ResponsiveContainer>
      <div className="sparkline-stats">
        <span className="sparkline-stat">
          <span className="sparkline-stat-label">Min</span>
          <span className="sparkline-stat-value">{stats.min.toFixed(1)}</span>
        </span>
        <span className="sparkline-stat">
          <span className="sparkline-stat-label">Avg</span>
          <span className="sparkline-stat-value">{stats.avg.toFixed(1)}</span>
        </span>
        <span className="sparkline-stat">
          <span className="sparkline-stat-label">Max</span>
          <span className="sparkline-stat-value">{stats.max.toFixed(1)}</span>
        </span>
      </div>
    </div>
  );
}

/* ─── Full Chart Modal ─── */

export function TimeSeriesModal({ config, onClose, compareIds = [] }: TimeSeriesModalProps) {
  const epsResult = useNetworkStore(s => s.epsResult);
  const designCriteria = useNetworkStore(s => s.model.designCriteria);
  const chartRef = useRef<HTMLDivElement>(null);
  const [selectedParam, setSelectedParam] = useState<string>(config.param);

  // Build series for primary element
  const allIds = [config.elementId, ...compareIds];

  const nodeParams: { key: NodeSeriesParam; label: string; unit: string }[] = [
    { key: 'pressure', label: 'Pressure', unit: 'm' },
    { key: 'head', label: 'Head', unit: 'm' },
    { key: 'demand', label: 'Demand', unit: 'LPS' },
    { key: 'tankLevel', label: 'Tank Level', unit: 'm' },
  ];

  const linkParams: { key: LinkSeriesParam; label: string; unit: string }[] = [
    { key: 'flow', label: 'Flow', unit: 'LPS' },
    { key: 'velocity', label: 'Velocity', unit: 'm/s' },
    { key: 'headloss', label: 'Head Loss', unit: 'm/km' },
  ];

  const paramOptions = config.elementType === 'node' ? nodeParams : linkParams;
  const activeParam = paramOptions.find(p => p.key === selectedParam) || paramOptions[0];

  // Extract data for all IDs
  const seriesMap: Record<string, TimeSeriesPoint[]> = {};
  if (epsResult) {
    for (const id of allIds) {
      if (config.elementType === 'node') {
        seriesMap[id] = extractNodeSeries(epsResult, id, activeParam.key as NodeSeriesParam);
      } else {
        seriesMap[id] = extractLinkSeries(epsResult, id, activeParam.key as LinkSeriesParam);
      }
    }
  }

  // Merge all series into a single dataset for recharts (keyed by ID)
  const mergedData: Record<string, unknown>[] = [];
  const primarySeries = seriesMap[config.elementId] || [];

  if (primarySeries.length > 0) {
    for (let i = 0; i < primarySeries.length; i++) {
      const row: Record<string, unknown> = {
        time: primarySeries[i].time,
        timeLabel: formatTime(primarySeries[i].time),
      };
      for (const id of allIds) {
        const s = seriesMap[id];
        if (s && s[i]) row[id] = s[i].value;
      }
      mergedData.push(row);
    }
  }

  // Threshold
  let threshold: number | undefined;
  let thresholdLabel = '';
  if (activeParam.key === 'pressure') {
    threshold = designCriteria.residualPressureFloor;
    thresholdLabel = `CPHEEO Min (${threshold}m)`;
  } else if (activeParam.key === 'velocity') {
    // Show both min and max
    threshold = undefined; // handled separately
  }

  // Stats for primary
  const primaryStats = computeSeriesStats(primarySeries);

  // Export chart as PNG
  const handleExport = useCallback(() => {
    if (!chartRef.current) return;
    const svg = chartRef.current.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width * 2;
      canvas.height = img.height * 2;
      if (ctx) {
        ctx.scale(2, 2);
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      }
      const link = document.createElement('a');
      link.download = `${config.elementId}_${activeParam.key}_timeseries.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  }, [config.elementId, activeParam.key]);

  if (!epsResult) {
    return (
      <div className="chart-modal-backdrop" onClick={onClose}>
        <div className="chart-modal" onClick={e => e.stopPropagation()}>
          <div className="chart-modal-header">
            <h3>Time Series — {config.elementId}</h3>
            <button className="chart-modal-close" onClick={onClose}>&times;</button>
          </div>
          <div className="chart-empty-state">
            <p>No EPS results available.</p>
            <p>Set simulation mode to "24-hour EPS" in Scenario Settings, then click Compute.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chart-modal-backdrop" onClick={onClose}>
      <div className="chart-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="chart-modal-header">
          <div>
            <h3>Time Series — {config.elementId}</h3>
            <span className="chart-modal-subtitle">
              {config.elementType === 'node' ? 'Node' : 'Link'} · {activeParam.label} ({activeParam.unit})
            </span>
          </div>
          <div className="chart-modal-actions">
            <button className="chart-export-btn" onClick={handleExport} title="Export as PNG">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 1v9M8 10L5 7M8 10l3-3M2 12v2h12v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              PNG
            </button>
            <button className="chart-modal-close" onClick={onClose}>&times;</button>
          </div>
        </div>

        {/* Param selector tabs */}
        <div className="chart-param-tabs">
          {paramOptions.map(p => (
            <button
              key={p.key}
              className={`chart-param-tab ${selectedParam === p.key ? 'active' : ''}`}
              onClick={() => setSelectedParam(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Stats bar */}
        <div className="chart-stats-bar">
          <div className="chart-stat">
            <span className="chart-stat-label">Min</span>
            <span className="chart-stat-value">{primaryStats.min.toFixed(2)} {activeParam.unit}</span>
            <span className="chart-stat-time">@ {formatTime(primaryStats.minTime)}</span>
          </div>
          <div className="chart-stat">
            <span className="chart-stat-label">Avg</span>
            <span className="chart-stat-value">{primaryStats.avg.toFixed(2)} {activeParam.unit}</span>
          </div>
          <div className="chart-stat">
            <span className="chart-stat-label">Max</span>
            <span className="chart-stat-value">{primaryStats.max.toFixed(2)} {activeParam.unit}</span>
            <span className="chart-stat-time">@ {formatTime(primaryStats.maxTime)}</span>
          </div>
          {threshold !== undefined && (
            <div className="chart-stat chart-stat-threshold">
              <span className="chart-stat-label">Threshold</span>
              <span className="chart-stat-value">{threshold.toFixed(1)} {activeParam.unit}</span>
            </div>
          )}
        </div>

        {/* Chart */}
        <div className="chart-area" ref={chartRef}>
          <ResponsiveContainer width="100%" height={360}>
            {allIds.length === 1 ? (
              <AreaChart data={mergedData} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3a5fcf" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#3a5fcf" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis
                  dataKey="timeLabel"
                  tick={{ fontSize: 11, fill: '#888' }}
                  tickLine={{ stroke: '#ddd' }}
                  axisLine={{ stroke: '#ddd' }}
                  label={{ value: 'Time (HH:MM)', position: 'bottom', offset: 5, fontSize: 11, fill: '#999' }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#888' }}
                  tickLine={{ stroke: '#ddd' }}
                  axisLine={{ stroke: '#ddd' }}
                  label={{ value: `${activeParam.label} (${activeParam.unit})`, angle: -90, position: 'insideLeft', offset: -5, fontSize: 11, fill: '#999' }}
                />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(255,255,255,0.96)',
                    border: '1px solid #e0e0e0',
                    borderRadius: 8,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                    fontSize: 12,
                  }}
                  formatter={(value: unknown) => [`${Number(value).toFixed(2)} ${activeParam.unit}`, activeParam.label]}
                  labelFormatter={(label: unknown) => `Time: ${label}`}
                />
                <Area
                  type="monotone"
                  dataKey={config.elementId}
                  stroke="#3a5fcf"
                  strokeWidth={2.5}
                  fill="url(#chartGradient)"
                  dot={false}
                  activeDot={{ r: 5, fill: '#3a5fcf', stroke: '#fff', strokeWidth: 2 }}
                />
                {threshold !== undefined && (
                  <ReferenceLine
                    y={threshold}
                    stroke="#e85d75"
                    strokeDasharray="6 4"
                    strokeWidth={1.5}
                    label={{
                      value: thresholdLabel,
                      position: 'right',
                      fill: '#e85d75',
                      fontSize: 11,
                    }}
                  />
                )}
                {activeParam.key === 'velocity' && (
                  <>
                    <ReferenceLine
                      y={designCriteria.velocityMin}
                      stroke="#e85d75"
                      strokeDasharray="6 4"
                      strokeWidth={1}
                      label={{ value: `Min (${designCriteria.velocityMin})`, position: 'right', fill: '#e85d75', fontSize: 10 }}
                    />
                    <ReferenceLine
                      y={designCriteria.velocityMax}
                      stroke="#e85d75"
                      strokeDasharray="6 4"
                      strokeWidth={1}
                      label={{ value: `Max (${designCriteria.velocityMax})`, position: 'right', fill: '#e85d75', fontSize: 10 }}
                    />
                  </>
                )}
              </AreaChart>
            ) : (
              <LineChart data={mergedData} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis
                  dataKey="timeLabel"
                  tick={{ fontSize: 11, fill: '#888' }}
                  label={{ value: 'Time (HH:MM)', position: 'bottom', offset: 5, fontSize: 11, fill: '#999' }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#888' }}
                  label={{ value: `${activeParam.label} (${activeParam.unit})`, angle: -90, position: 'insideLeft', offset: -5, fontSize: 11, fill: '#999' }}
                />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(255,255,255,0.96)',
                    border: '1px solid #e0e0e0',
                    borderRadius: 8,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                    fontSize: 12,
                  }}
                  formatter={(value: unknown, name: unknown) => [`${Number(value).toFixed(2)} ${activeParam.unit}`, String(name)]}
                  labelFormatter={(label: unknown) => `Time: ${label}`}
                />
                <Legend />
                {allIds.map((id, i) => (
                  <Line
                    key={id}
                    type="monotone"
                    dataKey={id}
                    stroke={CHART_COLORS[i % CHART_COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 2 }}
                  />
                ))}
                {threshold !== undefined && (
                  <ReferenceLine
                    y={threshold}
                    stroke="#e85d75"
                    strokeDasharray="6 4"
                    strokeWidth={1.5}
                    label={{ value: thresholdLabel, position: 'right', fill: '#e85d75', fontSize: 11 }}
                  />
                )}
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
