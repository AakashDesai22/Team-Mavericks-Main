import { useState, useEffect } from 'react';
import api from '../../api/client';

const Icons = {
  Grid: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="3" x2="15" y2="21" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" />
    </svg>
  ),
  Save: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
    </svg>
  ),
  Info: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
  Spinner: (p) => (
    <svg {...p} className={`animate-spin ${p.className || ''}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  ),
  Warning: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  Trash: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  )
};

export default function SeatingGridConfigurator() {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  
  // Dimensions inputs
  const [rowCountInput, setRowCountInput] = useState(8);
  const [colCountInput, setColCountInput] = useState(10);
  
  // Active layout blueprint
  const [gridCells, setGridCells] = useState([]); // Array of { id?, row, col, type, reason? }
  const [actualRows, setActualRows] = useState([]);
  const [actualCols, setActualCols] = useState([]);
  
  // States
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Helper: map index (0-based) to letter (A, B, C...)
  const indexToLetter = (idx) => String.fromCharCode(65 + idx);
  // Helper: map letter (A, B, C...) to index (0-based)
  const letterToIndex = (letter) => letter.charCodeAt(0) - 65;

  // Load events
  useEffect(() => {
    async function loadEvents() {
      const res = await api.get('/events');
      if (res.ok && res.data?.success) {
        setEvents(res.data.events || []);
      }
    }
    loadEvents();
  }, []);

  // Fetch seating grid blueprint when Event is selected
  const fetchSeatingGrid = async (eventId) => {
    if (!eventId) {
      setGridCells([]);
      setActualRows([]);
      setActualCols([]);
      return;
    }
    
    setLoading(true);
    setFeedback(null);
    try {
      const res = await api.get('/seating/grid', { event_id: eventId });
      
      if (res.ok && res.data?.success) {
        const dbGrid = res.data.grid || [];
        if (dbGrid.length > 0) {
          // Blueprint exists! Determine rows and columns from DB coordinates
          const rowsSet = new Set();
          const colsSet = new Set();
          
          const mappedCells = dbGrid.map(cell => {
            rowsSet.add(cell.row_identifier);
            colsSet.add(cell.column_identifier);
            return {
              row: cell.row_identifier,
              col: cell.column_identifier,
              type: cell.cell_type, // 'Available' or 'Blocked'
              reason: cell.block_reason || ''
            };
          });

          // Sort rows alphabetically, cols numerically
          const sortedRows = Array.from(rowsSet).sort();
          const sortedCols = Array.from(colsSet).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

          setActualRows(sortedRows);
          setActualCols(sortedCols);
          setRowCountInput(sortedRows.length);
          setColCountInput(sortedCols.length);
          setGridCells(mappedCells);
          
          setFeedback({
            type: 'info',
            message: `Loaded existing blueprint configuration: ${res.data.summary.available_seats} Available seats and ${res.data.summary.blocked_cells} Blocked barriers.`
          });
        } else {
          // No grid defined yet. Proactively generate an empty base layout
          setGridCells([]);
          setActualRows([]);
          setActualCols([]);
          setFeedback({
            type: 'warning',
            message: 'No seating grid blueprint found for this event. Configure bounds below and click "Generate Base Layout".'
          });
        }
      } else {
        setFeedback({
          type: 'error',
          message: res.data?.error || 'Failed to fetch seating grid blueprint.'
        });
      }
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', message: 'An unexpected connection error occurred.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSeatingGrid(selectedEventId);
  }, [selectedEventId]);

  // Generates or overwrites the current grid layout with an empty slate of specified bounds
  const generateBaseLayout = () => {
    const rows = Math.min(12, Math.max(1, parseInt(rowCountInput, 10) || 1));
    const cols = Math.min(15, Math.max(1, parseInt(colCountInput, 10) || 1));
    
    // Set actual rows/cols lists
    const tempRows = Array.from({ length: rows }, (_, i) => indexToLetter(i));
    const tempCols = Array.from({ length: cols }, (_, i) => String(i + 1));
    
    setActualRows(tempRows);
    setActualCols(tempCols);

    // Build flat array representing rows x cols Available cells
    const newCells = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        newCells.push({
          row: indexToLetter(r),
          col: String(c + 1),
          type: 'Available',
          reason: ''
        });
      }
    }
    setGridCells(newCells);
    setFeedback({
      type: 'info',
      message: `Generated empty slate layout: ${rows} rows x ${cols} cols (${rows * cols} cells total). Interactive grids are ready for customization.`
    });
  };

  // Toggle cell type between Available and Blocked on click
  const toggleCell = (row, col) => {
    setGridCells(prev => 
      prev.map(cell => {
        if (cell.row === row && cell.col === col) {
          const nextType = cell.type === 'Available' ? 'Blocked' : 'Available';
          return {
            ...cell,
            type: nextType,
            reason: nextType === 'Blocked' ? 'Structural Pillar / Barrier' : ''
          };
        }
        return cell;
      })
    );
  };

  // Commit Grid Blueprint via POST /seating/grid
  const commitBlueprint = async () => {
    if (!selectedEventId) {
      setFeedback({ type: 'error', message: 'Please select an event target first.' });
      return;
    }
    if (gridCells.length === 0) {
      setFeedback({ type: 'error', message: 'The seating matrix is empty. Generate a base layout first.' });
      return;
    }

    setCommitting(true);
    setFeedback(null);

    try {
      const res = await api.post('/seating/grid', {
        event_id: parseInt(selectedEventId, 10),
        cells: gridCells
      });

      if (res.ok && res.data?.success) {
        setFeedback({
          type: 'success',
          message: `Blueprint committed successfully! Saved ${res.data.total_cells} cell bounds (${res.data.available} Available seats, ${res.data.blocked} Blocked barriers).`
        });
        // Reload fresh from server
        await fetchSeatingGrid(selectedEventId);
      } else {
        setFeedback({
          type: 'error',
          message: res.data?.error || 'Failed to commit grid blueprint.'
        });
      }
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', message: 'An unexpected connection error occurred while committing.' });
    } finally {
      setCommitting(false);
    }
  };

  // Stats summaries
  const totalCellsCount = gridCells.length;
  const availableCount = gridCells.filter(c => c.type === 'Available').length;
  const blockedCount = gridCells.filter(c => c.type === 'Blocked').length;

  return (
    <div className="space-y-6 animate-fade-in text-slate-100">
      
      {/* ── Page Header ── */}
      <div>
        <h1 className="section-header">Spatial Seating Layout Modeler</h1>
        <p className="text-slate-400 text-xs md:text-sm mt-1">
          Model event halls and room geometries. Tag structural pillars or barriers to exclude them from the matchmaking matching pipeline.
        </p>
      </div>

      {/* ── Settings Control & Configurations Box ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Dynamic configurations panel */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-card p-5 space-y-5">
            <h2 className="text-sm font-bold text-brand-300 uppercase tracking-widest pb-2 border-b border-white/[0.06]">
              Layout Parameters
            </h2>

            {/* Target Event Selection */}
            <div className="space-y-1.5">
              <label htmlFor="select-event" className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Target Event
              </label>
              <select
                id="select-event"
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-200 text-xs font-semibold focus:border-brand-500/60 focus:outline-none focus:ring-1 focus:ring-brand-500/25"
              >
                <option value="" disabled className="bg-surface-900">Select Event...</option>
                {events.map((evt) => (
                  <option key={evt.id} value={evt.id} className="bg-surface-900">
                    {evt.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Grid dimension boundaries inputs */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="row-bounds" className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Row Bounds (1-12)
                </label>
                <input
                  type="number"
                  id="row-bounds"
                  min="1"
                  max="12"
                  value={rowCountInput}
                  onChange={(e) => setRowCountInput(Math.min(12, Math.max(1, parseInt(e.target.value, 10) || 1)))}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-200 text-xs font-mono outline-none focus:border-brand-500/50 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="col-bounds" className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Col Bounds (1-15)
                </label>
                <input
                  type="number"
                  id="col-bounds"
                  min="1"
                  max="15"
                  value={colCountInput}
                  onChange={(e) => setColCountInput(Math.min(15, Math.max(1, parseInt(e.target.value, 10) || 1)))}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-200 text-xs font-mono outline-none focus:border-brand-500/50 transition"
                />
              </div>
            </div>

            {/* Base Generation button */}
            <button
              onClick={generateBaseLayout}
              disabled={!selectedEventId}
              className="btn-ghost w-full py-2.5 rounded-xl text-xs font-semibold hover:bg-white/10 transition-all flex items-center justify-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Icons.Grid className="w-4 h-4 text-brand-400" />
              Generate Base Layout
            </button>

            {/* Commit blueprint action */}
            <div className="pt-4 border-t border-white/[0.06]">
              <button
                onClick={commitBlueprint}
                disabled={committing || gridCells.length === 0}
                className="btn-primary w-full py-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {committing ? (
                  <>
                    <Icons.Spinner className="w-4 h-4 text-white" />
                    Commiting blueprint...
                  </>
                ) : (
                  <>
                    <Icons.Save className="w-4 h-4" />
                    Commit Grid Blueprint
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Guidelines info card */}
          <div className="glass-card p-4 text-xs text-slate-400 space-y-2">
            <span className="font-bold text-slate-300 flex items-center gap-1.5 mb-1.5 uppercase tracking-widest text-[10px]">
              <Icons.Info className="w-4 h-4 text-brand-400" />
              Geometric Guide
            </span>
            <ul className="list-disc pl-4 space-y-1.5">
              <li>Click on any cell block in the canvas workspace to cycle its type between Available and Blocked.</li>
              <li><strong className="text-slate-300">Available:</strong> Rendered as an indigo wireframe. Open for allocations.</li>
              <li><strong className="text-slate-300">Blocked:</strong> Highlighted in amber stripes. Reserved for structural barriers, camera runs, or sound desks.</li>
            </ul>
          </div>
        </div>

        {/* RIGHT COLUMN: Canvas Workspace Rendering */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Status feedback alerts */}
          {feedback && (
            <div className={`p-4 rounded-2xl border text-xs leading-normal flex gap-2.5 items-start animate-fade-in ${
              feedback.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
              feedback.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' :
              feedback.type === 'error' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
              'bg-blue-500/10 border-blue-500/20 text-blue-400'
            }`}>
              {feedback.type === 'warning' || feedback.type === 'error' ? (
                <Icons.Warning className="w-5 h-5 shrink-0" />
              ) : (
                <Icons.Info className="w-5 h-5 shrink-0" />
              )}
              <p className="flex-1">{feedback.message}</p>
            </div>
          )}

          {/* Grid canvas viewer */}
          <div className="glass-card p-6 flex flex-col gap-6 items-center min-h-[400px] justify-center relative overflow-hidden">
            {loading ? (
              <div className="space-y-3 text-center">
                <Icons.Spinner className="w-8 h-8 text-brand-400 mx-auto" />
                <p className="text-slate-400 text-xs font-semibold">Loading structural geometries...</p>
              </div>
            ) : gridCells.length > 0 ? (
              <div className="w-full space-y-6">
                
                {/* Stats badge header */}
                <div className="flex flex-wrap gap-4 items-center justify-between text-xs border-b border-white/[0.06] pb-4 px-1">
                  <span className="font-bold text-slate-300">Interactive Layout Sheet</span>
                  <div className="flex gap-3">
                    <span className="px-2.5 py-1 rounded bg-white/[0.04] border border-white/[0.06] font-medium text-slate-400">
                      Total Grid: <span className="font-mono text-slate-200">{totalCellsCount}</span>
                    </span>
                    <span className="px-2.5 py-1 rounded bg-indigo-500/10 border border-indigo-500/20 font-medium text-indigo-300">
                      Available: <span className="font-mono text-indigo-200">{availableCount}</span>
                    </span>
                    <span className="px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/20 font-medium text-amber-300">
                      Blocked: <span className="font-mono text-amber-200">{blockedCount}</span>
                    </span>
                  </div>
                </div>

                {/* The Map itself */}
                <div className="overflow-x-auto w-full max-w-full pb-4">
                  <div className="inline-block min-w-full align-middle">
                    <div 
                      className="grid gap-1.5 p-2 bg-black/25 rounded-2xl border border-white/[0.04] mx-auto select-none"
                      style={{
                        gridTemplateColumns: `auto repeat(${actualCols.length}, minmax(40px, 1fr))`,
                        width: 'max-content',
                        maxWidth: '100%'
                      }}
                    >
                      {/* Top-left empty buffer */}
                      <div className="w-8 h-8 flex items-center justify-center font-bold text-[10px] text-slate-600 font-mono">
                        R/C
                      </div>

                      {/* Columns Numbers Indicators Headers */}
                      {actualCols.map(col => (
                        <div key={`head-c-${col}`} className="h-8 flex items-center justify-center font-bold text-[11px] text-slate-500 font-mono">
                          {col}
                        </div>
                      ))}

                      {/* Rows Rows and Cells */}
                      {actualRows.map((row) => (
                        <>
                          {/* Left Letter Row Header */}
                          <div key={`head-r-${row}`} className="w-8 h-10 flex items-center justify-center font-bold text-[11px] text-slate-500 font-mono">
                            {row}
                          </div>

                          {/* Columns under Row */}
                          {actualCols.map((col) => {
                            const cell = gridCells.find(c => c.row === row && c.col === col);
                            const isBlocked = cell?.type === 'Blocked';

                            return (
                              <button
                                key={`cell-${row}-${col}`}
                                onClick={() => toggleCell(row, col)}
                                title={`${row}-${col}: ${cell?.type || 'Available'}`}
                                className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center transition-all duration-300 relative group font-mono text-[10px] ${
                                  isBlocked
                                    ? 'bg-gradient-to-br from-amber-500/20 to-yellow-600/10 border border-amber-500/40 text-amber-300 shadow-glow-rose/5 animate-pulse-slow'
                                    : 'bg-white/[0.01] border border-white/[0.08] hover:border-brand-500/50 hover:bg-brand-500/5 text-slate-400 hover:text-brand-300 hover:shadow-glow-sm'
                                }`}
                              >
                                {/* Diagonal Stripes pattern for Blocked cells */}
                                {isBlocked && (
                                  <div className="absolute inset-0 opacity-15 rounded-lg bg-dots pointer-events-none" />
                                )}
                                <span>{row}{col}</span>
                              </button>
                            );
                          })}
                        </>
                      ))}

                    </div>
                  </div>
                </div>

              </div>
            ) : (
              <div className="text-center p-12 space-y-4 max-w-sm text-slate-400">
                <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center mx-auto text-slate-500">
                  <Icons.Grid className="w-8 h-8 opacity-45" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-200">Layout Canvas Blank</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Select a target Event from the left panel and click "Generate Base Layout" or let the configurator fetch the saved layout configurations to customize cell assignments.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
