import React, { useState, useEffect, useRef } from 'react';
import { 
  RotateCcw, Play, Pause, Plus, Trash2, Clock, Sparkles, 
  BookOpen, Volume2, VolumeX, Award, Info, Trash, HelpCircle, Save 
} from 'lucide-react';
import { cn } from '../lib/utils';

// Interfaces for Custom Focus Sessions and Ledger Records
interface FocusSession {
  id: string;
  name: string;
  duration: number; // in seconds
  ambient: string;
  code: string; // station identification code (e.g. "USR-01")
}

interface FocusLog {
  id: string;
  name: string;
  durationCompleted: number; // in seconds
  durationTarget: number; // in seconds
  timestamp: string; // Humanized datetime
  ambient: string;
  completed: boolean;
}

// Preset Ambient Audio Soundscapes available
const AMBIENT_OPTIONS = [
  "🔕 Silent Focus",
  "🌧️ Soft Glass Rain",
  "☕ Espresso Shop Humming",
  "🍃 Cozy Vinyl Friction",
  "⌨️ Mechanical Key Ticker",
  "📻 Analogue Static Hum",
  "🌊 Deep Ocean Drift"
];

// Plays a beautiful mechanical arpeggio alarm upon final completion of a focus session
const playCompletionTone = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.type = 'triangle';
    // Gentle arpeggio crescendo up to high clear C
    osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
    osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.15); // E5
    osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.3); // G5
    osc.frequency.setValueAtTime(1046.50, audioCtx.currentTime + 0.45); // C6
    
    gainNode.gain.setValueAtTime(0.18, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.9);
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.95);
  } catch (error) {
    console.warn("AudioContext tone blocked or unavailable:", error);
  }
};

