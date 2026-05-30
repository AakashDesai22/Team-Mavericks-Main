import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';

const Icons = {
  Close: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Warning: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
};

export default function RevealScreenNoir({ target, countdownSeconds = 6, audioDrone, audioSlam, onClose }) {
  // Reveal execution phases: 'idle' (scanning), 'decrypting', 'climax' (Polaroid dropped)
  const [phase, setPhase] = useState('idle');
  const [timerText, setTimerText] = useState(String(countdownSeconds));
  
  // Decrypted values displayed on screen
  const [scrambledCode, setScrambledCode] = useState('');
  const [scrambledName, setScrambledName] = useState('');
  
  // Refs
  const containerRef = useRef(null);
  const magnifierRef = useRef(null);
  const flashOverlayRef = useRef(null);
  const polaroidRef = useRef(null);
  const redStringsRef = useRef(null);
  
  // Sound controls
  const dronePlayRef = useRef(false);

  // Character sets for the scramble decryption
  const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';

  // 1. Trigger Continuous Erratic Magnifier Sweep Loop on Mount
  useEffect(() => {
    if (!magnifierRef.current) return;
    
    // Start continuous loop
    let magnifierCtx = gsap.context(() => {
      runMagnifierErraticWander();
    });

    // Start background suspense drone if provided
    if (audioDrone && !dronePlayRef.current) {
      try {
        audioDrone.currentTime = 0;
        audioDrone.volume = 0.4;
        audioDrone.play().catch(e => console.log('Drone blocked:', e));
        dronePlayRef.current = true;
      } catch (err) {
        console.warn(err);
      }
    }

    return () => {
      magnifierCtx.revert();
    };
  }, []);

  const runMagnifierErraticWander = () => {
    if (!magnifierRef.current || phase !== 'idle') return;
    
    const container = containerRef.current;
    if (!container) return;

    const w = container.clientWidth - 150;
    const h = container.clientHeight - 150;

    // Pick random erratic points
    const targetX = Math.random() * w - w / 2;
    const targetY = Math.random() * h - h / 2;
    const randRot = Math.random() * 360;
    const randScale = 0.8 + Math.random() * 0.4; // 0.8x to 1.2x
    const randDuration = 1.8 + Math.random() * 2; // 1.8s to 3.8s

    gsap.to(magnifierRef.current, {
      x: targetX,
      y: targetY,
      rotation: randRot,
      scale: randScale,
      duration: randDuration,
      ease: 'power1.inOut',
      onComplete: runMagnifierErraticWander
    });
  };

  // 2. Keyboard Intercept Spacebar to launch decryption timeline
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && phase === 'idle') {
        e.preventDefault();
        startDecryptionTimeline();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [phase]);

  // 3. Scrambled Text Decryption routine
  const startDecryptionTimeline = () => {
    setPhase('decrypting');

    // Instantly kill magnifier wanders and snap to exact center
    gsap.killTweensOf(magnifierRef.current);
    
    // Animate magnifier lens snap to center
    gsap.to(magnifierRef.current, {
      x: 0,
      y: -20,
      rotation: 0,
      scale: 1.5,
      duration: 0.8,
      ease: 'back.out(1.2)'
    });

    // Pulse red string maps to highlight tension
    if (redStringsRef.current) {
      gsap.to(redStringsRef.current, {
        opacity: 0.6,
        strokeDashoffset: -100,
        duration: 2,
        repeat: -1,
        ease: 'none'
      });
    }

    // Set countdown timers and scrambling intervals
    const targetCode = target?.unique_registration_id || 'BODH2026-X8R9TQ';
    const targetName = target?.name?.toUpperCase() || 'AGENT CONFIDENTIAL';
    
    let currentSeconds = countdownSeconds;
    const totalSteps = countdownSeconds * 60; // 60 updates per second
    let currentStep = 0;

    const interval = setInterval(() => {
      currentStep++;
      
      // Calculate fraction of completion
      const fraction = currentStep / totalSteps;
      
      // Resolve code characters left-to-right based on fraction
      const resolvedCodeLength = Math.floor(targetCode.length * fraction);
      let tempCode = '';
      for (let i = 0; i < targetCode.length; i++) {
        if (i < resolvedCodeLength) {
          tempCode += targetCode[i];
        } else {
          // Shuffle remaining characters
          tempCode += SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
        }
      }
      setScrambledCode(tempCode);

      // Resolve name characters left-to-right
      const resolvedNameLength = Math.floor(targetName.length * fraction);
      let tempName = '';
      for (let i = 0; i < targetName.length; i++) {
        if (i < resolvedNameLength) {
          tempName += targetName[i];
        } else {
          if (targetName[i] === ' ') {
            tempName += ' ';
          } else {
            tempName += SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
          }
        }
      }
      setScrambledName(tempName);

      // Update ticking countdown seconds text
      const remainingSeconds = Math.max(0, countdownSeconds - Math.floor(currentStep / 60));
      setTimerText(String(remainingSeconds));

      // 4. Climax Trigger
      if (currentStep >= totalSteps) {
        clearInterval(interval);
        triggerClimaxSequence();
      }
    }, 1000 / 60);
  };

  const triggerClimaxSequence = () => {
    setPhase('climax');
    
    // Stop backing audio loop drone
    if (audioDrone) {
      audioDrone.pause();
    }

    // Fire impact sound
    if (audioSlam) {
      try {
        audioSlam.currentTime = 0;
        audioSlam.play().catch(e => console.log('Impact blocked:', e));
      } catch (err) {
        console.warn(err);
      }
    }

    // A. Shaking Lightning Flash
    const tl = gsap.timeline();
    // Lightning white-out rapid flashes
    tl.to(flashOverlayRef.current, { opacity: 0.95, duration: 0.05 })
      .to(flashOverlayRef.current, { opacity: 0, duration: 0.1 })
      .to(flashOverlayRef.current, { opacity: 0.7, duration: 0.04 })
      .to(flashOverlayRef.current, { opacity: 0, duration: 0.15 });

    // Hard Container screen shaking physical impact
    gsap.to(containerRef.current, {
      x: () => `random(-12, 12)`,
      y: () => `random(-12, 12)`,
      duration: 0.04,
      repeat: 12,
      yoyo: true,
      onComplete: () => {
        // Reset container positions
        gsap.set(containerRef.current, { x: 0, y: 0 });
      }
    });

    // B. Drop Polaroid Photo Card with elastic back overshoot easing
    gsap.set(polaroidRef.current, { opacity: 1, scale: 0.3, rotation: -35 });
    gsap.to(polaroidRef.current, {
      scale: 1,
      rotation: -1 + Math.random() * 2, // Slight organic rotation tilt
      duration: 1.1,
      ease: 'back.out(1.7)'
    });
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-slate-950 overflow-hidden font-mono flex flex-col items-center justify-center select-none"
      style={{
        backgroundImage: 'radial-gradient(circle, rgba(15,23,42,0.6) 0%, rgba(2,6,17,0.95) 100%)'
      }}
    >
      {/* Gritty evidence table board texture background representation */}
      <div 
        className="absolute inset-0 bg-cover bg-center mix-blend-overlay opacity-30 bg-dots pointer-events-none"
        style={{
          backgroundImage: `url('/Murderbg.jpg')`
        }}
      />

      {/* Grid coordinates layout sheet lines overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-20 border border-white/[0.03]" />

      {/* Interactive Red Strings Evidence Lines Pinned connections */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-25" ref={redStringsRef}>
        <path
          d="M 100 100 L 400 300 L 900 150 L 1200 600 L 200 700 Z M 400 300 L 1200 600"
          fill="none"
          stroke="#f43f5e"
          strokeWidth="2.5"
          strokeDasharray="8 6"
        />
        {/* String pins */}
        <circle cx="100" cy="100" r="5" fill="#f43f5e" />
        <circle cx="400" cy="300" r="5" fill="#f43f5e" />
        <circle cx="900" cy="150" r="5" fill="#f43f5e" />
        <circle cx="1200" cy="600" r="5" fill="#f43f5e" />
        <circle cx="200" cy="700" r="5" fill="#f43f5e" />
      </svg>

      {/* Close button stage exit */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 p-3 rounded-full bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 hover:scale-105 active:scale-95 transition-all z-50 shadow-2xl"
        aria-label="Exit full screen presenter view"
      >
        <Icons.Close className="w-5 h-5" />
      </button>

      {/* ── Continuous Scanning Magnifier Engine Lens ── */}
      <div
        ref={magnifierRef}
        className="absolute w-64 h-64 rounded-full border-4 border-slate-700/80 shadow-2xl bg-slate-900/30 backdrop-blur-[3px] flex items-center justify-center pointer-events-none z-10 shrink-0"
        style={{
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), inset 0 0 40px rgba(99, 102, 241, 0.15)'
        }}
      >
        {/* Inner glass crosshair lens overlays */}
        <div className="absolute inset-4 rounded-full border border-dashed border-white/10" />
        <div className="w-px h-8 bg-brand-500/40 absolute" />
        <div className="h-px w-8 bg-brand-500/40 absolute" />
        <div className="absolute bottom-6 text-[8px] font-mono text-brand-400/60 uppercase tracking-widest font-black">
          LENS LOCK
        </div>
      </div>

      {/* ── Text Decryption Board Container ── */}
      {phase !== 'climax' && (
        <div className="glass-card max-w-xl w-full p-8 border border-white/10 shadow-2xl space-y-6 text-center z-20 relative bg-slate-950/80 backdrop-blur-md">
          <div className="space-y-1">
            <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-brand-400 font-black">
              System Decrypt Terminal
            </span>
            <p className="text-[11px] text-slate-500">
              Isolating encrypted data signatures on the grid...
            </p>
          </div>

          {/* Code Scrambles displays */}
          {phase === 'decrypting' ? (
            <div className="space-y-4 py-4">
              <div className="text-3xl font-black font-mono text-white tracking-widest bg-black/40 py-3 rounded-xl border border-white/5 select-all">
                {scrambledCode}
              </div>
              <div className="text-base font-semibold font-mono text-brand-300 truncate tracking-wider">
                {scrambledName}
              </div>
              
              {/* Massive ticking countdown suspense seconds display */}
              <div className="text-5xl font-black text-rose-500 font-mono tracking-tighter pt-3 animate-pulse">
                {timerText}
              </div>
            </div>
          ) : (
            // Idle scanning state prompts
            <div className="py-8 space-y-4">
              <div className="text-2xl font-black text-slate-500 tracking-widest animate-pulse">
                SCANNING ENVELOPE...
              </div>
              
              <div className="text-[10px] font-bold text-slate-400 bg-white/5 border border-white/10 rounded-full px-4 py-2 inline-flex items-center gap-1.5 animate-bounce">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-500 animate-ping shrink-0" />
                PRESS [SPACEBAR] TO DECRYPT TICKET PASS
              </div>
            </div>
          )}

          <div className="text-[9px] text-slate-600 font-mono border-t border-white/[0.04] pt-3 leading-normal">
            Bodhantra OS • Secure Stage Decryption Shell
          </div>
        </div>
      )}

      {/* ── THE CLIMAX Polaroid Winner Identity Badge Card ── */}
      <div
        ref={polaroidRef}
        className="absolute glass-card w-80 p-5 bg-white text-slate-950 shadow-2xl flex flex-col gap-4 border-8 border-white rounded-none opacity-0 scale-50 z-30 select-text"
        style={{
          boxShadow: '0 30px 60px -15px rgba(0,0,0,0.85), inset 0 0 10px rgba(0,0,0,0.05)'
        }}
      >
        {/* Photo Container */}
        <div className="relative aspect-square w-full bg-slate-900 overflow-hidden border border-slate-200 shadow-inner flex items-center justify-center">
          {/* Polaroid photo shadow detective placeholder */}
          <div className="absolute inset-0 bg-cover bg-center mix-blend-multiply opacity-80 bg-dots" />
          <svg className="w-40 h-40 text-slate-700/60" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
          </svg>
          
          {/* Identity fingerprint stamp watermark overlay */}
          <div className="absolute bottom-2 right-2 w-12 h-12 border-2 border-rose-600/35 rounded-full flex items-center justify-center rotate-12 text-[7px] font-bold text-rose-600/40 select-none">
            APPROVED PASS
          </div>
        </div>

        {/* Identity content details */}
        <div className="space-y-2 select-text text-left">
          <div className="border-b border-slate-200 pb-2">
            <span className="text-[8px] font-bold tracking-widest text-slate-400 font-mono block">AGENT IDENTITY VERIFIED</span>
            <h3 className="text-lg font-black text-slate-900 tracking-tight leading-none mt-1 select-all truncate">
              {target?.name || 'AGENT CONFIDENTIAL'}
            </h3>
            <span className="text-[10px] font-mono font-bold text-slate-500 mt-1 block select-all">
              ID: {target?.unique_registration_id || 'BODH2026-X8R9TQ'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-700 font-mono">
            <div>
              <span className="text-[7px] text-slate-400 font-bold block">ASSIGNED TEAM</span>
              <span className="font-bold text-slate-800 leading-snug">{target?.team_name || 'COHORT ONE'}</span>
            </div>
            <div>
              <span className="text-[7px] text-slate-400 font-bold block">SEAT CODE</span>
              <span className="font-bold font-mono text-slate-800 leading-snug select-all">{target?.row_coordinate || 'A'}-{target?.column_coordinate || '1'}</span>
            </div>
          </div>

          <div className="text-center pt-2 select-none">
            {/* Branded print marker crop */}
            <span className="text-[7px] text-slate-300 font-mono tracking-widest block uppercase">
              Bodhantra OS • Ledger Badge
            </span>
          </div>
        </div>
      </div>

      {/* ── Fullscreen Climax Shaking Lightning flash white out overlay ── */}
      <div
        ref={flashOverlayRef}
        className="fixed inset-0 z-40 bg-white opacity-0 pointer-events-none"
      />

    </div>
  );
}
