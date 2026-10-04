import { AnimatePresence, motion } from 'framer-motion';
import { Check, Clock, Flame, Layers, Moon, Sparkles, Trophy, Wind, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import Confetti from 'react-confetti';
import { createPortal } from 'react-dom';
import FocusTrap from '../../components/ui/FocusTrap';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../components/ui/ToastProvider';
import {
  DEEP_FOCUS_TRACKS,
  DEEP_SLEEP_TRACKS,
  FOCUS_FREQUENCIES_TRACKS,
  FOREST_AMBIENCE_TRACKS,
  HAPPY_HIGH_ENERGY_TRACKS,
  MEDITATION_TRACKS,
  RAIN_SOUNDS_TRACKS,
} from '../../data/MeditationTracks';
import { captureAccountScope, isAccountScopeCurrent } from '../../services/AccountScope';
import { FitnessContent, FitnessService } from '../../services/FitnessService';
import { triggerHapticLight, triggerHapticSuccess } from '../../services/haptics';
import { flushHealthMemory, recordHealthMemory } from '../../services/HealthMemory';
import { awardPoints, getVitalityState } from '../../services/VitalityPointsEngine';
import { trackEvent } from '../../services/analytics';
import { useActionIslandStore } from '../../stores/actionIslandStore';

import { LivingAtmosphereCanvas, type AtmosphereTheme } from './LivingAtmosphereCanvas';
import { useAudioDownloads, useAudioSource } from './useAudioLibrary';
import { SoundPlayerControls } from './SoundPlayerControls';
import { SoundLibrary } from './SoundLibrary';

// Dual-Layer Ambient Soundscape Mixer
export type AmbientLayerKey = 'off' | 'rain' | 'forest' | 'frequency';

function getMindfulStreakDays(): number {
  const activeDates = new Set(
    getVitalityState()
      .history.filter((entry) => entry.category === 'mindful' && entry.date)
      .map((entry) => new Date(entry.date).toLocaleDateString('en-CA'))
  );
  const cursor = new Date();
  if (!activeDates.has(cursor.toLocaleDateString('en-CA'))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (activeDates.has(cursor.toLocaleDateString('en-CA'))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export const AMBIENT_LAYERS: Record<AmbientLayerKey, { label: string; icon: string; url: string }> =
  {
    off: { label: 'None', icon: 'Off', url: '' },
    rain: { label: 'Rain on Glass', icon: '🌧️', url: '/audio/Raindrops on Glass.m4a' },
    forest: { label: 'Whispering Pines', icon: '🍃', url: '/audio/Whispering Pines.m4a' },
    frequency: { label: '432Hz Resonant Drone', icon: '〰️', url: '/audio/432Hz Clarity.m4a' },
  };

interface MeditationPlayerProps {
  content: FitnessContent | null;
  onClose: () => void;
}

export const MeditationPlayer: React.FC<MeditationPlayerProps> = ({ content, onClose }) => {
  const measuredAudio = useRef(new WeakSet<HTMLAudioElement>());
  const navigate = useNavigate();
  const [isPlaying, setIsPlaying] = useState(true);
  const toast = useToast();
  const [timeRemaining, setTimeRemaining] = useState((content?.duration_minutes || 5) * 60);
  const [isCompleted, setIsCompleted] = useState(false);
  const [mediaActive, setMediaActive] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [audioError, setAudioError] = useState('');
  const [retryRevision, setRetryRevision] = useState(0);
  const [repeatMode, setRepeatMode] = useState<'all' | 'one' | 'off'>('all');
  const [shuffle, setShuffle] = useState(false);
  const shufflePlayed = useRef(new Set<number>([0]));
  const library = useAudioDownloads();
  const playAttempt = useRef(0);
  const [saveError, setSaveError] = useState('');
  const scopeRef = useRef(captureAccountScope());
  const sessionIdRef = useRef(crypto.randomUUID());
  const sessionStartRef = useRef<Promise<any> | null>(null);
  const participationRef = useRef(0);
  const completingRef = useRef(false);
  const [showControls, setShowControls] = useState(true);
  const [activeTrackIndex, setActiveTrackIndex] = useState(0);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showSleepTimerSheet, setShowSleepTimerSheet] = useState(false);
  const [sleepTimerOption, setSleepTimerOption] = useState<
    'off' | '15' | '30' | '45' | '60' | 'end_of_track'
  >('off');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const resetAudioVolume = () => {
    if (audioRef.current) audioRef.current.volume = 1;
  };

  const contentTitleLower = (content?.title || '').toLowerCase();
  const contentTypeLower = (content?.type || '').toLowerCase();

  const isSleep =
    content?.id === 'mood-0' ||
    contentTypeLower === 'sleep_story' ||
    contentTitleLower.includes('sleep') ||
    contentTitleLower.includes('slumber') ||
    contentTitleLower.includes('lullaby') ||
    contentTitleLower.includes('ocean');
  const isRain =
    content?.id === 'soundscape-0' ||
    contentTitleLower.includes('rain') ||
    contentTitleLower.includes('storm') ||
    contentTitleLower.includes('drizzle');
  const isFrequency =
    content?.id === 'soundscape-1' ||
    contentTitleLower.includes('frequency') ||
    contentTitleLower.includes('frequencies') ||
    contentTitleLower.includes('hz') ||
    contentTitleLower.includes('cymatic') ||
    contentTitleLower.includes('binaural');
  const isForest =
    content?.id === 'soundscape-2' ||
    contentTitleLower.includes('forest') ||
    contentTitleLower.includes('woodland') ||
    contentTitleLower.includes('pines') ||
    contentTitleLower.includes('nature');
  const isFocus =
    content?.id === 'mood-1' ||
    contentTitleLower.includes('focus') ||
    contentTitleLower.includes('study') ||
    contentTitleLower.includes('work') ||
    contentTitleLower.includes('productivity');
  const isEnergy =
    content?.id === 'mood-2' ||
    contentTitleLower.includes('energy') ||
    contentTitleLower.includes('morning') ||
    contentTitleLower.includes('wake') ||
    contentTitleLower.includes('vitality');

  const playlistTitle = isSleep
    ? contentTitleLower.includes('ocean')
      ? 'Ocean Waves'
      : 'Deep Sleep'
    : isRain
      ? 'Rain Sounds'
      : isFrequency
        ? 'Focus Frequencies'
        : isForest
          ? 'Forest Ambience'
          : isFocus
            ? 'Deep Focus'
            : isEnergy
              ? 'Morning Energy'
              : content?.title || 'Full Meditation';

  // Point 2: Dual-Layer Ambient Soundscape Mixer
  const ambientAudioRef = useRef<HTMLAudioElement | null>(null);
  const [ambientLayer, setAmbientLayer] = useState<AmbientLayerKey>('off');
  const [ambientVolume, setAmbientVolume] = useState<number>(0.26);
  const [showAmbientMixer, setShowAmbientMixer] = useState<boolean>(false);
  const ambientSource = useAudioSource(
    ambientLayer === 'off' ? undefined : AMBIENT_LAYERS[ambientLayer].url
  );

  useEffect(() => {
    const audio = ambientAudioRef.current;
    if (audio) audio.volume = isMuted ? 0 : ambientVolume;
  }, [ambientVolume, isMuted, ambientSource.src]);

  useEffect(() => {
    const audio = ambientAudioRef.current;
    let cancelled = false;
    if (audio && ambientLayer !== 'off' && mediaActive) {
      void audio.play().catch((error) => {
        if (cancelled || audio !== ambientAudioRef.current || error?.name === 'AbortError') return;
        setAmbientLayer('off');
        toast.error(
          'Ambient sound unavailable',
          'Try selecting the layer again while your sound is playing.'
        );
      });
    } else audio?.pause();
    return () => {
      cancelled = true;
    };
  }, [mediaActive, ambientLayer, ambientSource.src]);

  // Point 3: Post-Session Mindful Summary & Streak Celebration
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    minutesLogged: 5,
    pointsAwarded: 0,
    mindfulStreak: getMindfulStreakDays(),
  });

  // Point 5: Dismiss Island on Player active open
  useEffect(() => {
    useActionIslandStore.getState().dismissIsland();
  }, []);

  const currentPlaylist = isSleep
    ? DEEP_SLEEP_TRACKS
    : isRain
      ? RAIN_SOUNDS_TRACKS
      : isFrequency
        ? FOCUS_FREQUENCIES_TRACKS
        : isForest
          ? FOREST_AMBIENCE_TRACKS
          : isFocus
            ? DEEP_FOCUS_TRACKS
            : isEnergy
              ? HAPPY_HIGH_ENERGY_TRACKS
              : MEDITATION_TRACKS;

  const isPlaylistMode = currentPlaylist.length > 0;
  const currentTrack = isPlaylistMode
    ? currentPlaylist[activeTrackIndex % currentPlaylist.length]
    : null;

  const source = useAudioSource(currentTrack?.audioUrl, retryRevision);

  useEffect(() => {
    if (source.error) {
      setAudioError(source.error);
      setIsPlaying(false);
      setBuffering(false);
    }
  }, [source.error, retryRevision]);

  const atmosphereTheme: AtmosphereTheme =
    isSleep ||
    (currentTrack &&
      (currentTrack.title.includes('Sleep') ||
        currentTrack.title.includes('Lullaby') ||
        currentTrack.title.includes('Dream')))
      ? 'sleep'
      : isRain || (currentTrack && currentTrack.title.includes('Rain'))
        ? 'rain'
        : isFrequency ||
            (currentTrack &&
              (currentTrack.title.includes('Frequency') ||
                currentTrack.title.includes('Hz') ||
                currentTrack.title.includes('Wave') ||
                currentTrack.title.includes('Quantum')))
          ? 'frequency'
          : isForest ||
              (currentTrack &&
                (currentTrack.title.includes('Forest') ||
                  currentTrack.title.includes('Pines') ||
                  currentTrack.title.includes('Woodland')))
            ? 'forest'
            : isFocus ||
                (currentTrack &&
                  (currentTrack.title.includes('Focus') ||
                    currentTrack.title.includes('Momentum') ||
                    currentTrack.title.includes('Study')))
              ? 'focus'
              : isEnergy ||
                  (currentTrack &&
                    (currentTrack.title.includes('Energy') ||
                      currentTrack.title.includes('Sun') ||
                      currentTrack.title.includes('Morning')))
                ? 'energy'
                : 'meditation';

  const vibrationThemeColors = {
    sleep: {
      ring: 'rgba(196, 181, 253, 0.85)',
      glow: 'rgba(167, 139, 250, 0.55)',
      fill: 'rgba(167, 139, 250, 0.08)',
    },
    rain: {
      ring: 'rgba(56, 189, 248, 0.85)',
      glow: 'rgba(14, 165, 233, 0.55)',
      fill: 'rgba(56, 189, 248, 0.08)',
    },
    frequency: {
      ring: 'rgba(217, 70, 239, 0.85)',
      glow: 'rgba(168, 85, 247, 0.6)',
      fill: 'rgba(192, 132, 252, 0.1)',
    },
    forest: {
      ring: 'rgba(52, 211, 153, 0.85)',
      glow: 'rgba(16, 185, 129, 0.55)',
      fill: 'rgba(52, 211, 153, 0.08)',
    },
    energy: {
      ring: 'rgba(251, 191, 36, 0.9)',
      glow: 'rgba(245, 158, 11, 0.6)',
      fill: 'rgba(253, 224, 71, 0.12)',
    },
    focus: {
      ring: 'rgba(56, 189, 248, 0.85)',
      glow: 'rgba(56, 189, 248, 0.55)',
      fill: 'rgba(56, 189, 248, 0.08)',
    },
    meditation: {
      ring: 'rgba(56, 189, 248, 0.85)',
      glow: 'rgba(168, 85, 247, 0.55)',
      fill: 'rgba(56, 189, 248, 0.08)',
    },
  }[atmosphereTheme] || {
    ring: 'rgba(56, 189, 248, 0.85)',
    glow: 'rgba(56, 189, 248, 0.55)',
    fill: 'rgba(56, 189, 248, 0.08)',
  };

  const selectTrack = (newIndex: number) => {
    triggerHapticLight();
    playAttempt.current += 1;
    audioRef.current?.pause();
    resetAudioVolume();
    setMediaActive(false);
    setAudioError('');
    setBuffering(true);
    setCurrentTime(0);
    setDuration(0);
    const selected = (newIndex + currentPlaylist.length) % currentPlaylist.length;
    shufflePlayed.current.add(selected);
    setActiveTrackIndex(selected);
    setIsPlaying(true);
    // Selecting the current track is also an explicit replay/retry.
    if (newIndex === activeTrackIndex) setRetryRevision((value) => value + 1);
  };
  const nextTrackIndex = () => {
    if (!shuffle || currentPlaylist.length < 2)
      return (activeTrackIndex + 1) % currentPlaylist.length;
    let choices = currentPlaylist
      .map((_, index) => index)
      .filter((index) => !shufflePlayed.current.has(index));
    if (!choices.length) {
      shufflePlayed.current = new Set([activeTrackIndex]);
      choices = currentPlaylist
        .map((_, index) => index)
        .filter((index) => index !== activeTrackIndex);
    }
    return choices[Math.floor(Math.random() * choices.length)];
  };
  const startPlayback = () => {
    const audio = audioRef.current;
    if (!audio || !source.src) return;
    const attempt = ++playAttempt.current;
    setAudioError('');
    setBuffering(true);
    void audio.play().catch((error) => {
      if (attempt !== playAttempt.current || audioRef.current !== audio) return;
      if (error?.name === 'AbortError') return;
      setBuffering(false);
      setMediaActive(false);
      setIsPlaying(false);
      setAudioError(
        error?.name === 'NotAllowedError'
          ? 'Tap Play to start listening.'
          : 'This sound could not play. Check your connection and retry.'
      );
    });
  };
  const togglePlayback = () => {
    triggerHapticLight();
    if (isPlaying) {
      playAttempt.current += 1;
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      startPlayback();
    }
  };
  const seekAudio = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
    const target = Math.max(0, Math.min(seconds, audio.duration));
    audio.currentTime = target;
    setCurrentTime(target);
  };

  // Point 5: iOS Lock Screen & Dynamic Island MediaSession Integration
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    const trackTitle =
      isPlaylistMode && currentTrack ? currentTrack.title : content?.title || 'Calm Meditation';
    const rawCover =
      isPlaylistMode && currentTrack
        ? currentTrack.cover
        : content?.cover_image_url || '/images/thumb_night_clouds_1788262545783.jpg';
    const absoluteCover = rawCover.startsWith('http')
      ? rawCover
      : `${window.location.origin}${rawCover}`;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: trackTitle,
        artist: `HealthChain • ${playlistTitle}`,
        album: 'Calm Space Soundscapes',
        artwork: [{ src: absoluteCover, sizes: '512x512', type: 'image/jpeg' }],
      });

      navigator.mediaSession.playbackState = mediaActive ? 'playing' : 'paused';

      navigator.mediaSession.setActionHandler('play', () => {
        setIsPlaying(true);
        startPlayback();
        triggerHapticLight();
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        setIsPlaying(false);
        triggerHapticLight();
      });

      navigator.mediaSession.setActionHandler('previoustrack', () => {
        if (isPlaylistMode && currentPlaylist.length > 0) {
          selectTrack(activeTrackIndex > 0 ? activeTrackIndex - 1 : currentPlaylist.length - 1);
        }
      });

      navigator.mediaSession.setActionHandler('nexttrack', () => {
        if (isPlaylistMode && currentPlaylist.length > 0) {
          selectTrack(nextTrackIndex());
        }
      });

      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (typeof details.seekTime === 'number' && audioRef.current) {
          audioRef.current.currentTime = details.seekTime;
          setCurrentTime(details.seekTime);
        }
      });
    } catch (e) {
      // ignore
    }

    return () => {
      try {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
        navigator.mediaSession.setActionHandler('seekto', null);
      } catch (e) {
        // ignore
      }
    };
  }, [
    isPlaying,
    mediaActive,
    shuffle,
    activeTrackIndex,
    currentTrack,
    isPlaylistMode,
    playlistTitle,
    content,
    currentPlaylist.length,
    isMuted,
    source.src,
    retryRevision,
  ]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = isMuted;
  }, [isMuted, source.src]);

  useEffect(() => {
    if (isPlaying && source.src) startPlayback();
    else {
      playAttempt.current += 1;
      audioRef.current?.pause();
      setMediaActive(false);
      setBuffering(false);
    }
    return () => {
      playAttempt.current += 1;
    };
  }, [isPlaying, source.src, activeTrackIndex, retryRevision]);

  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      audio?.pause();
    };
  }, [source.src, activeTrackIndex, retryRevision]);

  useEffect(() => {
    const audio = ambientAudioRef.current;
    return () => {
      audio?.pause();
    };
  }, [ambientSource.src, ambientLayer]);

  useEffect(() => {
    if (!buffering || !isPlaying) return;
    const timeout = setTimeout(() => {
      setAudioError(
        'Taking longer than expected. Check your connection or try a downloaded sound.'
      );
      setIsPlaying(false);
      setBuffering(false);
    }, 20_000);
    return () => clearTimeout(timeout);
  }, [buffering, isPlaying, source.src]);

  useEffect(() => {
    if (
      !('mediaSession' in navigator) ||
      !navigator.mediaSession.setPositionState ||
      !Number.isFinite(duration) ||
      duration <= 0
    )
      return;
    try {
      navigator.mediaSession.setPositionState({
        duration,
        playbackRate: 1,
        position: Math.min(currentTime, duration),
      });
    } catch {
      /* Unsupported WebViews may omit position state. */
    }
  }, [currentTime, duration]);

  const totalDuration = (content?.duration_minutes || 5) * 60;

  useEffect(() => {
    if (content) {
      resetAudioVolume();
      setTimeRemaining(totalDuration);
      setIsPlaying(true);
      setIsCompleted(false);
      setActiveTrackIndex(0);
      shufflePlayed.current = new Set([0]);
      setMediaActive(false);
      setSaveError('');
      scopeRef.current = captureAccountScope();
      sessionIdRef.current = crypto.randomUUID();
      sessionStartRef.current = null;
      participationRef.current = 0;
      completingRef.current = false;
    }
  }, [content?.id, totalDuration]);

  useEffect(() => {
    if (
      !mediaActive ||
      !content ||
      scopeRef.current.accountId === 'guest' ||
      sessionStartRef.current
    )
      return;
    if (!isAccountScopeCurrent(scopeRef.current)) {
      setIsPlaying(false);
      setSaveError('Account changed. Close this session before starting another.');
      return;
    }
    if (!/^[0-9a-f-]{36}$/i.test(content.id)) return;
    sessionStartRef.current = FitnessService.startSession(content.id, sessionIdRef.current);
    void sessionStartRef.current.catch(() => {
      setIsPlaying(false);
      setSaveError('This activity could not be started. Close and reopen it to retry.');
    });
  }, [mediaActive, content?.id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      resetAudioVolume();
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (ambientAudioRef.current) {
        ambientAudioRef.current.pause();
      }
    };
  }, []);

  // Keep the transport available while listening; Zen mode hides it explicitly.
  const resetControlsTimeout = () => {
    setShowControls(!isZenMode);
  };

  useEffect(() => {
    resetControlsTimeout();
  }, [isPlaying, mediaActive, audioError, showPlaylist, showAmbientMixer, showSleepTimerSheet]);

  // Point 4: Session Countdown Timer & 10s Exponential Volume Fade-Out
  useEffect(() => {
    if (!isPlaying || !mediaActive || isCompleted || timeRemaining <= 0) return;
    let previous = performance.now();
    const timer = setInterval(() => {
      const now = performance.now();
      participationRef.current += (now - previous) / 1000;
      previous = now;
      setTimeRemaining((prev) => {
        const next = Math.max(0, prev - 1);
        // Fade volume out over last 10 seconds
        if (next <= 10 && next > 0 && audioRef.current && !isMuted) {
          audioRef.current.volume = Math.max(0, next / 10);
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isPlaying, mediaActive, isCompleted, timeRemaining, isMuted]);

  useEffect(() => {
    if (timeRemaining === 0 && isPlaying && !isCompleted) {
      if (audioRef.current) {
        audioRef.current.volume = 0;
        audioRef.current.pause();
      }
      handleComplete();
    }
  }, [timeRemaining, isPlaying, isCompleted]);

  // Point 3: Post-Session Mindful Summary & Streak Celebration
  const handleComplete = async () => {
    if (completingRef.current || isCompleted) return;
    completingRef.current = true;
    setIsPlaying(false);
    const scope = scopeRef.current;
    const actualSeconds = Math.floor(participationRef.current);
    try {
      if (!isAccountScopeCurrent(scope))
        throw new Error('Account changed. This session was not saved.');
      if (actualSeconds < 1)
        throw new Error('No playback participation was recorded. Play the audio before saving.');
      if (content && /^[0-9a-f-]{36}$/i.test(content.id) && scope.accountId !== 'guest') {
        if (!sessionStartRef.current) throw new Error('No started activity session was found.');
        const started = await sessionStartRef.current;
        if (!isAccountScopeCurrent(scope)) throw new Error('Account changed.');
        await FitnessService.completeSession(started.session_id, actualSeconds);
      }
      if (!isAccountScopeCurrent(scope)) throw new Error('Account changed.');
      recordHealthMemory({
        kind: 'health_buddy',
        source: 'wellness_participation',
        title: content?.title || 'Audio relaxation',
        occurredAt: new Date().toISOString(),
        dedupeKey: 'wellness_' + sessionIdRef.current,
        payload: {
          userConfirmed: true,
          participationSeconds: actualSeconds,
          contentId: content?.id,
          calories: null,
        },
      });
      await flushHealthMemory(scope);
      setSaveError('');
      setIsCompleted(true);
      triggerHapticSuccess();
      setShowConfetti(true);

      const minutesLogged = Math.round((actualSeconds / 60) * 10) / 10;
      const pointsAwarded = awardPoints(5, 'Completed Mindful Meditation Session', 'mindful')
        ? 5
        : 0;

      setSessionStats({
        minutesLogged,
        pointsAwarded,
        mindfulStreak: getMindfulStreakDays(),
      });
      setShowSummaryModal(true);
    } catch (error: any) {
      setSaveError(error.message || 'Participation could not be saved. Retry.');
      toast.error('Session needs attention', error.message || 'Save failed.');
    } finally {
      completingRef.current = false;
    }
  };

  // Point 5: Action Island Calm Trigger on Player Minimize
  const handleClose = () => {
    triggerHapticLight();
    if (isPlaying) {
      const trackTitle =
        isPlaylistMode && currentTrack ? currentTrack.title : content?.title || 'Calm Meditation';
      useActionIslandStore
        .getState()
        .triggerIsland('calm', `${trackTitle}`, `${playlistTitle} • Paused`, 'Restart', () => {
          window.dispatchEvent(new CustomEvent('hc_reopen_meditation'));
        });
    } else {
      useActionIslandStore.getState().dismissIsland();
    }
    onClose();
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Point 8: Eyes-Closed Zen Mode (Double-tap canvas gesture)
  const [isZenMode, setIsZenMode] = useState(false);
  const [zenToastVisible, setZenToastVisible] = useState(false);
  const zenToastTimeoutRef = useRef<any>(null);

  const toggleZenMode = (e?: React.MouseEvent) => {
    e?.stopPropagation?.();
    triggerHapticLight();
    setIsZenMode((prev) => {
      const next = !prev;
      if (next) {
        setShowControls(false);
        setZenToastVisible(true);
        if (zenToastTimeoutRef.current) clearTimeout(zenToastTimeoutRef.current);
        zenToastTimeoutRef.current = setTimeout(() => setZenToastVisible(false), 3200);
      } else {
        setShowControls(true);
        setZenToastVisible(false);
      }
      return next;
    });
  };

  // Keyboard Navigation & Escape Dismissal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (showSummaryModal) {
          setShowSummaryModal(false);
          setShowConfetti(false);
        } else if (showAmbientMixer) {
          setShowAmbientMixer(false);
        } else if (showSleepTimerSheet) {
          setShowSleepTimerSheet(false);
        } else if (showPlaylist) {
          setShowPlaylist(false);
        } else if (isZenMode) {
          setIsZenMode(false);
          setShowControls(true);
        } else {
          handleClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    showSummaryModal,
    showAmbientMixer,
    showSleepTimerSheet,
    showPlaylist,
    isZenMode,
    isPlaying,
    isPlaylistMode,
    currentTrack,
    content,
    playlistTitle,
  ]);

  const handleTrackEnded = () => {
    setMediaActive(false);
    if (sleepTimerOption === 'end_of_track') {
      void handleComplete();
      return;
    }
    if (repeatMode === 'one') {
      seekAudio(0);
      startPlayback();
      return;
    }
    if (
      repeatMode === 'off' &&
      (shuffle
        ? shufflePlayed.current.size >= currentPlaylist.length
        : activeTrackIndex === currentPlaylist.length - 1)
    ) {
      setIsPlaying(false);
      return;
    }
    selectTrack(nextTrackIndex());
  };

  return createPortal(
    <AnimatePresence>
      {content && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            top: 'var(--app-viewport-top, 0px)',
            left: 0,
            right: 0,
            height: 'var(--app-viewport-height)',
            zIndex: 9999,
            backgroundColor: '#050811',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            userSelect: 'none',
            WebkitUserSelect: 'none',
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Calm audio player"
          onDoubleClick={toggleZenMode}
          onClick={() => {
            if (isZenMode) {
              setZenToastVisible(true);
              if (zenToastTimeoutRef.current) clearTimeout(zenToastTimeoutRef.current);
              zenToastTimeoutRef.current = setTimeout(() => setZenToastVisible(false), 2600);
              return;
            }
            resetControlsTimeout();
            if (audioRef.current && isPlaying && audioRef.current.paused) {
              startPlayback();
            }
          }}
        >
          <FocusTrap>
            {saveError && (
              <div
                role="alert"
                style={{
                  position: 'absolute',
                  top: 'calc(20px + var(--safe-area-top, 0px))',
                  left: 20,
                  right: 20,
                  zIndex: 20,
                  background: '#fff',
                  color: '#0f172a',
                  padding: 16,
                  borderRadius: 16,
                }}
              >
                {saveError}{' '}
                <button
                  type="button"
                  style={{ minHeight: 44 }}
                  onClick={() => void handleComplete()}
                >
                  Retry saving participation
                </button>
              </div>
            )}
            {/* Point 8: Zen Mode Floating Feedback Pill */}
            <AnimatePresence>
              {zenToastVisible && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                  style={{
                    position: 'absolute',
                    top: 'calc(var(--safe-area-top, 0px) + 24px)',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 100,
                    background: 'rgba(15, 23, 42, 0.82)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    borderRadius: '24px',
                    padding: '8px 18px',
                    color: 'rgba(255, 255, 255, 0.95)',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    pointerEvents: 'none',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
                  }}
                >
                  <Sparkles size={14} color="#38BDF8" />
                  <span>
                    {isZenMode
                      ? 'Zen Mode Active • Double-tap canvas to restore controls'
                      : 'Controls Restored'}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {isCompleted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                  zIndex: 10,
                  textAlign: 'center',
                  color: 'white',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  padding: '24px',
                }}
              >
                <Confetti
                  width={window.innerWidth}
                  height={window.innerHeight}
                  recycle={false}
                  colors={['#10B981', '#38BDF8', '#FFFFFF']}
                />
                <div
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background:
                      'linear-gradient(135deg, rgba(16, 185, 129, 0.3) 0%, rgba(16, 185, 129, 0.1) 100%)',
                    border: '1px solid rgba(16, 185, 129, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '24px',
                    boxShadow: '0 0 30px rgba(16, 185, 129, 0.25)',
                  }}
                >
                  <Check size={40} color="#10B981" />
                </div>
                <h2
                  style={{
                    fontSize: '32px',
                    fontWeight: 800,
                    margin: '0 0 8px',
                    letterSpacing: '-0.5px',
                  }}
                >
                  Mindful Session Complete
                </h2>
                <p
                  style={{
                    color: 'rgba(255, 255, 255, 0.75)',
                    margin: '0 0 32px',
                    fontSize: '15px',
                  }}
                >
                  Your mindful state has been preserved and vitality logged.
                </p>
                <button
                  onClick={onClose}
                  style={{
                    padding: '16px 40px',
                    borderRadius: '30px',
                    background: 'linear-gradient(135deg, #FFFFFF 0%, #E2E8F0 100%)',
                    color: '#0F172A',
                    fontSize: '16px',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
                  }}
                >
                  Return to Calm Space
                </button>
              </motion.div>
            ) : (
              <>
                {/* Cinematic Ambient Background Layer */}
                <div style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden' }}>
                  <motion.img
                    key={isPlaylistMode && currentTrack ? currentTrack.id : content.id}
                    initial={{ scale: 1, opacity: 0 }}
                    animate={{
                      scale: [1, 1.08, 1.02, 1],
                      x: [0, -12, 8, 0],
                      y: [0, 8, -6, 0],
                      opacity: 0.88,
                    }}
                    transition={{
                      scale: { duration: 40, repeat: Infinity, ease: 'easeInOut' },
                      x: { duration: 40, repeat: Infinity, ease: 'easeInOut' },
                      y: { duration: 40, repeat: Infinity, ease: 'easeInOut' },
                      opacity: { duration: 0.8 },
                    }}
                    src={
                      isPlaylistMode && currentTrack
                        ? currentTrack.cover
                        : content.id === 'mood-0'
                          ? '/images/thumb_night_clouds_1788262545783.jpg'
                          : content.cover_image_url ||
                            '/images/thumb_night_clouds_1788262545783.jpg'
                    }
                    alt="Atmosphere"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  {/* Multi-Stage Cinematic Vignette */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background:
                        'radial-gradient(ellipse at center, rgba(5, 8, 17, 0.12) 0%, rgba(5, 8, 17, 0.52) 60%, rgba(5, 8, 17, 0.92) 100%)',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background:
                        'linear-gradient(to bottom, rgba(5, 8, 17, 0.6) 0%, transparent 25%, transparent 65%, rgba(5, 8, 17, 0.95) 100%)',
                    }}
                  />
                  {/* 60fps Living Particle Atmosphere Engine */}
                  <LivingAtmosphereCanvas theme={atmosphereTheme} isPlaying={isPlaying} />
                </div>

                {currentTrack && (
                  <audio
                    key={`${currentTrack.id}:${retryRevision}`}
                    ref={audioRef}
                    src={source.src || undefined}
                    preload="metadata"
                    playsInline
                    onPlaying={(event) => {
                      if (event.currentTarget !== audioRef.current) return;
                      if (!measuredAudio.current.has(event.currentTarget)) {
                        measuredAudio.current.add(event.currentTarget);
                        trackEvent('audio_action', { action: source.offline ? 'offline_playing' : 'playing' });
                      }
                      setMediaActive(true);
                      setBuffering(false);
                      setAudioError('');
                    }}
                    onPause={(event) => {
                      if (event.currentTarget !== audioRef.current) return;
                      setMediaActive(false);
                      if (!event.currentTarget.ended) setIsPlaying(false);
                    }}
                    onWaiting={() => {
                      setMediaActive(false);
                      setBuffering(true);
                    }}
                    onError={() => {
                      trackEvent('audio_action', { action: 'playback_failed' });
                      setMediaActive(false);
                      setBuffering(false);
                      setIsPlaying(false);
                      setAudioError(
                        navigator.onLine === false
                          ? 'You are offline. Choose a downloaded sound from your library.'
                          : 'This sound could not load. Check your connection and retry.'
                      );
                    }}
                    onTimeUpdate={(event) => {
                      if (event.currentTarget !== audioRef.current) return;
                      setCurrentTime(event.currentTarget.currentTime);
                    }}
                    onLoadedMetadata={(event) => {
                      if (Number.isFinite(event.currentTarget.duration))
                        setDuration(event.currentTarget.duration);
                    }}
                    onEnded={handleTrackEnded}
                  />
                )}
                {ambientSource.src && (
                  <audio
                    ref={ambientAudioRef}
                    src={ambientSource.src}
                    loop
                    preload="metadata"
                    playsInline
                    onError={() => {
                      setAmbientLayer('off');
                      toast.error(
                        'Ambient sound unavailable',
                        'Check your connection or download the sound for offline listening.'
                      );
                    }}
                  />
                )}

                {/* Top Navigation Bar */}
                <AnimatePresence>
                  {showControls && (
                    <motion.div
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.25 }}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        padding: 'calc(var(--safe-area-top, 0px) + 16px) 20px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        zIndex: 30,
                      }}
                    >
                      {/* Frosted Close Pill */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClose();
                        }}
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '50%',
                          background:
                            'linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.05) 100%)',
                          backdropFilter: 'blur(20px)',
                          WebkitBackdropFilter: 'blur(20px)',
                          border: '1px solid rgba(255, 255, 255, 0.3)',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                        }}
                        aria-label="Close Player"
                      >
                        <X size={20} />
                      </button>

                      {/* Environment / Track Info Pill (Point 1: Single-Line Mobile Fit) */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 14px',
                          borderRadius: '20px',
                          background:
                            'linear-gradient(135deg, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0.05) 100%)',
                          backdropFilter: 'blur(20px)',
                          WebkitBackdropFilter: 'blur(20px)',
                          border: '1px solid rgba(255, 255, 255, 0.25)',
                          color: 'white',
                          fontSize: '13px',
                          fontWeight: 600,
                          letterSpacing: '-0.2px',
                          whiteSpace: 'nowrap',
                          minWidth: 0,
                          flexShrink: 1,
                        }}
                      >
                        <span
                          style={{
                            color: vibrationThemeColors.ring,
                            display: 'flex',
                            alignItems: 'center',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <Wind size={13} style={{ marginRight: '4px', flexShrink: 0 }} />
                          {playlistTitle}
                        </span>
                        {isPlaylistMode && currentPlaylist.length > 0 && (
                          <span style={{ opacity: 0.65, whiteSpace: 'nowrap', fontSize: '12px' }}>
                            • {activeTrackIndex + 1}/{currentPlaylist.length}
                          </span>
                        )}
                      </div>

                      {/* Point 4: Interactive Sleep Timer & Session Countdown Pill */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerHapticLight();
                          setShowSleepTimerSheet(true);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          borderRadius: '20px',
                          background:
                            sleepTimerOption !== 'off'
                              ? `linear-gradient(135deg, ${vibrationThemeColors.glow} 0%, rgba(255, 255, 255, 0.1) 100%)`
                              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0.05) 100%)',
                          backdropFilter: 'blur(20px)',
                          WebkitBackdropFilter: 'blur(20px)',
                          border:
                            sleepTimerOption !== 'off'
                              ? `1px solid ${vibrationThemeColors.ring}`
                              : '1px solid rgba(255, 255, 255, 0.25)',
                          color: 'white',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          boxShadow:
                            sleepTimerOption !== 'off'
                              ? `0 0 16px ${vibrationThemeColors.glow}`
                              : 'none',
                        }}
                        aria-label="Set Sleep Timer"
                      >
                        {sleepTimerOption !== 'off' ? (
                          <Moon size={14} style={{ color: vibrationThemeColors.ring }} />
                        ) : (
                          <Clock size={14} style={{ opacity: 0.75 }} />
                        )}
                        <span>{formatTime(timeRemaining)}</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {!isZenMode && currentTrack && (
                  <div className="hc-sound-stage">
                    <img src={currentTrack.cover} alt="" />
                    <p>A little space to breathe.</p>
                  </div>
                )}

                {showControls && currentTrack && (
                  <>
                    <SoundPlayerControls
                      track={currentTrack}
                      collection={playlistTitle}
                      playing={isPlaying}
                      active={mediaActive}
                      buffering={buffering || (isPlaying && !source.src)}
                      error={audioError}
                      offline={source.offline}
                      currentTime={currentTime}
                      duration={duration}
                      muted={isMuted}
                      repeat={repeatMode}
                      shuffle={shuffle}
                      downloads={library.downloads}
                      pending={library.pending}
                      canDownload={library.supported}
                      onToggle={togglePlayback}
                      onPrevious={() =>
                        currentTime > 3 ? seekAudio(0) : selectTrack(activeTrackIndex - 1)
                      }
                      onNext={() => selectTrack(nextTrackIndex())}
                      onSeek={seekAudio}
                      onMute={() => setIsMuted((value) => !value)}
                      onLibrary={() => setShowPlaylist(true)}
                      onMixer={() => setShowAmbientMixer(true)}
                      onRetry={() => {
                        setRetryRevision((value) => value + 1);
                        setAudioError('');
                        setIsPlaying(true);
                      }}
                      onRepeat={() =>
                        setRepeatMode((value) =>
                          value === 'all' ? 'one' : value === 'one' ? 'off' : 'all'
                        )
                      }
                      onShuffle={() => {
                        shufflePlayed.current = new Set([activeTrackIndex]);
                        setShuffle((value) => !value);
                      }}
                      onDownload={() => void library.download(currentTrack.audioUrl)}
                    />
                    {library.error && (
                      <div className="hc-sound-download-notice" role="alert">
                        {library.error}
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setShowPlaylist(true);
                          }}
                        >
                          Open library
                        </button>
                      </div>
                    )}
                  </>
                )}

                {showPlaylist && (
                  <SoundLibrary
                    tracks={currentPlaylist}
                    title={playlistTitle}
                    active={activeTrackIndex}
                    playing={mediaActive}
                    library={library}
                    onClose={() => setShowPlaylist(false)}
                    onSelect={(index) => {
                      selectTrack(index);
                      setShowPlaylist(false);
                    }}
                  />
                )}

                {/* Point 4: Ultra-Sheer Glass Sleep Timer Bottom Sheet */}
                <AnimatePresence>
                  {showSleepTimerSheet && (
                    <>
                      {/* Backdrop */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowSleepTimerSheet(false)}
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'rgba(0, 0, 0, 0.65)',
                          backdropFilter: 'blur(10px)',
                          WebkitBackdropFilter: 'blur(10px)',
                          zIndex: 45,
                        }}
                      />

                      {/* Sheet Content */}
                      <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          background:
                            'linear-gradient(135deg, rgba(17, 24, 39, 0.92) 0%, rgba(10, 15, 29, 0.98) 100%)',
                          backdropFilter: 'blur(32px)',
                          WebkitBackdropFilter: 'blur(32px)',
                          borderTop: '1px solid rgba(255, 255, 255, 0.2)',
                          boxShadow:
                            '0 -20px 50px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
                          borderTopLeftRadius: '28px',
                          borderTopRightRadius: '28px',
                          padding: '16px 20px calc(var(--safe-area-bottom, 0px) + 20px)',
                          zIndex: 50,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'center',
                            marginBottom: '16px',
                          }}
                        >
                          <div
                            style={{
                              width: '40px',
                              height: '4px',
                              borderRadius: '2px',
                              background: 'rgba(255, 255, 255, 0.3)',
                            }}
                          />
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '18px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Moon size={20} color={vibrationThemeColors.ring} />
                            <h4
                              style={{
                                margin: 0,
                                fontSize: '18px',
                                fontWeight: 700,
                                color: 'white',
                              }}
                            >
                              Sleep Timer
                            </h4>
                          </div>
                          <button
                            onClick={() => setShowSleepTimerSheet(false)}
                            style={{
                              background: 'rgba(255, 255, 255, 0.1)',
                              border: 'none',
                              borderRadius: '50%',
                              width: '32px',
                              height: '32px',
                              color: 'white',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                            }}
                          >
                            <X size={18} />
                          </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {[
                            { label: 'Off', value: 'off', durationSec: totalDuration },
                            { label: '15 Minutes', value: '15', durationSec: 15 * 60 },
                            { label: '30 Minutes', value: '30', durationSec: 30 * 60 },
                            { label: '45 Minutes', value: '45', durationSec: 45 * 60 },
                            { label: '60 Minutes (1 Hour)', value: '60', durationSec: 60 * 60 },
                            {
                              label: 'End of Current Track',
                              value: 'end_of_track',
                              durationSec: Math.max(1, Math.floor(duration - currentTime)),
                            },
                          ].map((option) => {
                            const isSelected = sleepTimerOption === option.value;
                            return (
                              <button
                                key={option.value}
                                onClick={() => {
                                  triggerHapticLight();
                                  setSleepTimerOption(option.value as any);
                                  setTimeRemaining(option.durationSec);
                                  if (audioRef.current && !isMuted) audioRef.current.volume = 1;
                                  setShowSleepTimerSheet(false);
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '14px 18px',
                                  borderRadius: '16px',
                                  background: isSelected
                                    ? `${vibrationThemeColors.glow}`
                                    : 'rgba(255, 255, 255, 0.06)',
                                  border: isSelected
                                    ? `1.5px solid ${vibrationThemeColors.ring}`
                                    : '1px solid rgba(255, 255, 255, 0.12)',
                                  color: 'white',
                                  fontSize: '15px',
                                  fontWeight: isSelected ? 700 : 500,
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                }}
                              >
                                <span
                                  style={{
                                    color: isSelected ? vibrationThemeColors.ring : 'white',
                                  }}
                                >
                                  {option.label}
                                </span>
                                {isSelected && (
                                  <Check size={18} color={vibrationThemeColors.ring} />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>

                {/* Point 2: Dual-Layer Ambient Soundscape Mixer Sheet */}
                <AnimatePresence>
                  {showAmbientMixer && (
                    <>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowAmbientMixer(false)}
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'rgba(0, 0, 0, 0.65)',
                          backdropFilter: 'blur(10px)',
                          WebkitBackdropFilter: 'blur(10px)',
                          zIndex: 45,
                        }}
                      />
                      <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          background:
                            'linear-gradient(135deg, rgba(17, 24, 39, 0.94) 0%, rgba(10, 15, 29, 0.98) 100%)',
                          backdropFilter: 'blur(32px)',
                          WebkitBackdropFilter: 'blur(32px)',
                          borderTop: '1px solid rgba(255, 255, 255, 0.2)',
                          boxShadow:
                            '0 -20px 50px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
                          borderTopLeftRadius: '28px',
                          borderTopRightRadius: '28px',
                          padding: '16px 20px calc(var(--safe-area-bottom, 0px) + 20px)',
                          zIndex: 50,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'center',
                            marginBottom: '16px',
                          }}
                        >
                          <div
                            style={{
                              width: '40px',
                              height: '4px',
                              borderRadius: '2px',
                              background: 'rgba(255, 255, 255, 0.3)',
                            }}
                          />
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '18px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Layers size={20} color={vibrationThemeColors.ring} />
                            <div>
                              <h4
                                style={{
                                  margin: 0,
                                  fontSize: '18px',
                                  fontWeight: 700,
                                  color: 'white',
                                }}
                              >
                                Ambient Texture Layer
                              </h4>
                              <p
                                style={{
                                  margin: '2px 0 0',
                                  fontSize: '12px',
                                  color: 'rgba(255, 255, 255, 0.6)',
                                }}
                              >
                                Blend subtle nature sounds under your meditation
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => setShowAmbientMixer(false)}
                            style={{
                              background: 'rgba(255, 255, 255, 0.1)',
                              border: 'none',
                              borderRadius: '50%',
                              width: '32px',
                              height: '32px',
                              color: 'white',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                            }}
                          >
                            <X size={18} />
                          </button>
                        </div>

                        {/* Ambient Layer Options */}
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: '10px',
                            marginBottom: '20px',
                          }}
                        >
                          {(Object.keys(AMBIENT_LAYERS) as AmbientLayerKey[]).map((key) => {
                            const layer = AMBIENT_LAYERS[key];
                            const isSelected = ambientLayer === key;
                            return (
                              <button
                                key={key}
                                onClick={() => {
                                  triggerHapticLight();
                                  setAmbientLayer(key);
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '10px',
                                  padding: '14px',
                                  borderRadius: '16px',
                                  background: isSelected
                                    ? `${vibrationThemeColors.glow}`
                                    : 'rgba(255, 255, 255, 0.06)',
                                  border: isSelected
                                    ? `1.5px solid ${vibrationThemeColors.ring}`
                                    : '1px solid rgba(255, 255, 255, 0.12)',
                                  color: 'white',
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                  fontSize: '14px',
                                  fontWeight: isSelected ? 700 : 500,
                                }}
                              >
                                <span style={{ fontSize: '18px' }}>{layer.icon}</span>
                                <span
                                  style={{
                                    flex: 1,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    color: isSelected ? vibrationThemeColors.ring : 'white',
                                  }}
                                >
                                  {layer.label}
                                </span>
                                {isSelected && (
                                  <Check size={16} color={vibrationThemeColors.ring} />
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {/* Volume Slider if ambient layer active */}
                        {ambientLayer !== 'off' && (
                          <div
                            style={{
                              background: 'rgba(255, 255, 255, 0.06)',
                              borderRadius: '18px',
                              padding: '16px',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                marginBottom: '10px',
                                fontSize: '13px',
                              }}
                            >
                              <span style={{ color: 'rgba(255, 255, 255, 0.7)', fontWeight: 600 }}>
                                Ambient Mix Level
                              </span>
                              <span style={{ color: vibrationThemeColors.ring, fontWeight: 700 }}>
                                {Math.round(ambientVolume * 100)}%
                              </span>
                            </div>
                            <input
                              type="range"
                              aria-label="Ambient background sound volume"
                              min={0}
                              max={1}
                              step={0.02}
                              value={ambientVolume}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                if (Number.isFinite(val))
                                  setAmbientVolume(Math.min(1, Math.max(0, val)));
                              }}
                              style={{
                                width: '100%',
                                accentColor: vibrationThemeColors.ring,
                                height: '6px',
                                cursor: 'pointer',
                              }}
                            />
                          </div>
                        )}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>

                {/* Point 3: Post-Session Mindful Summary & Streak Celebration Modal */}
                <AnimatePresence>
                  {showSummaryModal && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        zIndex: 60,
                        overflowY: 'auto',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '24px',
                        background: 'rgba(5, 8, 17, 0.85)',
                        backdropFilter: 'blur(24px)',
                        WebkitBackdropFilter: 'blur(24px)',
                      }}
                    >
                      {showConfetti && (
                        <Confetti
                          width={typeof window !== 'undefined' ? window.innerWidth : 400}
                          height={typeof window !== 'undefined' ? window.innerHeight : 800}
                          recycle={false}
                          numberOfPieces={300}
                        />
                      )}

                      <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-label="Session Completed"
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        style={{
                          width: '100%',
                          maxWidth: '380px',
                          background:
                            'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)',
                          border: '1px solid rgba(255, 255, 255, 0.25)',
                          boxShadow:
                            '0 25px 60px rgba(0, 0, 0, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.4)',
                          borderRadius: '32px',
                          padding: '32px 24px',
                          textAlign: 'center',
                          position: 'relative',
                          maxHeight:
                            'calc(var(--app-viewport-height) - max(24px, var(--safe-area-top, 0px)) - max(24px, var(--safe-area-bottom, 0px)))',
                          overflowY: 'auto',
                          flexShrink: 0,
                        }}
                      >
                        {/* Trophy Glow */}
                        <div
                          style={{
                            width: '72px',
                            height: '72px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)',
                            boxShadow: '0 0 30px rgba(245, 158, 11, 0.6)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 20px',
                          }}
                        >
                          <Trophy size={36} color="#0F172A" />
                        </div>

                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: 'rgba(245, 158, 11, 0.18)',
                            border: '1px solid rgba(245, 158, 11, 0.4)',
                            padding: '4px 14px',
                            borderRadius: '20px',
                            marginBottom: '12px',
                          }}
                        >
                          <Sparkles size={14} color="#F59E0B" />
                          <span
                            style={{
                              color: '#FCD34D',
                              fontSize: '12px',
                              fontWeight: 800,
                              letterSpacing: '0.5px',
                            }}
                          >
                            {sessionStats.pointsAwarded > 0
                              ? `+${sessionStats.pointsAwarded} VITALITY POINTS EARNED`
                              : 'SESSION ALREADY RECORDED TODAY'}
                          </span>
                        </div>

                        <h3
                          style={{
                            fontSize: '24px',
                            fontWeight: 800,
                            color: 'white',
                            margin: '0 0 8px',
                            letterSpacing: '-0.5px',
                          }}
                        >
                          Session Completed
                        </h3>
                        <p
                          style={{
                            fontSize: '14px',
                            color: 'rgba(255, 255, 255, 0.7)',
                            margin: '0 0 24px',
                          }}
                        >
                          Session complete. Rest and recharge.
                        </p>

                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: '10px',
                            marginBottom: '24px',
                          }}
                        >
                          <div
                            style={{
                              background: 'rgba(255, 255, 255, 0.06)',
                              borderRadius: '18px',
                              padding: '14px',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                            }}
                          >
                            <div
                              style={{
                                fontSize: '12px',
                                color: 'rgba(255, 255, 255, 0.6)',
                                marginBottom: '4px',
                              }}
                            >
                              Mindful Time
                            </div>
                            <div style={{ fontSize: '20px', fontWeight: 800, color: 'white' }}>
                              {sessionStats.minutesLogged} mins
                            </div>
                          </div>

                          <div
                            style={{
                              background: 'rgba(255, 255, 255, 0.06)',
                              borderRadius: '18px',
                              padding: '14px',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                            }}
                          >
                            <div
                              style={{
                                fontSize: '12px',
                                color: 'rgba(255, 255, 255, 0.6)',
                                marginBottom: '4px',
                              }}
                            >
                              Calm Streak
                            </div>
                            <div
                              style={{
                                fontSize: '20px',
                                fontWeight: 800,
                                color: '#F59E0B',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px',
                              }}
                            >
                              <Flame size={18} fill="#F59E0B" color="#F59E0B" />
                              {sessionStats.mindfulStreak} Days
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <button
                            onClick={() => {
                              triggerHapticLight();
                              setShowSummaryModal(false);
                              setShowConfetti(false);
                              onClose();
                              const calmPrompt = `I just completed a ${sessionStats.minutesLogged}-minute restorative session ("${currentTrack?.title || playlistTitle}") in Calm Space. Can you explain how this breathing session supports heart-rate variability and relaxation?`;
                              navigate('/app/ava', {
                                state: { initialPrompt: calmPrompt, initialMessage: calmPrompt },
                              });
                            }}
                            style={{
                              width: '100%',
                              padding: '16px',
                              borderRadius: '18px',
                              background: 'linear-gradient(135deg, #0EA5E9 0%, #38BDF8 100%)',
                              border: 'none',
                              color: 'white',
                              fontSize: '15px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              boxShadow: '0 8px 24px rgba(14, 165, 233, 0.4)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                            }}
                          >
                            💬 Discuss Autonomic Reset with Ava
                          </button>

                          <button
                            onClick={() => {
                              triggerHapticLight();
                              setShowSummaryModal(false);
                              setShowConfetti(false);
                              onClose();
                            }}
                            style={{
                              width: '100%',
                              padding: '14px',
                              borderRadius: '18px',
                              background: 'rgba(255, 255, 255, 0.08)',
                              border: '1px solid rgba(255, 255, 255, 0.15)',
                              color: 'white',
                              fontSize: '15px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Done
                          </button>
                        </div>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>
              </>
            )}
          </FocusTrap>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