export function Focus() {
  // --- Persistent States from LocalStorage ---
  // Starts completely EMPTY of presets per user instructions, but provides instant 1-click seeding
  const [customSessions, setCustomSessions] = useState<FocusSession[]>(() => {
    try {
      const stored = localStorage.getItem('daily_docket_custom_sessions');
      return stored ? JSON.parse(stored) : []; 
    } catch (_) {
      return [];
    }
  });

  const [logs, setLogs] = useState<FocusLog[]>(() => {
    try {
      const stored = localStorage.getItem('daily_docket_focus_logs');
      return stored ? JSON.parse(stored) : [];
    } catch (_) {
      return [];
    }
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    try {
      return localStorage.getItem('daily_docket_active_session_id') || "spontaneous";
    } catch (_) {
      return "spontaneous";
    }
  });

  // --- Dynamic Active Session fallback logic ---
  const activeSessionRef = useRef<FocusSession | null>(null);
  const activeSession = customSessions.find(s => s.id === activeSessionId) || {
    id: "spontaneous",
    name: "Raw Focus Sprint",
    duration: 25 * 60,
    ambient: "🔕 Silent Focus",
    code: "RAW-X"
  };
  activeSessionRef.current = activeSession;

  // --- Web Audio Synthesizer States & Refs ---
  const [isAmbientMuted, setIsAmbientMuted] = useState<boolean>(() => {
    try {
      return localStorage.getItem('daily_docket_ambient_muted') === 'true';
    } catch (_) {
      return true; // safeness default is muted to avoid unexpected user noise
    }
  });
  const [ambientVolume, setAmbientVolume] = useState<number>(() => {
    try {
      const stored = localStorage.getItem('daily_docket_ambient_volume');
      return stored ? parseFloat(stored) : 0.4;
    } catch (_) {
      return 0.4;
    }
  });

  // Web Audio Synth references to track oscillators, buffers, and intervals
  const audioCtxRef = useRef<AudioContext | null>(null);
  const activeSourcesRef = useRef<any[]>([]);
  const runningIntervalsRef = useRef<any[]>([]);
  const mainGainRef = useRef<GainNode | null>(null);
  const activeAmbientRef = useRef<string>('');

  // --- Timer Variables ---
  const [timeLeft, setTimeLeft] = useState(activeSession.duration);
  const [targetDuration, setTargetDuration] = useState(activeSession.duration);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  // --- UI Alert and Helper States ---
  const [showCelebrate, setShowCelebrate] = useState(false);
  const [lastArchivedSession, setLastArchivedSession] = useState<{name: string, duration: number} | null>(null);
  const [showSaveAsCustomModal, setShowSaveAsCustomModal] = useState(false);
  const [saveCustomName, setSaveCustomName] = useState('');

  // --- Form input states for creating custom sessions ---
  const [newSessionName, setNewSessionName] = useState('');
  const [newSessionMinutes, setNewSessionMinutes] = useState(25);
  const [newSessionAmbient, setNewSessionAmbient] = useState(AMBIENT_OPTIONS[1]); // Soft Glass Rain as helper

  // Sync activeSession changes if we change station when NOT running
  useEffect(() => {
    localStorage.setItem('daily_docket_active_session_id', activeSessionId);
    if (!isRunning) {
      setTimeLeft(activeSession.duration);
      setTargetDuration(activeSession.duration);
      setIsPaused(false);
    }
  }, [activeSessionId, activeSession.duration, isRunning]);

  // Save mute preferences
  useEffect(() => {
    localStorage.setItem('daily_docket_ambient_muted', String(isAmbientMuted));
  }, [isAmbientMuted]);

  // Save volume preferences
  useEffect(() => {
    localStorage.setItem('daily_docket_ambient_volume', String(ambientVolume));
    if (mainGainRef.current && audioCtxRef.current) {
      try {
        mainGainRef.current.gain.setValueAtTime(ambientVolume, audioCtxRef.current.currentTime);
      } catch (_) {}
    }
  }, [ambientVolume]);

  // --- Timer Countdown Process Loop ---
  useEffect(() => {
    let timerInterval: NodeJS.Timeout;
    if (isRunning && timeLeft > 0) {
      timerInterval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Focus period completed!
            setIsRunning(false);
            setIsPaused(false);
            playCompletionTone();
            setShowCelebrate(true);
            setTimeout(() => setShowCelebrate(false), 9000);
            
            // File completed dispatch to ledger
            const curSession = activeSessionRef.current || activeSession;
            recordSessionToLedger(curSession.name, targetDuration, targetDuration, true, curSession.ambient);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerInterval);
  }, [isRunning, targetDuration]);


  // Helper synth noise curves
  const generateWhiteNoise = (ctx: AudioContext) => {
    const bufferSize = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  };

  const generatePinkNoise = (ctx: AudioContext) => {
    const bufferSize = 4 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      data[i] *= 0.11; // normalise filter
      b6 = white * 0.115926;
    }
    return buffer;
  };

  const generateBrownNoise = (ctx: AudioContext) => {
    const bufferSize = 4 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = data[i];
      data[i] *= 3.8; // adjust volume curve
    }
    return buffer;
  };

  // --- Pure Web Audio Synthesizer Loop Controller ---
  const stopAmbientSound = () => {
    // Clear any sound interval tickers
    runningIntervalsRef.current.forEach(id => clearInterval(id));
    runningIntervalsRef.current = [];

    // Terminate audio nodes
    activeSourcesRef.current.forEach(source => {
      try { source.stop(); } catch(_) {}
    });
    activeSourcesRef.current = [];
  };

  const startAmbientSound = () => {
    stopAmbientSound();
    
    // Safety check - do not synthesize sound if muted or timer is idle
    if (!isRunning || isAmbientMuted) return;

    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Master local tracking gain node connected to destination
      const mainGain = ctx.createGain();
      mainGain.gain.setValueAtTime(ambientVolume, ctx.currentTime);
      mainGain.connect(ctx.destination);
      mainGainRef.current = mainGain;

      const ambientName = activeSession.ambient;
      activeAmbientRef.current = ambientName;

      if (ambientName.includes("🔕") || ambientName.includes("Silent")) {
        return;
      }

      // 1.🌧️ SOFT GLASS RAIN SYNTHESIZER
      if (ambientName.includes("🌧️") || ambientName.includes("Rain")) {
        const noise = ctx.createBufferSource();
        noise.buffer = generatePinkNoise(ctx);
        noise.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(950, ctx.currentTime);

        noise.connect(filter);
        filter.connect(mainGain);
        noise.start();
        activeSourcesRef.current.push(noise);

        // Crackling raindrops
        const raindropTimer = setInterval(() => {
          if (activeAmbientRef.current !== ambientName || isAmbientMuted) {
            clearInterval(raindropTimer);
            return;
          }
          try {
            const toneOsc = ctx.createOscillator();
            const spikeGain = ctx.createGain();
            toneOsc.type = 'triangle';
            toneOsc.frequency.setValueAtTime(200 + Math.random() * 400, ctx.currentTime);
            
            // Fast decay spike
            spikeGain.gain.setValueAtTime(0.006, ctx.currentTime);
            spikeGain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.04);
            
            toneOsc.connect(spikeGain);
            spikeGain.connect(mainGain);
            toneOsc.start();
            toneOsc.stop(ctx.currentTime + 0.05);
          } catch (_) {}
        }, 120);

        runningIntervalsRef.current.push(raindropTimer);
      }

      // 2.☕ ESPRESSO SHOP HUMMING SYNTHESIZER
      else if (ambientName.includes("☕") || ambientName.includes("Espresso")) {
        const whisper = ctx.createBufferSource();
        whisper.buffer = generateBrownNoise(ctx);
        whisper.loop = true;

        const lowpass = ctx.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.setValueAtTime(220, ctx.currentTime);

        whisper.connect(lowpass);
        lowpass.connect(mainGain);
        whisper.start();
        activeSourcesRef.current.push(whisper);

        // Ambient cafe coffee shop chatter & cup clatter notes (random frequency arpeggios)
        const chatterTimer = setInterval(() => {
          if (activeAmbientRef.current !== ambientName || isAmbientMuted) {
            clearInterval(chatterTimer);
            return;
          }
          try {
            const chimeOsc = ctx.createOscillator();
            const chimeGain = ctx.createGain();
            chimeOsc.type = 'sine';
            
            const minor7Chords = [220.00, 261.63, 329.63, 392.00, 440.00]; // Am7 frequencies
            const pitch = minor7Chords[Math.floor(Math.random() * minor7Chords.length)];
            chimeOsc.frequency.setValueAtTime(pitch, ctx.currentTime);
            
            chimeGain.gain.setValueAtTime(0.005, ctx.currentTime);
            chimeGain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 1.2);
            
            chimeOsc.connect(chimeGain);
            chimeGain.connect(mainGain);
            chimeOsc.start();
            chimeOsc.stop(ctx.currentTime + 1.3);
          } catch (_) {}
        }, 2200 + Math.random() * 3000);

        runningIntervalsRef.current.push(chatterTimer);
      }

      // 3.🍃 COZY VINYL FRICTION & CHIP HISS SYNTHESIZER
      else if (ambientName.includes("🍃") || ambientName.includes("Vinyl")) {
        // Soft continuous rumble
        const humOsc = ctx.createOscillator();
        const humGain = ctx.createGain();
        humOsc.type = 'sine';
        humOsc.frequency.setValueAtTime(45, ctx.currentTime);
        humGain.gain.setValueAtTime(0.025, ctx.currentTime);
        
        humOsc.connect(humGain);
        humGain.connect(mainGain);
        humOsc.start();
        activeSourcesRef.current.push(humOsc);

        // Sudden pops & dust crackles on lp groove
        const crackleTimer = setInterval(() => {
          if (activeAmbientRef.current !== ambientName || isAmbientMuted) {
            clearInterval(crackleTimer);
            return;
          }
          try {
            const scratch = ctx.createOscillator();
            const scratchGain = ctx.createGain();
            scratch.type = 'sawtooth';
            scratch.frequency.setValueAtTime(900 + Math.random() * 500, ctx.currentTime);
            
            scratchGain.gain.setValueAtTime(0.0035, ctx.currentTime);
            scratchGain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.025);
            
            scratch.connect(scratchGain);
            scratchGain.connect(mainGain);
            scratch.start();
            scratch.stop(ctx.currentTime + 0.03);
          } catch (_) {}
        }, 500 + Math.random() * 700);

        runningIntervalsRef.current.push(crackleTimer);
      }

      // 4.⌨️ MECHANICAL KEY TICKER SYNTHESIZER
      else if (ambientName.includes("⌨️") || ambientName.includes("Mechanical")) {
        // Typing cadence (random sequences of clicks resembling an office)
        const typingTimer = setInterval(() => {
          if (activeAmbientRef.current !== ambientName || isAmbientMuted) {
            clearInterval(typingTimer);
            return;
          }
          try {
            const tickOsc = ctx.createOscillator();
            const clickGain = ctx.createGain();
            const bPass = ctx.createBiquadFilter();
            
            bPass.type = 'bandpass';
            bPass.frequency.setValueAtTime(1500 + Math.random() * 800, ctx.currentTime);
            bPass.Q.setValueAtTime(6, ctx.currentTime);

            tickOsc.type = Math.random() > 0.4 ? 'triangle' : 'sine';
            tickOsc.frequency.setValueAtTime(140 + Math.random() * 150, ctx.currentTime);
            
            clickGain.gain.setValueAtTime(0.015, ctx.currentTime);
            clickGain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.03);
            
            tickOsc.connect(bPass);
            bPass.connect(clickGain);
            clickGain.connect(mainGain);
            
            tickOsc.start();
            tickOsc.stop(ctx.currentTime + 0.04);
          } catch (_) {}
        }, 220 + Math.random() * 650);

        runningIntervalsRef.current.push(typingTimer);
      }

      // 5.📻 ANALOG RESIDUAL STATIC HUM
      else if (ambientName.includes("📻") || ambientName.includes("Static")) {
        const whiteSrc = ctx.createBufferSource();
        whiteSrc.buffer = generateWhiteNoise(ctx);
        whiteSrc.loop = true;

        const bandFilter = ctx.createBiquadFilter();
        bandFilter.type = 'bandpass';
        bandFilter.frequency.setValueAtTime(450, ctx.currentTime);
        bandFilter.Q.setValueAtTime(0.4, ctx.currentTime);

        const hissGain = ctx.createGain();
        hissGain.gain.setValueAtTime(0.07, ctx.currentTime);

        whiteSrc.connect(bandFilter);
        bandFilter.connect(hissGain);
        hissGain.connect(mainGain);
        whiteSrc.start();
        activeSourcesRef.current.push(whiteSrc);

        const grid60Hz = ctx.createOscillator();
        const gridGain = ctx.createGain();
        grid60Hz.type = 'sine';
        grid60Hz.frequency.setValueAtTime(60, ctx.currentTime); // Standard magnetic field 60Hz hum
        gridGain.gain.setValueAtTime(0.02, ctx.currentTime);

        grid60Hz.connect(gridGain);
        gridGain.connect(mainGain);
        grid60Hz.start();
        activeSourcesRef.current.push(grid60Hz);
      }

      // 6.🌊 DEEP OCEAN DRIFT (Low hum with periodic sweeping amplitude tide wash)
      else if (ambientName.includes("🌊") || ambientName.includes("Ocean")) {
        const pinkSrc = ctx.createBufferSource();
        pinkSrc.buffer = generatePinkNoise(ctx);
        pinkSrc.loop = true;

        const tideLowpass = ctx.createBiquadFilter();
        tideLowpass.type = 'lowpass';
        tideLowpass.frequency.setValueAtTime(350, ctx.currentTime);

        pinkSrc.connect(tideLowpass);
        tideLowpass.connect(mainGain);
        pinkSrc.start();
        activeSourcesRef.current.push(pinkSrc);

        // Sweep the cutoff frequency up and down dynamically using an interval timer to simulate tide breakers
        let sweepingCount = 0;
        const tideTimer = setInterval(() => {
          if (activeAmbientRef.current !== ambientName || isAmbientMuted) {
            clearInterval(tideTimer);
            return;
          }
          sweepingCount += 0.05;
          // Sweep cutoff between 120Hz and 320Hz every ~8.5 seconds
          const targetCutoff = 220 + Math.sin(sweepingCount * Math.PI * 2 / 8.5) * 100;
          try {
            tideLowpass.frequency.linearRampToValueAtTime(targetCutoff, ctx.currentTime + 0.05);
          } catch (_) {}
        }, 50);

        runningIntervalsRef.current.push(tideTimer);
      }

    } catch (err) {
      console.warn("Unexpected glitch in mechanical sound synthesis node:", err);
    }
  };

  // Acoustic dynamic synthesizer trigger hooks
  useEffect(() => {
    if (isRunning && !isAmbientMuted) {
      startAmbientSound();
    } else {
      stopAmbientSound();
    }
    return () => stopAmbientSound();
  }, [isRunning, isAmbientMuted, activeSession.ambient, activeSessionId]);

  // Clean-up garbage references upon component destruction
  useEffect(() => {
    return () => {
      stopAmbientSound();
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    };
  }, []);

  // --- Core Action Dispatchers ---

  // Tuning helper - Stops the clock, switches ID, updates the digital readout immediately.
  const handleTuneStation = (station: FocusSession) => {
    // Elegant stop to previous sound to prevent sound overlap
    stopAmbientSound();
    setIsRunning(false);
    setIsPaused(false);
    
    setActiveSessionId(station.id);
    setTimeLeft(station.duration);
    setTargetDuration(station.duration);
  };

  const handleToggleTimer = () => {
    // Initiate audio context context safely on first click via user gesture
    if (!audioCtxRef.current) {
      try {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch(_) {}
    }

    if (isRunning) {
      setIsRunning(false);
      setIsPaused(true);
    } else {
      setIsRunning(true);
      setIsPaused(false);
    }
  };

  const handleResetTimer = () => {
    setIsRunning(false);
    setIsPaused(false);
    setTimeLeft(activeSession.duration);
    setTargetDuration(activeSession.duration);
  };

  // Adjust time remaining dynamically on the fly (+/- minutes buttons)
  const handleAdjustTimer = (minutes: number) => {
    const changeSeconds = minutes * 60;
    setTimeLeft((prev) => {
      const updatedValue = Math.max(60, Math.min(180 * 60, prev + changeSeconds));
      // If we are padding additional time, we also update targetDuration so the progress meter matches
      if (minutes > 0) {
        setTargetDuration(t => t + changeSeconds);
      }
      return updatedValue;
    });
  };

  // Log finished session into historical record list
  const recordSessionToLedger = (
    name: string, 
    durationAchieved: number, 
    durationSelected: number, 
    isFullyCompleted: boolean,
    ambientUsed: string
  ) => {
    if (durationAchieved < 5) return; // Ignore accidental clicks under 5 seconds

    const humanTime = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    const newEntry: FocusLog = {
      id: Math.random().toString(36).substring(7),
      name,
      durationCompleted: durationAchieved,
      durationTarget: durationSelected,
      timestamp: humanTime,
      ambient: ambientUsed,
      completed: isFullyCompleted
    };

    setLogs((prev) => {
      const updated = [newEntry, ...prev];
      localStorage.setItem('daily_docket_focus_logs', JSON.stringify(updated));
      return updated;
    });

    setLastArchivedSession({
      name,
      duration: durationAchieved
    });
    setTimeout(() => {
      setLastArchivedSession(null);
    }, 6000);
  };

  // Save partial focus progress of current session & restart
  const handleArchiveEarly = () => {
    const elapsedSeconds = targetDuration - timeLeft;
    if (elapsedSeconds >= 5) {
      recordSessionToLedger(
        activeSession.name, 
        elapsedSeconds, 
        targetDuration, 
        false, 
        activeSession.ambient
      );
    }
    handleResetTimer();
  };

  // Create a brand new custom station focus channel
  const handleCreateSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionName.trim()) return;

    const formattedLabel = newSessionName.trim();
    const uniqueNumber = (customSessions.length + 1).toString().padStart(2, '0');
    
    const newStation: FocusSession = {
      id: 'session-' + Math.random().toString(36).substring(7),
      name: formattedLabel,
      duration: newSessionMinutes * 60,
      ambient: newSessionAmbient,
      code: `USR-${uniqueNumber}`
    };

    const updated = [...customSessions, newStation];
    setCustomSessions(updated);
    localStorage.setItem('daily_docket_custom_sessions', JSON.stringify(updated));
    
    // Auto-tunes instantly to newly minted station
    handleTuneStation(newStation);
    
    // Clear form inputs
    setNewSessionName('');
  };

  // One-click helper to save active spontaneous session setup to standard channels
  const handleSaveSpontaneousSession = () => {
    if (!saveCustomName.trim()) return;
    
    const durationToSave = targetDuration;
    const ambientToSave = activeSession.ambient;
    const uniqueNumber = (customSessions.length + 1).toString().padStart(2, '0');

    const newStation: FocusSession = {
      id: 'session-' + Math.random().toString(36).substring(7),
      name: saveCustomName.trim(),
      duration: durationToSave,
      ambient: ambientToSave,
      code: `SAV-${uniqueNumber}`
    };

    const updated = [...customSessions, newStation];
    setCustomSessions(updated);
    localStorage.setItem('daily_docket_custom_sessions', JSON.stringify(updated));
    setActiveSessionId(newStation.id);
    
    setShowSaveAsCustomModal(false);
    setSaveCustomName('');
  };

  // Purge standard station channel
  const handleDeleteStation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Stop clicking card parent
    
    const updated = customSessions.filter(s => s.id !== id);
    setCustomSessions(updated);
    localStorage.setItem('daily_docket_custom_sessions', JSON.stringify(updated));

    // Fallback tuning if active station was cleared
    if (activeSessionId === id) {
      if (updated.length > 0) {
        handleTuneStation(updated[0]);
      } else {
        setActiveSessionId('spontaneous');
        handleResetTimer();
      }
    }
  };

  // Wipe individual historical record log from index
  const handleDeleteLogEntry = (id: string) => {
    const updated = logs.filter(l => l.id !== id);
    setLogs(updated);
    localStorage.setItem('daily_docket_focus_logs', JSON.stringify(updated));
  };

  // Erase permanent memory ledger history
  const handleWipeLedgerBook = () => {
    if (window.confirm("ARE YOU SURE YOU WANT TO SHRED & PERMANENTLY ERASE THE ARCHIVAL FOCUS LEDGER? This cannot be undone.")) {
      setLogs([]);
      localStorage.removeItem('daily_docket_focus_logs');
    }
  };

  // Onboarding: Quick-seed cozy study pomodoro
  const handleQuickSeedClassic = (type: 'pomo' | 'deep') => {
    const uniqueNumber = (customSessions.length + 1).toString().padStart(2, '0');
    const seed: FocusSession = type === 'pomo' ? {
      id: "seeded-pomo-" + Date.now(),
      name: "Cozy Study Pomodoro",
      duration: 25 * 60,
      ambient: "🌧️ Soft Glass Rain",
      code: `CST-${uniqueNumber}`
    } : {
      id: "seeded-deep-" + Date.now(),
      name: "Deep Audio Focus",
      duration: 50 * 60,
      ambient: "⌨️ Mechanical Key Ticker",
      code: `CST-${uniqueNumber}`
    };

    const updated = [...customSessions, seed];
    setCustomSessions(updated);
    localStorage.setItem('daily_docket_custom_sessions', JSON.stringify(updated));
    handleTuneStation(seed);
  };

  // --- Dynamic Chronograph Display Variables ---
  const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const s = (timeLeft % 60).toString().padStart(2, '0');
  const progressPercent = targetDuration > 0 ? ((targetDuration - timeLeft) / targetDuration) * 100 : 0;

  // --- Ledger book aggregated calculations ---
  const countCompleted = logs.filter(l => l.completed).length;
  const totalFocusedSeconds = logs.reduce((sum, log) => sum + log.durationCompleted, 0);
  const totalHours = (totalFocusedSeconds / 3600).toFixed(1);
  const totalMinutes = Math.round(totalFocusedSeconds / 60);

  return (
    <div className="w-full max-w-3xl mx-auto px-1 sm:px-4 py-2 sm:py-6 flex flex-col gap-6">
      
      {/* 1. CHRONOGRAPH DISPATCH BOARD */}
      <div className="bg-ink text-paper border-[6px] sm:border-[8px] border-taxi p-4 sm:p-7 relative shadow-[6px_6px_0px_#1A1A1B] select-none overflow-hidden rounded-sm transition-all duration-300">
        
        {/* Aesthetic Overlay Subtle Scanlines */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,_rgba(0,0,0,0.12)_50%),_linear-gradient(90deg,_rgba(255,0,0,0.04),_rgba(0,255,0,0.01),_rgba(0,0,255,0.04))] bg-[size:100%_4px,_6px_100%] pointer-events-none opacity-40 z-10" />

        {/* Vintage Top Status Bar */}
        <div className="flex justify-between items-center font-black font-mono uppercase text-[9px] sm:text-xs border-b border-taxi/40 mb-5 pb-2 text-taxi tracking-widest relative z-20">
          <span className="flex items-center gap-2">
            <span className={cn(
              "w-2.5 h-2.5 rounded-full ring-2 ring-offset-1 ring-offset-ink transition-all duration-300",
              isRunning 
                ? "bg-teal animate-pulse ring-teal/50" 
                : isPaused 
                  ? "bg-orange ring-orange/30" 
                  : "bg-paper-dark ring-paper-dark/20"
            )}></span>
            CHRONOGRAPH DISPATCH DESK
          </span>
          <span className="bg-taxi/15 text-taxi px-2 py-0.5 border border-taxi/35 font-bold uppercase tracking-widest text-[8px] sm:text-[9.5px]">
            {isRunning ? "CHRONO_RUNNING" : isPaused ? "CHRONO_PAUSED" : "STATE_STANDBY"}
          </span>
        </div>

        {/* Dashboard Title & Call Sign HUD */}
        <div className="mb-4 relative z-20">
          <div className="flex justify-between items-end">
            <span className="font-mono text-[9px] sm:text-[10px] text-taxi/95 font-black tracking-widest uppercase bg-taxi/10 px-1.5 py-0.5 border border-taxi/20">
              STATION CALL: {activeSession.code}
            </span>
            <div className="flex items-center gap-1 text-paper/60 font-mono text-[8.5px] sm:text-[10px] uppercase">
              <span className="opacity-75">ACOUSTIC FREQ:</span>
              <span className="text-taxi font-bold shrink-0">{activeSession.ambient}</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between border-b-2 border-dashed border-taxi/20 pb-4 mt-2 mb-1">
            <h2 className="font-sans text-2xl sm:text-3xl font-black uppercase tracking-tight text-paper leading-none truncate">
              {activeSession.name}
            </h2>

            {/* Quick action to preserve/save RAW changes */}
            {activeSession.id === "spontaneous" && (
              <button 
                type="button"
                onClick={() => {
                  setSaveCustomName(`Interval - ${Math.round(targetDuration / 60)}m`);
                  setShowSaveAsCustomModal(true);
                }}
                className="flex items-center gap-1 py-1 px-2.5 bg-taxi hover:bg-taxi-hover text-ink font-mono font-black text-[9px] uppercase tracking-wider cursor-pointer border border-ink shadow-[2px_2px_0px_#FFF] shrink-0"
              >
                <Save size={10} strokeWidth={2.5} />
                <span>Save Config</span>
              </button>
            )}
          </div>
        </div>

        {/* Chronograph Numerical Counter & Analog Progress Pulse Gauge */}
        <div className="flex flex-col items-center py-5 border-b border-taxi/20 relative z-20">
          
          {/* Big LCD Display Counter */}
          <div className="relative py-2 px-6 bg-[#161617] vintage-border border-taxi/40 rounded-sm w-full max-w-[420px] shadow-[inset_0px_2.5px_8px_rgba(0,0,0,0.8)]">
            <div className="absolute top-1.5 left-2 bg-[#FF453A]/10 px-1.5 py-0.5 text-[7px] text-[#FF453A] font-mono tracking-widest font-bold uppercase rounded-3xs select-none">
              OUTPUT SIG
            </div>
            {/* Real retro digital blinking colon */}
            <div className="font-mono text-7xl sm:text-8xl font-bold text-center tracking-tighter text-paper leading-none py-1 select-none font-black text-taxi opacity-[0.98] select-all">
              {m}<span className={cn(isRunning ? "animate-pulse" : "")}>:</span>{s}
            </div>
          </div>

          {/* Sizing Micro Dial Increment / Decrement Buttons */}
          <div className="flex items-center gap-1 sm:gap-1.5 mt-4 select-none">
            <button
              onClick={() => handleAdjustTimer(-300)}
              disabled={timeLeft <= 300}
              className={cn(
                "px-2 sm:px-2.5 py-1 text-[8.5px] font-mono font-bold bg-[#252526] text-paper/80 border border-paper/10 cursor-pointer transition-all active:translate-y-[1px]",
                timeLeft <= 300 ? "opacity-35 cursor-not-allowed" : "hover:bg-taxi/25 hover:text-taxi hover:border-taxi"
              )}
              title="Deduct 5 min"
            >
              -5m
            </button>
            <button
              onClick={() => handleAdjustTimer(-60)}
              disabled={timeLeft <= 60}
              className={cn(
                "px-2 sm:px-2.5 py-1 text-[8.5px] font-mono font-bold bg-[#252526] text-paper/80 border border-paper/10 cursor-pointer transition-all active:translate-y-[1px]",
                timeLeft <= 60 ? "opacity-35 cursor-not-allowed" : "hover:bg-taxi/25 hover:text-taxi hover:border-taxi"
              )}
              title="Deduct 1 min"
            >
              -1m
            </button>

            <span className="font-mono text-[7.5px] text-paper/40 font-black tracking-widest uppercase px-1 sm:px-3 text-center">
              🎛️ COGNITIVE TUNER CONTROLLER
            </span>

            <button
              onClick={() => handleAdjustTimer(60)}
              disabled={timeLeft >= 180 * 60}
              className={cn(
                "px-2 sm:px-2.5 py-1 text-[8.5px] font-mono font-bold bg-[#252526] text-paper/80 border border-paper/10 cursor-pointer transition-all active:translate-y-[1px]",
                timeLeft >= 180 * 60 ? "opacity-35 cursor-not-allowed" : "hover:bg-taxi/25 hover:text-taxi hover:border-taxi"
              )}
              title="Add 1 min"
            >
              +1m
            </button>
            <button
              onClick={() => handleAdjustTimer(300)}
              disabled={timeLeft >= 180 * 60}
              className={cn(
                "px-2 sm:px-2.5 py-1 text-[8.5px] font-mono font-bold bg-[#252526] text-paper/80 border border-paper/10 cursor-pointer transition-all active:translate-y-[1px]",
                timeLeft >= 180 * 60 ? "opacity-35 cursor-not-allowed" : "hover:bg-taxi/25 hover:text-taxi hover:border-taxi"
              )}
              title="Add 5 min"
            >
              +5m
            </button>
          </div>

          {/* Dynamic Interactive Soundboard Area inside HUD */}
          <div className="w-full mt-5 bg-[#252526] border border-taxi/25 px-3 py-2 sm:py-2.5 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xs select-none">
            
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAmbientMuted(!isAmbientMuted)}
                className={cn(
                  "p-1.5 border flex items-center justify-center transition-all duration-150 rounded-xs cursor-pointer",
                  !isAmbientMuted 
                    ? "bg-taxi text-ink border-taxi shadow-[1.5px_1.5px_0px_#1A1A1B]" 
                    : "bg-ink text-paper/60 border-paper/20 hover:border-taxi hover:text-taxi"
                )}
                title={isAmbientMuted ? "Unmute sound synthesis" : "Mute ambient audio"}
              >
                {isAmbientMuted ? <VolumeX size={13} strokeWidth={2.5} /> : <Volume2 size={13} strokeWidth={2.5} />}
              </button>
              
              <div className="leading-none text-left">
                <span className="block font-mono text-[8px] text-paper/50 uppercase font-black tracking-wider">
                  ACOUSTIC VOLUME
                </span>
                <span className="font-mono text-[9.5px] text-paper/80 uppercase font-bold tracking-tight">
                  {isAmbientMuted ? "SYNTHESIZED_MUTED" : `ACTIVE AMPLITUDE ${Math.round(ambientVolume * 100)}%`}
                </span>
              </div>
            </div>

            {/* Simulated Live visual audio wave pulses */}
            <div className="flex gap-[2px] items-center h-4.5 px-3 border-x border-paper/10">
              {[6, 12, 18, 10, 5, 14, 19, 8, 4, 11, 7].map((h, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "w-[2px] bg-taxi rounded-full transition-all duration-300 shrink-0",
                    isRunning && !isAmbientMuted ? "animate-pulse" : "opacity-30"
                  )}
                  style={{ 
                    height: isRunning && !isAmbientMuted ? `${Math.max(4, h * (ambientVolume + 0.3))}px` : '4px',
                    animationDelay: `${i * 120}ms`
                  }}
                />
              ))}
            </div>

            {/* Slider to fine tune the volume */}
            <div className="flex items-center gap-2 w-full sm:w-auto flex-1 sm:max-w-[160px]">
              <span className="font-mono text-[8px] text-paper/40 font-bold">MIN</span>
              <input 
                type="range"
                min="0.05"
                max="0.95"
                step="0.05"
                value={ambientVolume}
                onChange={(e) => setAmbientVolume(parseFloat(e.target.value))}
                className="w-full h-1 bg-ink rounded-lg appearance-none cursor-pointer accent-taxi focus:outline-none"
              />
              <span className="font-mono text-[8px] text-paper/40 font-bold">MAX</span>
            </div>
          </div>

          {/* Split Digital Gauge Bar */}
          <div className="w-full mt-5">
            <div className="flex justify-between font-mono text-[8.5px] text-taxi/75 font-black uppercase tracking-wider mb-1 px-1">
              <span>🎚️ 0% TIME SPENT</span>
              <span className="text-paper bg-taxi/20 px-1 py-0.2 border border-taxi/15">{Math.round(progressPercent)}% COMMITTED RUN</span>
              <span>100% COMPLETE</span>
            </div>

            <div className="w-full h-5 bg-[#222223] border-2 border-taxi/40 relative overflow-hidden flex items-center p-[2px] rounded-xs shadow-[inset_0px_1.5px_4px_rgba(0,0,0,0.6)]">
              {/* Vintage gauge grids in the background */}
              <div className="absolute inset-0 flex justify-between px-3 pointer-events-none opacity-20">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="w-[1px] h-full bg-taxi"></div>
                ))}
              </div>

              {/* Active animated solid metric progress */}
              <div
                className="h-full bg-taxi transition-all duration-1000 flex items-center justify-end relative shadow-[0_0_12px_rgba(247,195,49,0.4)]"
                style={{ width: `${progressPercent}%` }}
              >
                {/* Active pulse ticker indicator */}
                {isRunning && progressPercent > 0 && (
                  <div className="w-2 h-full bg-white animate-pulse shrink-0"></div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Side Controls bar & Elapsed partial compiler logging */}
        <div className="flex flex-wrap items-center justify-between gap-4 mt-5 relative z-20">
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={handleToggleTimer}
              className={cn(
                "flex-1 sm:flex-initial flex items-center justify-center gap-2 border-[4px] py-3 px-6 font-mono text-xs sm:text-sm uppercase font-black tracking-widest transition-all duration-150 cursor-pointer min-h-[44px]",
                isRunning
                  ? "bg-subway-red text-paper border-subway-red shadow-[3px_3px_0px_#1A1A1B] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
                  : "bg-taxi text-ink border-taxi shadow-[3px_3px_0px_#1A1A1B] hover:bg-taxi-hover active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
              )}
            >
              {isRunning ? <Pause size={13} strokeWidth={3} /> : <Play size={13} strokeWidth={3} />}
              <span>{isRunning ? "PAUSE DISPATCH" : "START SESSION"}</span>
            </button>

            <button
              onClick={handleResetTimer}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-transparent text-paper/70 border-[4px] border-paper/20 hover:border-taxi hover:text-taxi py-3 px-5 sm:px-6 font-mono text-xs sm:text-sm uppercase font-black tracking-widest transition-all duration-150 cursor-pointer shadow-[3px_3px_0px_rgba(0,0,0,0.15)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] min-h-[44px]"
              title="Reset chronograph"
            >
              <RotateCcw size={12} strokeWidth={3} />
              <span>Reset</span>
            </button>
          </div>

          {/* Quick-Save Early entry. Active if the user focused for at least 5 elapsed seconds */}
          {(targetDuration - timeLeft) >= 5 && (
            <button
              type="button"
              onClick={handleArchiveEarly}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 py-3 px-4.5 bg-[#4A7A78] text-white border-2 border-ink shadow-[2.5px_2.5px_0px_rgba(255,255,255,0.7)] hover:shadow-xs hover:translate-x-[1px] hover:translate-y-[1px] cursor-pointer font-mono font-black text-[10px] uppercase tracking-wider transition-all"
              title="File elapsed minutes immediately and restart clock"
            >
              <BookOpen size={12} strokeWidth={2.5} />
              <span>FILE WORK SO FAR ({Math.floor((targetDuration - timeLeft) / 60)}m {Math.round((targetDuration - timeLeft) % 60)}s)</span>
            </button>
          )}
        </div>

        {/* HUD ALERT: CELEB BANNER */}
        {showCelebrate && (
          <div className="mt-4 p-3.5 bg-[#10B981]/20 border-2 border-[#10B981] text-[#2BC48E] rounded-xs font-mono text-[10px] animate-bounce flex items-center gap-2 font-black uppercase tracking-widest relative z-20 shadow-md">
            <Sparkles size={14} className="animate-spin text-taxi" />
            <span>🎉 ARCHIVAL CHRONOGRAPH CYCLE COMPLETED! DISPATCH HAS BEEN SAFELY FILED IN THE SHIELD RECORD LEDGER BOOK.</span>
          </div>
        )}

        {/* HUD ALERT: RECENT DISPATCH ENTRY SUCCEED */}
        {lastArchivedSession && (
          <div className="mt-4 p-3 bg-teal/15 border border-teal text-[#A8D3C8] rounded-xs font-mono text-[9.5px] sm:text-[10px] flex items-center justify-between uppercase tracking-wider relative z-20">
            <span className="font-bold">📋 DESK REGISTER WRITE SUCCESS: "{lastArchivedSession.name}" ({Math.round(lastArchivedSession.duration / 60)} min logged)</span>
          </div>
        )}

      </div>

      {/* Spontaneous Preserving Popover Modal */}
      {showSaveAsCustomModal && (
        <div className="fixed inset-0 z-50 bg-ink/80 backdrop-blur-3xs flex items-center justify-center p-4">
          <div className="bg-paper vintage-border-thick max-w-sm w-full p-5 shadow-[4px_4px_0px_#1A1A1B] animate-fade-in text-ink">
            <h4 className="font-sans font-black text-sm uppercase tracking-tight border-b-2 border-ink pb-1.5 mb-3">
              💾 Register Spontaneous Station
            </h4>
            <p className="font-mono text-[9px] text-ink/65 uppercase leading-relaxed mb-4">
              Write this configuration into your custom frequencies directory for high performance one-click access.
            </p>

            <div className="flex flex-col gap-3.5">
              <div>
                <label className="block text-[8px] font-mono font-bold uppercase mb-1">
                  1. STATION IDENTIFICATION CALL SIGN
                </label>
                <input 
                  type="text"
                  required
                  value={saveCustomName}
                  onChange={(e) => setSaveCustomName(e.target.value)}
                  maxLength={30}
                  className="w-full bg-paper border-2 border-ink p-1.5 font-mono text-xs focus:bg-white select-all text-ink focus:outline-none"
                  placeholder="e.g. Thesis Writing, Code Sprint"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-[9px] font-mono bg-ink/[0.04] p-2 border border-ink/10 uppercase">
                <div>
                  <span className="block text-ink/40">⏱️ DURATION:</span>
                  <span className="font-bold text-ink">{Math.round(targetDuration / 60)} MINUTES</span>
                </div>
                <div>
                  <span className="block text-ink/40">🌧️ ACOUSTIC:</span>
                  <span className="font-bold text-ink truncate block">{activeSession.ambient}</span>
                </div>
              </div>

              <div className="flex gap-2.5 mt-2">
                <button
                  type="submit"
                  onClick={handleSaveSpontaneousSession}
                  className="flex-1 bg-ink text-paper hover:bg-taxi hover:text-ink font-mono font-black text-xs uppercase tracking-wider py-2 border border-ink shadow-[2px_2px_0px_rgba(0,0,0,0.15)] cursor-pointer"
                >
                  Confirm Write
                </button>
                <button
                  type="button"
                  onClick={() => setShowSaveAsCustomModal(false)}
                  className="px-4 py-2 border-2 border-ink/40 font-mono text-xs uppercase hover:bg-paper-dark hover:border-ink font-bold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. REGISTRY: CUSTOM STATION DECK */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">

        {/* 2A. ACTIVE STATION REGISTRY directory list */}
        <div className="bg-paper border-4 border-ink p-4 sm:p-5 shadow-[4px_4px_0px_#1A1A1B] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b-2 border-ink pb-2 mb-4">
              <span className="font-mono text-[10px] font-black uppercase text-ink/75 tracking-wider flex items-center gap-1.5">
                🔌 REGISTERED FOCUS STATIONS
              </span>
              <span className="text-[9px] font-mono font-bold text-ink/40 uppercase">
                {customSessions.length} TUNINGS RETAINED
              </span>
            </div>

            {/* Completely EMPTY default state - invites Custom station creation */}
            {customSessions.length === 0 ? (
              <div className="py-6 px-4 text-center bg-[#FAF9F5] border-2 border-dashed border-ink/20 rounded-sm">
                <div className="w-12 h-12 bg-ink/5 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Clock size={20} className="text-ink/35 animate-pulse" />
                </div>
                <h5 className="font-sans font-black text-xs uppercase text-ink/70">
                  Stations Directory Empty
                </h5>
                <p className="font-mono text-[9px] text-ink/40 uppercase leading-relaxed max-w-xs mx-auto mt-1">
                  Preset hardcoded channels were cleared per request. Register your exact customized focus stations on the right!
                </p>

                {/* Instant Seeding Onboarding Sparks */}
                <div className="mt-5 flex flex-col gap-2">
                  <span className="block font-mono text-[7.5px] text-ink/40 font-bold uppercase tracking-wider">
                    ⚡ QUICK INITIALIZATION CHANNELS
                  </span>
                  <div className="flex gap-2 justify-center">
                    <button 
                      type="button"
                      onClick={() => handleQuickSeedClassic('pomo')}
                      className="px-2 py-1 bg-paper hover:bg-paper-dark border border-ink/45 font-mono text-[8.5px] font-black uppercase tracking-wider shadow-[1.5px_1.5px_0px_#1A1A1B] cursor-pointer"
                    >
                      ☕ Study Pomo (25m)
                    </button>
                    <button 
                      type="button"
                      onClick={() => handleQuickSeedClassic('deep')}
                      className="px-2 py-1 bg-paper hover:bg-paper-dark border border-ink/45 font-mono text-[8.5px] font-black uppercase tracking-wider shadow-[1.5px_1.5px_0px_#1A1A1B] cursor-pointer"
                    >
                      ⌨️ Deep Code (50m)
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-[250px] overflow-y-auto scrollbar-none pr-1">
                {customSessions.map((session) => {
                  const isSelected = activeSessionId === session.id;
                  
                  return (
                    <div
                      key={session.id}
                      onClick={() => handleTuneStation(session)}
                      className={cn(
                        "p-2.5 text-left border-2 font-mono transition-all duration-150 cursor-pointer flex items-center justify-between rounded-sm hover:-translate-y-[0.5px]",
                        isSelected
                          ? "bg-taxi/15 border-taxi text-ink shadow-[2.5px_2.5px_0px_#1A1A1B]"
                          : "bg-paper/50 hover:bg-paper-dark border-ink/40 text-ink/65 hover:border-ink hover:text-ink"
                      )}
                    >
                      <div className="flex flex-col flex-grow truncate mr-2 leading-tight">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className={cn(
                            "w-1.5 h-1.5 rounded-full shrink-0",
                            isSelected ? "bg-taxi animate-pulse" : "bg-ink/30"
                          )} />
                          <span className="font-sans font-black text-xs uppercase truncate">
                            {session.name}
                          </span>
                        </div>
                        <span className="text-[9px] text-ink/50 mt-0.5 truncate flex items-center gap-1">
                          <span>⏱️ {Math.round(session.duration / 60)} min</span>
                          <span className="opacity-40">|</span>
                          <span className="truncate">{session.ambient}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={cn(
                          "text-[8px] font-black px-1.5 py-0.5 border select-none shrink-0",
                          isSelected ? "bg-taxi text-ink border-taxi" : "bg-paper-dark border-ink/20"
                        )}>
                          {session.code}
                        </span>
                        
                        <button
                          type="button"
                          onClick={(e) => handleDeleteStation(session.id, e)}
                          className="p-1 hover:bg-subway-red/15 text-ink/40 hover:text-subway-red rounded transition-colors duration-150 cursor-pointer"
                          title="Purge session"
                        >
                          <Trash2 size={11} strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-ink/[0.04] p-2 mt-4 border border-ink/10 font-mono text-[8.5px] leading-relaxed text-ink/60 uppercase">
            💡 Tap any station frequency above to instantly load that preset's duration, configure background acoustics, and pause standby loops.
          </div>
        </div>

        {/* 2B. NEW STATION ENTRY FORM FOR CREATING CUSTOM STATIONS */}
        <form onSubmit={handleCreateSession} className="bg-paper border-4 border-ink p-4 sm:p-5 shadow-[4px_4px_0px_#1A1A1B] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b-2 border-ink pb-2 mb-4">
              <span className="font-mono text-[10px] font-black uppercase text-ink/75 tracking-wider">
                🧬 REGULATE BRAND NEW FREQUENCY
              </span>
              <Clock size={11} />
            </div>

            <div className="flex flex-col gap-3">
              {/* Custom Name */}
              <div>
                <label className="block text-[8px] font-mono font-black uppercase text-ink/70 mb-1">
                  1. STATION IDENTIFIER / PROJECT NAME
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Code Review, Heavy Drafting, Reading"
                  value={newSessionName}
                  onChange={(e) => setNewSessionName(e.target.value)}
                  maxLength={35}
                  className="w-full bg-paper border-2 border-ink p-1.5 font-mono text-xs focus:bg-white select-all text-ink focus:outline-none"
                />
              </div>

              {/* Range slider for Custom minutes */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[8px] font-mono font-black uppercase text-ink/70">
                    2. TARGET ALLOCATION MINUTES
                  </label>
                  <span className="font-mono font-black text-xs text-ink bg-taxi/20 px-1.5 py-0.2">
                    {newSessionMinutes} MINUTES
                  </span>
                </div>
                
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="1"
                    max="180"
                    value={newSessionMinutes}
                    onChange={(e) => setNewSessionMinutes(Number(e.target.value))}
                    className="w-full h-1 bg-ink rounded-lg appearance-none cursor-pointer accent-taxi focus:outline-none"
                  />
                  <div className="flex gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setNewSessionMinutes(25)}
                      className={cn("px-1 py-0.5 font-mono text-[8px] font-bold uppercase rounded-xs border", newSessionMinutes === 25 ? "bg-ink text-paper border-ink" : "bg-paper-dark text-ink border-ink/25")}
                    >
                      POMO
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewSessionMinutes(50)}
                      className={cn("px-1 py-0.5 font-mono text-[8px] font-bold uppercase rounded-xs border", newSessionMinutes === 50 ? "bg-ink text-paper" : "bg-paper-dark text-ink border-ink/25")}
                    >
                      DEEP
                    </button>
                  </div>
                </div>
              </div>

              {/* Acoustic background drop-down */}
              <div>
                <label className="block text-[8px] font-mono font-black uppercase text-ink/70 mb-1">
                  3. BACKDROP ACOUSTIC FREQUENCY
                </label>
                <select
                  value={newSessionAmbient}
                  onChange={(e) => setNewSessionAmbient(e.target.value)}
                  className="w-full bg-paper border-2 border-ink p-1.5 font-mono text-xs text-ink focus:outline-none cursor-pointer"
                >
                  {AMBIENT_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full mt-4 bg-ink text-paper hover:bg-taxi hover:text-ink font-mono font-black text-xs uppercase tracking-widest py-2 border-2 border-ink shadow-[2px_2px_0px_rgba(0,0,0,0.15)] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer transition-all"
          >
            🔌 File New Focus Station
          </button>
        </form>
      </div>

      {/* 3. HARDCOVER CHRONOGRAPH HISTORY LEDGER BOOK */}
      <div className="bg-paper border-4 border-ink p-4 sm:p-6 shadow-[6px_6px_0px_#1A1A1B] relative">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-2 border-ink pb-3 mb-5 gap-2">
          <div>
            <h3 className="font-sans font-black text-lg sm:text-xl uppercase tracking-tight text-ink flex items-center gap-2">
              📓 STATIONERY CHRONOGRAPH LEDGER
            </h3>
            <p className="font-mono text-[8px] text-ink/50 uppercase font-black tracking-widest mt-0.5">
              PERSISTENT COMPILER LOG BOOK OF ACTIVE WORK RUNS
            </p>
          </div>
          {logs.length > 0 && (
            <button
              onClick={handleWipeLedgerBook}
              className="flex items-center gap-1.5 px-2.5 py-1 text-[8px] sm:text-[9px] font-mono font-semibold bg-subway-red/10 border border-subway-red hover:bg-subway-red hover:text-white text-subway-red transition-all duration-150 cursor-pointer rounded-xs uppercase"
              title="Delete all histories"
            >
              <Trash size={10.5} strokeWidth={2.5} />
              <span>SHRED LEDGER BOOK</span>
            </button>
          )}
        </div>

        {/* Aggregated Statistics Panels */}
        <div className="grid grid-cols-3 gap-3 mb-6 select-none">
          <div className="bg-[#1A1A1B]/5 border-2 border-ink p-3 rounded-sm flex flex-col justify-between">
            <span className="font-mono text-[8px] text-ink/55 uppercase font-black leading-none block mb-1">
              ACCUMULATED RHYTHM
            </span>
            <div className="flex items-baseline gap-1 mt-1 leading-none">
              <span className="font-mono text-xl sm:text-2xl font-black">{totalHours}</span>
              <span className="font-mono text-[9px] text-ink/60 font-bold">HRS</span>
            </div>
            <span className="font-mono text-[7.5px] text-ink/40 mt-1 block uppercase font-medium">({totalMinutes} minutes focused)</span>
          </div>

          <div className="bg-[#1A1A1B]/5 border-2 border-ink p-3 rounded-sm flex flex-col justify-between">
            <span className="font-mono text-[8px] text-ink/55 uppercase font-black leading-none block mb-1">
              LEDGER WRITES
            </span>
            <div className="flex items-baseline gap-1 mt-1 leading-none">
              <span className="font-mono text-xl sm:text-2xl font-black">{logs.length}</span>
              <span className="font-mono text-[9px] text-ink/60 font-bold">LOGS</span>
            </div>
            <span className="font-mono text-[7.5px] text-ink/40 mt-1 block uppercase font-medium">Recorded focus cycles</span>
          </div>

          <div className="bg-[#1A1A1B]/5 border-2 border-ink p-3 rounded-sm flex flex-col justify-between">
            <span className="font-mono text-[8px] text-ink/55 uppercase font-black leading-none block mb-1">
              SUCCESS RATE
            </span>
            <div className="flex items-baseline gap-1 mt-1 leading-none">
              <span className="font-mono text-xl sm:text-2xl font-black text-[#4A7A78]">{countCompleted}</span>
              <span className="font-mono text-[9px] text-ink/65 font-bold">WRITES</span>
            </div>
            <span className="font-mono text-[7.5px] text-ink/40 mt-1 block uppercase font-medium">
              {logs.length > 0 ? `${Math.round((countCompleted / logs.length) * 100)}% completeness rate` : "No historical inputs"}
            </span>
          </div>
        </div>

        {/* Detailed focus ledger log list */}
        {logs.length === 0 ? (
          <div className="py-10 text-center text-ink/35 font-serif italic text-xs border border-dashed border-ink/20 rounded-xs bg-[#FAF9F5]">
            The focus chronological registry ledger is empty.<br />
            Select a station, loop the clock playhead, and complete focus periods to generate ledger audits.
          </div>
        ) : (
          <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto scrollbar-none pr-1">
            {logs.map((log) => {
              const minutesLogComplete = Math.floor(log.durationCompleted / 60);
              const secondsLogComplete = Math.round(log.durationCompleted % 60);
              const targetMinutes = Math.round(log.durationTarget / 60);

              return (
                <div
                  key={log.id}
                  className="bg-[#FCFAF5] hover:bg-white border-2 border-ink p-3 flex flex-row items-center justify-between font-mono gap-4 transition-all duration-150 rounded-sm hover:-translate-y-[0.5px]"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Visual Stamp Checkbox */}
                    <div 
                      className={cn(
                        "w-5.5 h-5.5 border-2 border-ink shrink-0 flex items-center justify-center select-none shadow-[1.5px_1.5px_0px_#1A1A1B]",
                        log.completed ? "bg-[#10B981]/20 text-[#10B981]" : "bg-orange/15 text-orange"
                      )}
                      title={log.completed ? "Fulfilled focus run" : "Partial focus written early"}
                    >
                      {log.completed ? (
                        <Award size={12.5} className="shrink-0 text-[#10B981]" strokeWidth={3} />
                      ) : (
                        <span className="text-[10px] font-black leading-none">P</span>
                      )}
                    </div>

                    <div className="leading-tight min-w-0 flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-2">
                        <span className="font-sans font-black text-[12.5px] uppercase text-ink truncate block">
                          {log.name}
                        </span>
                        <span className="text-[7.5px] uppercase font-black text-ink/35 tracking-wider shrink-0 mt-0.5 sm:mt-0">
                          {log.timestamp}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1.5 text-[8.5px] text-ink/55 mt-1 whitespace-nowrap overflow-hidden text-ellipsis">
                        <span className="font-bold text-ink/80 uppercase">Logged: {minutesLogComplete}m {secondsLogComplete}s</span>
                        <span className="opacity-30">/</span>
                        <span>Target: {targetMinutes}m</span>
                        <span className="opacity-30">|</span>
                        <span className="text-ink/40 tracking-tight block truncate">Acoustic: {log.ambient}</span>
                      </div>
                    </div>
                  </div>

                  {/* Remove target log */}
                  <button
                    onClick={() => handleDeleteLogEntry(log.id)}
                    className="p-1 hover:bg-subway-red/10 text-ink/30 hover:text-subway-red rounded transition-colors cursor-pointer shrink-0"
                    title="Shred this log entry"
                  >
                    <Trash2 size={12} strokeWidth={2.5} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
