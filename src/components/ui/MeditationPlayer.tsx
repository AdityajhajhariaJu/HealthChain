import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from './ToastProvider';
import { Pause, Play } from 'lucide-react';
import { triggerHapticLight } from '../../services/haptics';
import { awardPoints } from '../../services/VitalityPointsEngine';
import { FitnessContent, FitnessService } from '../../services/FitnessService';
import { supabase } from '../../services/supabaseClient';
import Confetti from 'react-confetti';
import { MEDITATION_TRACKS } from '../../data/MeditationTracks';

interface MeditationPlayerProps {
  content: FitnessContent | null;
  onClose: () => void;
}

export const MeditationPlayer: React.FC<MeditationPlayerProps> = ({ content, onClose }) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const toast = useToast();
  const [timeRemaining, setTimeRemaining] = useState((content?.duration_minutes || 5) * 60);
  const [phase, setPhase] = useState<"Prepare" | "Inhale" | "Hold" | "Exhale" | "Rest">("Prepare");
  const [isCompleted, setIsCompleted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [activeTrackIndex, setActiveTrackIndex] = useState(0);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [showPlaylist, setShowPlaylist] = useState(content?.id === 'm1');
  
  const currentTrack = content?.id === 'm1' ? MEDITATION_TRACKS[activeTrackIndex] : null;

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(e => console.log('Audio play error:', e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, activeTrackIndex, content]);

  
  const pattern = content?.breathwork_pattern || { inhale: 4, hold: 4, exhale: 4, rest: 0 };
  const totalDuration = (content?.duration_minutes || 5) * 60;

  useEffect(() => {
    if (content) {
      setTimeRemaining(totalDuration);
      setIsPlaying(true);
      setIsCompleted(false);
      setPhase("Prepare");
    }
  }, [content, totalDuration]);

  // Timer Countdown
  useEffect(() => {
    if (!isPlaying || isCompleted || timeRemaining <= 0) return;
    const timer = setInterval(() => {
      setTimeRemaining(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [isPlaying, isCompleted]);

  useEffect(() => {
    if (timeRemaining === 0 && isPlaying && !isCompleted) {
      handleComplete();
    }
  }, [timeRemaining, isPlaying, isCompleted]);

  // Breathing Phase Logic
  useEffect(() => {
    if (!isPlaying || isCompleted) return;
    
    // Auto-hide controls after 3 seconds of playing
    const hideTimer = setTimeout(() => setShowControls(false), 3000);
    let timeoutId: NodeJS.Timeout;
    
    const nextPhase = () => {
      triggerHapticLight();
      setPhase(current => {
        switch (current) {
          case "Prepare": return "Inhale";
          case "Inhale": return pattern.hold > 0 ? "Hold" : "Exhale";
          case "Hold": return "Exhale";
          case "Exhale": return pattern.rest > 0 ? "Rest" : "Inhale";
          case "Rest": return "Inhale";
          default: return "Inhale";
        }
      });
    };

    const getPhaseDuration = (p: string) => {
      if (p === "Prepare") return 3000;
      if (p === "Inhale") return pattern.inhale * 1000;
      if (p === "Hold") return pattern.hold * 1000;
      if (p === "Exhale") return pattern.exhale * 1000;
      if (p === "Rest") return pattern.rest * 1000;
      return 4000;
    };

    timeoutId = setTimeout(nextPhase, getPhaseDuration(phase));

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(hideTimer);
    };
  }, [isPlaying, phase, pattern, isCompleted]);

  const handleComplete = async () => {
    setIsCompleted(true);
    setIsPlaying(false);
    triggerHapticLight();
    
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user && content) {
      try {
        await FitnessService.completeWorkoutSession(
          session.user.id, 
          content.id, 
          totalDuration, 
          content.calories_estimate || 0
        );
      } catch (err) {
        console.error("Failed to log session", err);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return createPortal(
    <AnimatePresence>
      {content && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            backgroundColor: "#000",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden"
          }}
          onClick={() => setShowControls(true)}
        >
          {isCompleted ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ zIndex: 10, textAlign: "center", color: "white", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%" }}
            >
              <Confetti width={window.innerWidth} height={window.innerHeight} recycle={false} colors={["#10B981", "#ffffff"]} />
              <h2 style={{ fontSize: "32px", fontWeight: 800 }}>Session Complete</h2>
              <p style={{ opacity: 0.8, marginTop: "8px" }}>Your mindful minutes have been logged.</p>
              <button 
                onClick={onClose}
                style={{ marginTop: "32px", padding: "16px 32px", borderRadius: "30px", background: "white", color: "black", fontSize: "18px", fontWeight: 700, border: "none" }}
              >
                Done
              </button>
            </motion.div>
          ) : (
            <>
              {/* Premium Ambient Background */}
              <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
                                <img 
                  src={content?.id === 'm1' && currentTrack ? currentTrack.cover : (content.cover_image_url || "https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?w=800&q=80")} 
                  alt="Ambient"  
                  style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                />
                {/* Heavy Apple-style overlay for contrast */}
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.6) 100%)" }} />
                <div style={{ position: "absolute", inset: 0, backdropFilter: "blur(2px)" }} />
              </div>

              {/* Top Bar (Close button) */}
              <AnimatePresence>
                {showControls && (
                  <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "var(--safe-area-top, 44px) 24px 24px", zIndex: 20 }}
                  >
                    <button 
                      onClick={onClose}
                      style={{ width: "40px", height: "40px", background: "transparent", border: "none", display: "flex", alignItems: "center", cursor: "pointer", padding: 0 }}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Center Breathing Rings */}
              <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
                <motion.div
                  animate={{ scale: content?.id === 'm1' ? (isPlaying ? [1, 1.2, 1] : 1) : (phase === "Inhale" || phase === "Hold" ? 2.5 : 1) }}
                  transition={{ 
                    duration: content?.id === 'm1' ? 8 : (phase === "Inhale" ? pattern.inhale : phase === "Exhale" ? pattern.exhale : 2), 
                    ease: "easeInOut",
                    repeat: content?.id === 'm1' && isPlaying ? Infinity : 0
                  }}
                  style={{ position: "relative", width: "120px", height: "120px" }}
                >
                  {/* Concentric rings */}
                  <div style={{ position: "absolute", inset: "-60px", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "50%" }} />
                  <div style={{ position: "absolute", inset: "-20px", border: "1px solid rgba(255,255,255,0.25)", borderRadius: "50%" }} />
                  <div style={{ position: "absolute", inset: "20px", border: "1px solid rgba(255,255,255,0.4)", borderRadius: "50%" }} />
                </motion.div>
              </div>

              {/* Bottom Controls */}
              <AnimatePresence>
                {showControls && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    style={{ position: "absolute", bottom: "env(safe-area-inset-bottom, 32px)", left: "24px", right: "24px", zIndex: 20 }}
                  >
                    

                                        {/* Content Info */}
                    {content?.id === 'm1' && currentTrack && (
                      <audio 
                        ref={audioRef} 
                        src={currentTrack.audioUrl} 
                        loop 
                        autoPlay={isPlaying}
                      />
                    )}
                    <div style={{ marginBottom: "32px", textAlign: "center", textShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>
                                            <h3 style={{ margin: "0 0 8px", fontSize: "24px", fontWeight: 700, color: "white", letterSpacing: "-0.5px" }}>
                        {content?.id === 'm1' && currentTrack ? currentTrack.title : content.title}
                      </h3>
                      <p style={{ margin: 0, fontSize: "14px", color: "rgba(255,255,255,0.85)", lineHeight: 1.5, maxWidth: "300px", marginLeft: "auto", marginRight: "auto" }}>
                        {content?.id === 'm1' && currentTrack ? currentTrack.subtitle : content.description}
                      </p>
                    </div>

                    {/* Media Buttons */}
                    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "32px", marginBottom: "32px", position: "relative" }}>
                      {/* Previous Track / Rewind */}
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          triggerHapticLight(); 
                          if (content?.id === 'm1') {
                            setActiveTrackIndex(prev => prev > 0 ? prev - 1 : MEDITATION_TRACKS.length - 1);
                          } else {
                            setTimeRemaining(prev => Math.min(totalDuration, prev + 15)); 
                          }
                        }}
                        style={{ background: "none", border: "none", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
                      >
                        {content?.id === 'm1' ? (
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="19 20 9 12 19 4 19 20"></polygon><line x1="5" y1="19" x2="5" y2="5"></line></svg>
                        ) : (
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v6h6"></path><path d="M3 13a9 9 0 1 0 3-7.7L3 8"></path><text x="12" y="15" textAnchor="middle" fontSize="6" fill="rgba(255,255,255,0.8)" strokeWidth="0">15</text></svg>
                        )}
                      </button>
                      
                      {/* Play / Pause */}
                      <button 
                        onClick={(e) => { e.stopPropagation(); triggerHapticLight(); setIsPlaying(!isPlaying); }}
                        style={{ width: "64px", height: "64px", borderRadius: "50%", background: "rgba(255,255,255,0.85)", backdropFilter: "blur(10px)", border: "none", display: "flex", alignItems: "center", justifyContent: "center" }}
                      >
                        {isPlaying ? <Pause size={28} fill="#000" color="#000" /> : <Play size={28} fill="#000" color="#000" style={{ marginLeft: "3px" }} />}
                      </button>

                      {/* Next Track / Forward */}
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          triggerHapticLight(); 
                          if (content?.id === 'm1') {
                            setActiveTrackIndex(prev => prev < MEDITATION_TRACKS.length - 1 ? prev + 1 : 0);
                          } else {
                            setTimeRemaining(prev => Math.max(0, prev - 15)); 
                          }
                        }}
                        style={{ background: "none", border: "none", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
                      >
                        {content?.id === 'm1' ? (
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19"></line></svg>
                        ) : (
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2v6h-6"></path><path d="M21 13a9 9 0 1 1-3-7.7L21 8"></path><text x="12" y="15" textAnchor="middle" fontSize="6" fill="rgba(255,255,255,0.8)" strokeWidth="0">15</text></svg>
                        )}
                      </button>
                      
                      {/* Tracks Button (Only for m1) */}
                      {content?.id === 'm1' && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); triggerHapticLight(); setShowPlaylist(true); }}
                          style={{ position: 'absolute', right: '0', background: "rgba(255,255,255,0.15)", backdropFilter: 'blur(10px)', border: "1px solid rgba(255,255,255,0.2)", borderRadius: '12px', padding: '8px 12px', display: "flex", alignItems: "center", gap: '6px', color: 'white', fontSize: '12px', fontWeight: 600 }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                          Tracks
                        </button>
                      )}
                    </div>
                    <div style={{ flex: 1, overflowY: "auto", padding: "12px 20px" }}>
                      {MEDITATION_TRACKS.map((track, idx) => (
                        <div 
                          key={track.id} 
                          onClick={() => { setActiveTrackIndex(idx); setIsPlaying(true); setShowPlaylist(false); }}
                          style={{ display: "flex", alignItems: "center", gap: "16px", padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", cursor: "pointer", opacity: activeTrackIndex === idx ? 1 : 0.6 }}
                        >
                          <img src={track.cover} alt={track.title} style={{ width: "48px", height: "48px", borderRadius: "8px", objectFit: "cover" }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ color: activeTrackIndex === idx ? "#38BDF8" : "white", fontSize: "15px", fontWeight: 600, marginBottom: "4px" }}>{track.title}</div>
                            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "12px" }}>{track.subtitle}</div>
                          </div>
                          {activeTrackIndex === idx && <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#38BDF8" }} />}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};


