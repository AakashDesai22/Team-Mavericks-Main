import { useState, useEffect, useRef } from 'react';
import api from '../../api/client';
import RevealScreenNoir from './RevealScreenNoir';
import RevealScreenFinale from './RevealScreenFinale';

const Icons = {
  Presentation: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h20" /><path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3" /><path d="M12 16v4" /><path d="M8 20h8" />
    </svg>
  ),
  Play: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  ),
  Volume: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  ),
  Spinner: (p) => (
    <svg {...p} className={`animate-spin ${p.className || ''}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  ),
  Info: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  )
};

export default function PresentationHub() {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [allocations, setAllocations] = useState([]);
  const [loadingAllocations, setLoadingAllocations] = useState(false);
  
  // Presentation setups
  const [selectedTheme, setSelectedTheme] = useState('Noir'); // 'Noir' or 'Finale'
  const [countdown, setCountdown] = useState(6); // Countdown suspense window in seconds
  
  // Noir selection
  const [noirWinnerId, setNoirWinnerId] = useState('');
  
  // Finale selections (5 daily champions + 1 Grand series champion)
  const [finaleWinners, setFinaleWinners] = useState(['', '', '', '', '']);
  const [grandChampionId, setGrandChampionId] = useState('');
  
  // Active live state
  const [isLive, setIsLive] = useState(false);
  
  // Audio pre-warmed refs
  const audioDroneRef = useRef(null);
  const audioSlamRef = useRef(null);

  // Load events
  useEffect(() => {
    async function loadEvents() {
      const res = await api.get('/events');
      if (res.ok && res.data?.success) {
        setEvents(res.data.events || []);
        if (res.data.events?.length > 0) {
          setSelectedEventId(res.data.events[0].id);
        }
      }
    }
    loadEvents();
  }, []);

  // Load event allocations on select
  useEffect(() => {
    if (!selectedEventId) return;
    
    async function loadAllocations() {
      setLoadingAllocations(true);
      const res = await api.get(`/allocations/event/${selectedEventId}`);
      if (res.ok && res.data?.success) {
        const list = res.data.total > 0 ? Object.values(res.data.teams).flat() : [];
        // Filter out unassigned placeholders
        const assignedList = list.filter(m => m.team_name !== '__UNASSIGNED__' && m.team_name !== '__PENDING__');
        setAllocations(assignedList);
        
        // Auto-populate default winners
        if (assignedList.length > 0) {
          setNoirWinnerId(assignedList[0].user_id);
          
          // Populate up to 5 champions
          const defaults = ['', '', '', '', ''];
          for (let i = 0; i < Math.min(5, assignedList.length); i++) {
            defaults[i] = assignedList[i].user_id;
          }
          setFinaleWinners(defaults);
          
          // Grand champion defaults to the last one or another
          setGrandChampionId(assignedList[assignedList.length - 1]?.user_id || '');
        } else {
          setNoirWinnerId('');
          setFinaleWinners(['', '', '', '', '']);
          setGrandChampionId('');
        }
      } else {
        setAllocations([]);
      }
      setLoadingAllocations(false);
    }
    loadAllocations();
  }, [selectedEventId]);

  // Clean and monitor fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        // Exit presentation state
        setIsLive(false);
        stopAllAudio();
      }
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Pre-warms and initializes audio stream contexts from the server (bypassing strict autoplay bypass checks)
  const preWarmAudio = () => {
    // If refs don't exist, build them
    if (!audioDroneRef.current) {
      // Relative server uploads path or fallback standard drone audio links
      audioDroneRef.current = new Audio('/api/uploads/suspense_drone.mp3');
      audioDroneRef.current.loop = true;
    }
    if (!audioSlamRef.current) {
      audioSlamRef.current = new Audio('/api/uploads/impact_slam.mp3');
    }

    // Force preloading and immediate play/pause inside user thread
    try {
      audioDroneRef.current.load();
      audioSlamRef.current.load();
      
      // Warm up by playing at 0 volume and instantly pausing
      audioDroneRef.current.volume = 0;
      audioSlamRef.current.volume = 0;
      
      const p1 = audioDroneRef.current.play();
      const p2 = audioSlamRef.current.play();
      
      Promise.all([p1, p2])
        .then(() => {
          audioDroneRef.current.pause();
          audioSlamRef.current.pause();
          // Reset volumes to full standard settings for execution trigger
          audioDroneRef.current.volume = 0.5;
          audioSlamRef.current.volume = 0.9;
        })
        .catch(err => console.log('Audio context warning (expected on sandbox):', err));
    } catch (e) {
      console.warn('Audio pre-warming error:', e);
    }
  };

  const stopAllAudio = () => {
    try {
      if (audioDroneRef.current) {
        audioDroneRef.current.pause();
        audioDroneRef.current.currentTime = 0;
      }
      if (audioSlamRef.current) {
        audioSlamRef.current.pause();
        audioSlamRef.current.currentTime = 0;
      }
    } catch (e) {
      console.log('Audio stop error:', e);
    }
  };

  // Launch Presentation Handler
  const launchPresentation = async () => {
    // 1. Programmatically trigger fullscreen on document element
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (err) {
      console.error('Fullscreen access denied:', err);
      alert('Fullscreen request denied. Please launch inside a standard browser context.');
      return;
    }

    // 2. Pre-load and pre-warm audio
    preWarmAudio();

    // 3. Mount stage viewport overlay
    setIsLive(true);
  };

  // Close live presentation callback
  const handleCloseStage = async () => {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch (e) {
      // Already exited fullscreen
    }
    setIsLive(false);
    stopAllAudio();
  };

  // Get active winner payloads based on theme selection
  const getWinnerPayload = () => {
    if (selectedTheme === 'Noir') {
      return allocations.find(m => m.user_id === parseInt(noirWinnerId, 10)) || null;
    } else {
      // Map 5 champions
      const champions = finaleWinners.map(id => 
        allocations.find(m => m.user_id === parseInt(id, 10)) || null
      ).filter(Boolean);
      
      const grandChampion = allocations.find(m => m.user_id === parseInt(grandChampionId, 10)) || null;
      
      return {
        champions,
        grandChampion
      };
    }
  };

  const activePayload = getWinnerPayload();

  // Render full screen theater overlay if active
  if (isLive) {
    if (selectedTheme === 'Noir') {
      return (
        <RevealScreenNoir
          target={activePayload}
          countdownSeconds={countdown}
          audioDrone={audioDroneRef.current}
          audioSlam={audioSlamRef.current}
          onClose={handleCloseStage}
        />
      );
    } else {
      return (
        <RevealScreenFinale
          champions={activePayload.champions}
          grandChampion={activePayload.grandChampion}
          onClose={handleCloseStage}
        />
      );
    }
  }

  return (
    <div className="space-y-6 animate-fade-in text-slate-100 max-w-4xl mx-auto">
      
      {/* ── Page Header ── */}
      <div>
        <h1 className="section-header">Stage Presentation Hub</h1>
        <p className="text-slate-400 text-xs md:text-sm mt-1">
          The stage laptop controller. Pre-warms audio buffers, locks fullscreen, and launches theatrical reveal projection overlays on the venue's big screens.
        </p>
      </div>

      {/* ── Setup Configuration Form ── */}
      <div className="glass-card p-6 grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch relative overflow-hidden">
        {/* Glowing badge indicator decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Configurations Controls (md:col-span-8) */}
        <div className="md:col-span-8 space-y-6">
          <h2 className="text-xs font-bold text-brand-300 uppercase tracking-widest pb-2 border-b border-white/[0.06] flex items-center gap-2">
            <Icons.Presentation className="w-4.5 h-4.5" />
            Stage Director Setup
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Selected Event Context */}
            <div className="space-y-1.5">
              <label htmlFor="stage-event" className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block">
                Active Event Context
              </label>
              <select
                id="stage-event"
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-200 text-xs font-semibold focus:border-brand-500/60 focus:outline-none"
              >
                <option value="" disabled className="bg-surface-900">Select Event...</option>
                {events.map((evt) => (
                  <option key={evt.id} value={evt.id} className="bg-surface-900">
                    {evt.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Visual Cinematic Theme selection */}
            <div className="space-y-1.5">
              <label htmlFor="stage-theme" className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block">
                Cinematic Theme
              </label>
              <select
                id="stage-theme"
                value={selectedTheme}
                onChange={(e) => setSelectedTheme(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-200 text-xs font-semibold focus:border-brand-500/60 focus:outline-none"
              >
                <option value="Noir" className="bg-surface-900">Noir Detective (Daily Mystery)</option>
                <option value="Finale" className="bg-surface-900">Series Finale (Hall of Champions)</option>
              </select>
            </div>
          </div>

          {/* Conditional target selections */}
          {loadingAllocations ? (
            <div className="p-8 text-center space-y-3 bg-white/[0.01] rounded-2xl border border-white/[0.04]">
              <Icons.Spinner className="w-6 h-6 text-brand-400 mx-auto" />
              <p className="text-slate-500 text-[11px] uppercase tracking-widest font-semibold animate-pulse">
                Fetching allocations registry...
              </p>
            </div>
          ) : allocations.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.01] text-xs text-slate-500">
              No allocated participants found for this event. Execute the logistics matchmaking pipeline first to prepare winners.
            </div>
          ) : (
            <div className="space-y-6 pt-4 border-t border-white/[0.04]">
              
              {/* NOIR THEME SETUP (Single Winner) */}
              {selectedTheme === 'Noir' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                  <div className="md:col-span-2 space-y-1.5">
                    <label htmlFor="noir-winner" className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block">
                      Target Winner Participant
                    </label>
                    <select
                      id="noir-winner"
                      value={noirWinnerId}
                      onChange={(e) => setNoirWinnerId(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-200 text-xs font-semibold focus:border-brand-500/60 focus:outline-none"
                    >
                      {allocations.map((m) => (
                        <option key={m.user_id} value={m.user_id} className="bg-surface-900">
                          {m.name} ({m.team_name} — {m.unique_registration_id})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Countdown suspense duration input */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label htmlFor="countdown-suspense" className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        Suspense Timer
                      </label>
                      <span className="text-xs font-bold text-brand-300 font-mono">{countdown}s</span>
                    </div>
                    <input
                      id="countdown-suspense"
                      type="range"
                      min="3"
                      max="15"
                      value={countdown}
                      onChange={(e) => setCountdown(parseInt(e.target.value, 10))}
                      className="w-full h-1.5 bg-white/[0.08] rounded-lg appearance-none cursor-pointer accent-brand-500"
                    />
                  </div>
                </div>
              )}

              {/* FINALE THEME SETUP (5 Champions + Grand Winner) */}
              {selectedTheme === 'Finale' && (
                <div className="space-y-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block">
                    Champions Lineup Selection
                  </span>
                  
                  {/* The 5 Champions select list */}
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    {finaleWinners.map((val, idx) => (
                      <div key={`champ-${idx}`} className="space-y-1.5">
                        <label className="text-[9px] font-bold uppercase text-slate-600 block">
                          Day {idx + 1} Champ
                        </label>
                        <select
                          value={val}
                          onChange={(e) => {
                            const newVals = [...finaleWinners];
                            newVals[idx] = e.target.value;
                            setFinaleWinners(newVals);
                          }}
                          className="w-full px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-slate-200 text-[10px] focus:border-brand-500/50 focus:outline-none"
                        >
                          <option value="" className="bg-surface-900">None</option>
                          {allocations.map((m) => (
                            <option key={m.user_id} value={m.user_id} className="bg-surface-900">
                              {m.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>

                  {/* The final Series Grand champion */}
                  <div className="space-y-1.5 pt-2 max-w-md">
                    <label htmlFor="grand-champ" className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block">
                      🏆 Grand Champion of the Series
                    </label>
                    <select
                      id="grand-champ"
                      value={grandChampionId}
                      onChange={(e) => setGrandChampionId(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-bold focus:border-brand-500/60 focus:outline-none"
                    >
                      <option value="" className="bg-surface-900">Select Grand Champion...</option>
                      {allocations.map((m) => (
                        <option key={m.user_id} value={m.user_id} className="bg-surface-900">
                          {m.name} ({m.unique_registration_id})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

            </div>
          )}
        </div>

        {/* Launch Panel (md:col-span-4) */}
        <div className="md:col-span-4 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 flex flex-col justify-between items-center text-center">
          <div className="space-y-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-600 to-violet-600 flex items-center justify-center mx-auto text-white shadow-glow-sm">
              <Icons.Volume className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-200 text-xs uppercase tracking-widest">
              Projector Sync
            </h3>
            <p className="text-[11px] text-slate-500 leading-normal">
              Stage audio sequences (`suspense_drone.mp3` & `impact_slam.mp3`) pre-load instantly on launching screen contexts to comply with sandbox rules.
            </p>
          </div>

          {/* Setup Action */}
          <button
            onClick={launchPresentation}
            disabled={
              allocations.length === 0 || 
              (selectedTheme === 'Noir' && !noirWinnerId) ||
              (selectedTheme === 'Finale' && (!grandChampionId || finaleWinners.filter(Boolean).length === 0))
            }
            className="btn-primary w-full py-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed select-none mt-6"
          >
            <Icons.Play className="w-4 h-4 fill-current" />
            Launch Live Engine
          </button>
        </div>

      </div>

      {/* ── Guidelines Info ── */}
      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] text-xs text-slate-400 flex gap-2.5 items-start">
        <Icons.Info className="w-5 h-5 text-brand-400 shrink-0" />
        <div>
          <span className="font-bold text-slate-300 block mb-1 uppercase tracking-widest text-[10px]">
            Stage Operator Guidelines
          </span>
          <ul className="list-disc pl-4 space-y-1 mt-1 leading-normal">
            <li>Ensure the laptop sound output is connected to the venue main audio systems before launch.</li>
            <li>Press <strong className="text-slate-300">[SPACEBAR]</strong> on the screen to trigger the decryption scrambler timeline sequence.</li>
            <li>Press <strong className="text-slate-300">[ESC]</strong> to exit full-screen mode instantly and close the stage.</li>
          </ul>
        </div>
      </div>

    </div>
  );
}
