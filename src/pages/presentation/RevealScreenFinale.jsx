import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import confetti from 'canvas-confetti';

const Icons = {
  Close: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Trophy: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34" /><path d="M12 2a6 6 0 0 1 6 6v5a6 6 0 0 1-6 6 6 6 0 0 1-6-6V8a6 6 0 0 1 6-6z" />
    </svg>
  )
};

export default function RevealScreenFinale({ champions = [], grandChampion, onClose }) {
  // Phase triggers: 'idle' (waiting for Spacebar), 'relay' (accumulating), 'whiteout' (suspense), 'climax' (final bounce)
  const [phase, setPhase] = useState('idle');
  
  // Refs
  const containerRef = useRef(null);
  const whiteoutRef = useRef(null);
  const grandChampRef = useRef(null);
  const goldFlashRef = useRef(null);
  
  // Setup card references array dynamically
  const cardRefs = useRef([]);
  cardRefs.current = [];
  
  const addToRefs = (el) => {
    if (el && !cardRefs.current.includes(el)) {
      cardRefs.current.push(el);
    }
  };

  // Sound triggers
  const audioDroneRef = useRef(null);
  const audioSlamRef = useRef(null);

  // Initialize local audio players to guarantee robust execution
  useEffect(() => {
    audioDroneRef.current = new Audio('/api/uploads/suspense_drone.mp3');
    audioDroneRef.current.loop = true;
    audioSlamRef.current = new Audio('/api/uploads/impact_slam.mp3');

    // FOUC Prevention: set initial states to fully invisible
    gsap.set(cardRefs.current, { opacity: 0, visibility: 'hidden', y: 100 });
    gsap.set(whiteoutRef.current, { opacity: 0, display: 'none' });
    gsap.set(grandChampRef.current, { opacity: 0, scale: 0.1, y: -200 });
    gsap.set(goldFlashRef.current, { opacity: 0, display: 'none' });
  }, []);

  // Keyboard spacebar listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && phase === 'idle') {
        e.preventDefault();
        startRelayTimeline();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [phase]);

  const startRelayTimeline = () => {
    setPhase('relay');
    
    // Play tension background drone
    if (audioDroneRef.current) {
      try {
        audioDroneRef.current.volume = 0.35;
        audioDroneRef.current.play().catch(e => console.log('Drone blocked:', e));
      } catch (err) {
        console.warn(err);
      }
    }

    const masterTl = gsap.timeline({
      onComplete: () => {
        triggerWhiteoutSuspense();
      }
    });

    // Staggered Relay Chain Math
    // We animate card indices 0 -> 4 one by one.
    champions.forEach((_, idx) => {
      const card = cardRefs.current[idx];
      if (!card) return;

      // 1. Reveal card i centered at full scale 1.0x
      masterTl.addLabel(`card-${idx}`);
      
      masterTl.set(card, { visibility: 'visible' })
              .to(card, {
                opacity: 1,
                y: 0,
                scale: 1.0,
                duration: 0.8,
                ease: 'back.out(1.4)'
              });

      // Pause briefly for applause and focus on this champion
      masterTl.to({}, { duration: 1.6 });

      // 2. Shift all cards leftward and scale older cards down to 0.75x
      if (idx < champions.length - 1) {
        masterTl.add(() => {
          // For all currently active cards up to index i, shift leftward
          for (let k = 0; k <= idx; k++) {
            const currentCard = cardRefs.current[k];
            // Final horizontal positions for 5 cards side by side:
            // Centered layout. Let's calculate x offset:
            // For card index k, final offset = (k - (idx + 1) / 2) * 230 px
            const targetX = (k - (idx + 1) / 2) * 230;
            
            gsap.to(currentCard, {
              x: targetX,
              scale: 0.75,
              duration: 0.8,
              ease: 'power2.inOut'
            });
          }
        });
        
        // Brief spacing buffer before next card enters
        masterTl.to({}, { duration: 0.5 });
      } else {
        // After the final card slides in, shift all 5 cards into their final symmetrical side-by-side row
        masterTl.add(() => {
          for (let k = 0; k < champions.length; k++) {
            const currentCard = cardRefs.current[k];
            // Final positions for all 5 cards lined up:
            // k: 0 -> x = -460, k: 1 -> x = -230, k: 2 -> x = 0, k: 3 -> x = 230, k: 4 -> x = 460
            const targetX = (k - 2) * 230;
            gsap.to(currentCard, {
              x: targetX,
              scale: 0.72,
              duration: 0.9,
              ease: 'power2.inOut'
            });
          }
        });
        
        // Hold row and stretch tension
        masterTl.to({}, { duration: 3.2 });
      }
    });
  };

  // 3. The 7-Second Stark White-Out Climax Hold
  const triggerWhiteoutSuspense = () => {
    setPhase('whiteout');

    // Wipe audio instantly into absolute dead silence
    if (audioDroneRef.current) {
      audioDroneRef.current.pause();
    }

    // Fast stark transition into total empty white canvas
    gsap.set(whiteoutRef.current, { display: 'block' });
    gsap.to(whiteoutRef.current, {
      opacity: 1,
      duration: 0.25,
      ease: 'power1.out',
      onComplete: () => {
        // Stretch dead silence for exactly 7.0 seconds to build extreme suspense
        setTimeout(() => {
          triggerGoldenImpact();
        }, 7000);
      }
    });
  };

  // 4. The Golden Impact slam climax
  const triggerGoldenImpact = () => {
    setPhase('climax');

    // Play massive slam sound
    if (audioSlamRef.current) {
      try {
        audioSlamRef.current.currentTime = 0;
        audioSlamRef.current.volume = 1.0;
        audioSlamRef.current.play().catch(e => console.log('Audio play blocked:', e));
      } catch (err) {
        console.warn(err);
      }
    }

    // A. Fire Golden flash overlay
    gsap.set(goldFlashRef.current, { display: 'block', opacity: 1 });
    gsap.to(goldFlashRef.current, {
      opacity: 0,
      duration: 1.8,
      ease: 'power2.out',
      onComplete: () => {
        gsap.set(goldFlashRef.current, { display: 'none' });
      }
    });

    // Fade whiteout back so background particles show
    gsap.to(whiteoutRef.current, { opacity: 0.15, duration: 1.0 });

    // B. Slam Grand Champion profile card with heavy bounce physics
    gsap.to(grandChampRef.current, {
      opacity: 1,
      scale: 1,
      y: 0,
      duration: 1.4,
      ease: 'bounce.out'
    });

    // C. Fire Dual Confetti gold cannons simultaneously
    triggerDualGoldCannons();
  };

  const triggerDualGoldCannons = () => {
    const goldPalette = ['#fbbf24', '#f59e0b', '#d97706', '#fffbeb', '#fcd34d'];
    
    // Left Cannon
    confetti({
      particleCount: 160,
      spread: 90,
      origin: { x: 0, y: 1 },
      colors: goldPalette,
      angle: 45
    });

    // Right Cannon
    confetti({
      particleCount: 160,
      spread: 90,
      origin: { x: 1, y: 1 },
      colors: goldPalette,
      angle: 135
    });

    // Add another slow falling shower in the center after a delay
    setTimeout(() => {
      confetti({
        particleCount: 80,
        spread: 120,
        origin: { x: 0.5, y: 0.2 },
        colors: goldPalette,
        gravity: 0.65,
        scalar: 1.2
      });
    }, 450);
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-gradient-to-br from-amber-50 via-stone-100 to-amber-50 select-none flex flex-col items-center justify-center overflow-hidden"
    >
      
      {/* Dynamic Floating Champagne Gold Specks particle elements */}
      <div className="absolute inset-0 pointer-events-none opacity-45 bg-dots animate-pulse-slow" />
      
      {/* Floating particles elements */}
      <div className="absolute w-2 h-2 rounded-full bg-amber-400/35 top-1/4 left-1/4 animate-bounce" style={{ animationDuration: '4s' }} />
      <div className="absolute w-3 h-3 rounded-full bg-amber-400/25 top-2/3 left-1/3 animate-bounce" style={{ animationDuration: '6s' }} />
      <div className="absolute w-1.5 h-1.5 rounded-full bg-amber-400/40 top-1/3 right-1/4 animate-bounce" style={{ animationDuration: '5s' }} />
      <div className="absolute w-2.5 h-2.5 rounded-full bg-amber-400/20 top-3/4 right-1/3 animate-bounce" style={{ animationDuration: '7s' }} />

      {/* Exit presenter view */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 p-3 rounded-full bg-black/5 hover:bg-black/10 border border-black/10 text-slate-500 hover:text-slate-900 transition-all z-50 shadow-md"
        aria-label="Exit presentations stage view"
      >
        <Icons.Close className="w-5 h-5" />
      </button>

      {/* ── Screen Stage Header ── */}
      {phase !== 'whiteout' && phase !== 'climax' && (
        <div className="absolute top-12 text-center space-y-1 z-10">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-600">
            Bodhantra OS • Series Finale
          </span>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">
            The Hall of Champions
          </h2>
        </div>
      )}

      {/* ── Staggered Champions accumulation horizontal row ── */}
      {phase !== 'whiteout' && phase !== 'climax' && (
        <div className="relative w-full max-w-5xl h-[380px] flex items-center justify-center">
          
          {/* Waiting/Idle launch prompt */}
          {phase === 'idle' && (
            <div className="text-center space-y-4 animate-fade-in z-20">
              <div className="text-2xl font-black text-amber-500/80 tracking-widest uppercase">
                ALL SYSTEMS STAGED
              </div>
              <button
                onClick={startRelayTimeline}
                className="text-[10px] font-bold text-slate-700 bg-white border border-slate-200 shadow-xl rounded-full px-5 py-3 inline-flex items-center gap-1.5 animate-bounce hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
              >
                <Icons.Trophy className="w-3.5 h-3.5 text-amber-500" />
                PRESS [SPACEBAR] TO CONCLUDE THE SERIES
              </button>
            </div>
          )}

          {/* Symmetrical cards row rendering */}
          {champions.map((champ, idx) => (
            <div
              key={champ.allocation_id}
              ref={addToRefs}
              className="absolute w-52 p-4 bg-white/90 border border-amber-300/40 rounded-2xl shadow-xl flex flex-col justify-between items-center text-center shrink-0"
              style={{
                height: '280px',
                // Stack cards at center initially
                transform: 'translateY(100px)',
                boxShadow: '0 20px 40px -10px rgba(139, 92, 26, 0.12)'
              }}
            >
              {/* Badge Number indicator */}
              <span className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-xs font-black text-amber-600 font-mono">
                {idx + 1}
              </span>

              {/* Profile icon */}
              <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center text-slate-400">
                <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
                </svg>
              </div>

              {/* Champion identity */}
              <div className="space-y-1">
                <h4 className="font-black text-slate-800 text-sm tracking-tight leading-tight select-all truncate max-w-[180px]">
                  {champ.name}
                </h4>
                <span className="text-[10px] font-bold font-mono text-slate-400 select-all block">
                  {champ.unique_registration_id}
                </span>
                <span className="text-[9px] font-bold text-amber-600 uppercase tracking-widest mt-0.5 block">
                  {champ.branch}
                </span>
              </div>

              {/* Seat marker */}
              <div className="px-3 py-0.5 rounded bg-stone-100 text-[10px] font-mono text-slate-500 border border-stone-200">
                Seat {champ.row_coordinate}-{champ.column_coordinate}
              </div>
            </div>
          ))}

        </div>
      )}

      {/* ── THE 7-SECOND Suspense Stark White-Out ── */}
      <div
        ref={whiteoutRef}
        className="fixed inset-0 z-35 bg-white pointer-events-none"
      />

      {/* ── THE CLIMAX Grand Champion of the Series Card ── */}
      <div
        ref={grandChampRef}
        className="absolute w-[440px] p-6 bg-gradient-to-br from-amber-400 via-yellow-300 to-amber-500 border-8 border-white text-slate-900 shadow-2xl flex flex-col items-center text-center rounded-none z-40 select-text"
        style={{
          boxShadow: '0 35px 70px -15px rgba(120, 80, 20, 0.4)'
        }}
      >
        <div className="w-16 h-16 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-white mb-2 shadow-inner">
          <Icons.Trophy className="w-9 h-9 fill-current" />
        </div>

        <span className="text-[10px] font-black tracking-[0.35em] text-amber-950 uppercase">
          CHAMPION OF THE SERIES
        </span>

        {/* Identity Profile Details */}
        <div className="bg-white p-5 w-full mt-4 space-y-4 text-left border border-amber-300">
          <div className="border-b border-stone-100 pb-3 text-center">
            <h3 className="text-2xl font-black text-slate-800 tracking-tight select-all leading-tight">
              {grandChampion?.name || 'CHAMPION IDENTITY'}
            </h3>
            <span className="font-mono text-xs font-bold text-slate-400 mt-1 select-all block">
              {grandChampion?.unique_registration_id}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <span className="text-[8px] text-slate-400 font-bold block uppercase tracking-wider">Academic Branch</span>
              <span className="font-black text-slate-700 leading-snug">{grandChampion?.branch || 'CSE'}</span>
            </div>
            <div>
              <span className="text-[8px] text-slate-400 font-bold block uppercase tracking-wider">Hall coordinates</span>
              <span className="font-black text-slate-700 leading-snug select-all">
                Seat {grandChampion?.row_coordinate || 'A'}-{grandChampion?.column_coordinate || '1'}
              </span>
            </div>
          </div>

          <div className="text-center pt-2">
            <span className="px-4 py-1.5 rounded bg-amber-500/10 border border-amber-500/20 text-[10px] font-black text-amber-700 uppercase tracking-widest inline-block select-all shadow-inner">
              Group: {grandChampion?.team_name || 'SYNDICATE ONE'}
            </span>
          </div>
        </div>

        <span className="text-[8px] text-amber-950/60 font-mono tracking-widest mt-4 uppercase">
          Bodhantra OS • Con concluded Series
        </span>
      </div>

      {/* Golden explosive flash overlay */}
      <div
        ref={goldFlashRef}
        className="fixed inset-0 z-45 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-300 pointer-events-none"
      />

    </div>
  );
}
