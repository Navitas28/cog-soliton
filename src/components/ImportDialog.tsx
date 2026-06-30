/**
 * GIS Import Dialog — drag-and-drop GeoJSON/Shapefile import with attribute mapping.
 */
import { useState, useCallback, useRef } from 'react';
import { useNetworkStore } from '../store/networkStore';
import { importGeoJSON, autoDetectMapping, type AttributeMapping } from '../import/gisImporter';
import type { NetworkModel } from '../model/types';
import { createEmptyNetwork } from '../model/types';

interface ImportDialogProps {
  onClose: () => void;
}

type ImportStep = 'upload' | 'mapping' | 'result';

export function ImportDialog({ onClose }: ImportDialogProps) {
  const loadModel = useNetworkStore(s => s.loadModel);
  const model = useNetworkStore(s => s.model);

  const [step, setStep] = useState<ImportStep>('upload');
  const [geojson, setGeojson] = useState<GeoJSON.FeatureCollection | null>(null);
  const [fileName, setFileName] = useState('');
  const [columns, setColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState<AttributeMapping>({});
  const [importResult, setImportResult] = useState<{
    junctionCount: number; pipeCount: number; warnings: string[];
  } | null>(null);
  const [error, setError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('replace');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse uploaded file
  const handleFile = useCallback(async (file: File) => {
    setError('');
    const name = file.name.toLowerCase();

    if (name.endsWith('.geojson') || name.endsWith('.json')) {
      try {
        const text = await file.text();
        const parsed = JSON.parse(text) as GeoJSON.FeatureCollection;
        if (parsed.type !== 'FeatureCollection' || !Array.isArray(parsed.features)) {
          setError('Invalid GeoJSON: must be a FeatureCollection');
          return;
        }
        setGeojson(parsed);
        setFileName(file.name);

        // Extract columns from first feature
        const firstProps = parsed.features.find(f => f.properties)?.properties || {};
        const cols = Object.keys(firstProps);
        setColumns(cols);

        // Auto-detect mapping
        const detected = autoDetectMapping(firstProps);
        setMapping(detected);
        setStep('mapping');
      } catch (e) {
        setError(`Failed to parse JSON: ${e instanceof Error ? e.message : String(e)}`);
      }
    } else {
      setError('Unsupported file format. Please use .geojson or .json files.');
    }
  }, []);

  // Drag-and-drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  // Mapping field options
  const mappingFields: { key: keyof AttributeMapping; label: string; forType: 'pipe' | 'node' | 'both' }[] = [
    { key: 'pipeId', label: 'Pipe ID', forType: 'pipe' },
    { key: 'diameter', label: 'Diameter (mm)', forType: 'pipe' },
    { key: 'roughness', label: 'Roughness (C)', forType: 'pipe' },
    { key: 'length', label: 'Length (m)', forType: 'pipe' },
    { key: 'material', label: 'Material', forType: 'pipe' },
    { key: 'nodeId', label: 'Node ID', forType: 'node' },
    { key: 'elevation', label: 'Elevation (m)', forType: 'node' },
    { key: 'demand', label: 'Base Demand (LPS)', forType: 'node' },
  ];

  // Execute import
  const doImport = useCallback(() => {
    if (!geojson) return;

    const result = importGeoJSON(geojson, mapping, model.designCriteria.defaultRoughness);

    if (importMode === 'replace') {
      const newModel: NetworkModel = {
        ...createEmptyNetwork(fileName.replace(/\.(geo)?json$/i, '')),
        junctions: result.junctions,
        pipes: result.pipes,
        patterns: model.patterns,
        options: model.options,
        designCriteria: model.designCriteria,
      };
      loadModel(newModel);
    } else {
      // Merge into existing model
      const newModel: NetworkModel = {
        ...model,
        junctions: [...model.junctions, ...result.junctions],
        pipes: [...model.pipes, ...result.pipes],
      };
      loadModel(newModel);
    }

    setImportResult({
      junctionCount: result.summary.junctionCount,
      pipeCount: result.summary.pipeCount,
      warnings: result.warnings,
    });
    setStep('result');
  }, [geojson, mapping, model, importMode, loadModel, fileName]);

  return (
    <div className="chart-modal-backdrop" onClick={onClose}>
      <div className="import-dialog" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="import-dialog-header">
          <div>
            <h3>Import Network Data</h3>
            <span className="chart-modal-subtitle">
              {step === 'upload' && 'GeoJSON file import'}
              {step === 'mapping' && `Mapping attributes — ${fileName}`}
              {step === 'result' && 'Import complete'}
            </span>
          </div>
          <button className="chart-modal-close" onClick={onClose}>&times;</button>
        </div>

        {/* Step indicator */}
        <div className="import-steps">
          {['Upload', 'Map Attributes', 'Done'].map((label, i) => {
            const stepNames: ImportStep[] = ['upload', 'mapping', 'result'];
            const isActive = stepNames.indexOf(step) >= i;
            return (
              <div key={label} className={`import-step ${isActive ? 'active' : ''}`}>
                <div className="import-step-num">{i + 1}</div>
                <span>{label}</span>
              </div>
            );
          })}
        </div>

        {/* Upload step */}
        {step === 'upload' && (
          <div className="import-body">
            <div
              className={`import-dropzone ${isDragOver ? 'dragover' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="import-dropzone-icon">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <path d="M24 8v24M24 8l-8 8M24 8l8 8M8 36v4h32v-4" stroke="#3a5fcf" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p className="import-dropzone-title">Drop GeoJSON file here</p>
              <p className="import-dropzone-sub">or click to browse</p>
              <div className="import-dropzone-formats">
                <span className="import-format-badge">.geojson</span>
                <span className="import-format-badge">.json</span>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".geojson,.json"
              style={{ display: 'none' }}
              onChange={handleFileInput}
            />
            {error && <div className="import-error">{error}</div>}

            <div className="import-help">
              <h4>Supported Data</h4>
              <ul>
                <li><strong>LineString</strong> features → Pipes (auto-creates junction nodes at endpoints)</li>
                <li><strong>Point</strong> features → Junctions (with elevation, demand from attributes)</li>
                <li>Coordinates must be in WGS84 (EPSG:4326)</li>
                <li>Pipe length auto-calculated from coordinates via haversine</li>
              </ul>
            </div>
          </div>
        )}

        {/* Mapping step */}
        {step === 'mapping' && (
          <div className="import-body">
            <div className="import-preview-bar">
              <span>{geojson?.features.length ?? 0} features found</span>
              <span>{columns.length} attribute columns</span>
            </div>

            <div className="import-mode-toggle">
              <label className={`import-mode-opt ${importMode === 'replace' ? 'active' : ''}`}>
                <input type="radio" name="mode" checked={importMode === 'replace'}
                  onChange={() => setImportMode('replace')} />
                Replace current network
              </label>
              <label className={`import-mode-opt ${importMode === 'merge' ? 'active' : ''}`}>
                <input type="radio" name="mode" checked={importMode === 'merge'}
                  onChange={() => setImportMode('merge')} />
                Merge into existing
              </label>
            </div>

            <div className="import-mapping-grid">
              <div className="import-mapping-header">
                <span>Soliton Field</span>
                <span>Source Column</span>
              </div>
              {mappingFields.map(field => (
                <div key={field.key} className="import-mapping-row">
                  <span className="import-mapping-label">
                    {field.label}
                    <span className="import-mapping-type">{field.forType}</span>
                  </span>
                  <select
                    className="import-mapping-select"
                    value={mapping[field.key] || ''}
                    onChange={e => setMapping({ ...mapping, [field.key]: e.target.value || undefined })}
                  >
                    <option value="">— not mapped —</option>
                    {columns.map(col => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                  {mapping[field.key] && <span className="import-mapping-check">&#10003;</span>}
                </div>
              ))}
            </div>

            <div className="import-actions">
              <button className="import-back-btn" onClick={() => setStep('upload')}>
                Back
              </button>
              <button className="import-go-btn" onClick={doImport}>
                Import {geojson?.features.length ?? 0} Features
              </button>
            </div>
          </div>
        )}

        {/* Result step */}
        {step === 'result' && importResult && (
          <div className="import-body">
            <div className="import-success">
              <div className="import-success-icon">&#10003;</div>
              <h3>Import Successful</h3>
              <div className="import-success-stats">
                <div className="import-success-stat">
                  <span className="import-success-num">{importResult.junctionCount}</span>
                  <span>Junctions</span>
                </div>
                <div className="import-success-stat">
                  <span className="import-success-num">{importResult.pipeCount}</span>
                  <span>Pipes</span>
                </div>
              </div>
              {importResult.warnings.length > 0 && (
                <div className="import-warnings">
                  {importResult.warnings.map((w, i) => (
                    <div key={i} className="import-warning">{w}</div>
                  ))}
                </div>
              )}
              <p className="import-success-hint">
                Click <strong>Compute</strong> to run hydraulic analysis on imported network.
              </p>
            </div>
            <div className="import-actions">
              <button className="import-go-btn" onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
