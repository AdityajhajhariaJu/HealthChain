import {
  Download,
  Headphones,
  Layers,
  ListMusic,
  LoaderCircle,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { AudioDownload } from '../../services/AudioLibrary';
import './sound-player.css';

export const soundTime = (value: number) => {
  const seconds = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};
export interface SoundTrack {
  id: string;
  title: string;
  subtitle: string;
  cover: string;
  audioUrl: string;
}
interface Props {
  track: SoundTrack;
  collection: string;
  playing: boolean;
  active: boolean;
  buffering: boolean;
  error: string;
  offline: boolean;
  currentTime: number;
  duration: number;
  muted: boolean;
  repeat: 'all' | 'one' | 'off';
  shuffle: boolean;
  downloads: AudioDownload[];
  pending: { path: string; percent: number } | null;
  canDownload: boolean;
  onToggle: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onSeek: (seconds: number) => void;
  onMute: () => void;
  onLibrary: () => void;
  onMixer: () => void;
  onRetry: () => void;
  onRepeat: () => void;
  onShuffle: () => void;
  onDownload: () => void;
}

export function SoundPlayerControls(props: Props) {
  const saved = props.downloads.some(
    (entry) => entry.path === props.track.audioUrl && entry.available
  );
  const downloading = props.pending?.path === props.track.audioUrl;
  const status =
    props.error ||
    (props.buffering && props.playing
      ? 'Connecting to your sound…'
      : props.active
        ? props.offline
          ? 'Playing offline'
          : 'Playing'
        : props.playing
          ? 'Preparing your sound…'
          : 'Paused');
  return (
    <section
      className="hc-sound-controls"
      aria-label="Audio player"
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
    >
      <div className="hc-sound-heading">
        <img src={props.track.cover} alt="" className="hc-sound-cover" />
        <div className="hc-sound-heading-copy">
          <span className="hc-sound-eyebrow">{props.collection}</span>
          <h3>{props.track.title}</h3>
          <p>{props.track.subtitle}</p>
        </div>
      </div>
      <div
        className={`hc-sound-status ${props.error ? 'hc-sound-status-error' : ''}`}
        role="status"
        aria-live="polite"
      >
        {props.buffering && props.playing && !props.error ? (
          <LoaderCircle className="hc-sound-spin" size={14} />
        ) : (
          <span className={`hc-sound-dot ${props.active ? 'is-active' : ''}`} />
        )}
        <span>{status}</span>
        {props.error && (
          <button type="button" onClick={props.onRetry}>
            Retry
          </button>
        )}
      </div>
      <input
        className="hc-sound-seek"
        type="range"
        aria-label="Seek track"
        aria-valuetext={`${soundTime(props.currentTime)} of ${soundTime(props.duration)}`}
        min={0}
        max={props.duration || 1}
        step={0.1}
        value={Math.min(props.currentTime, props.duration || 0)}
        disabled={!props.duration}
        onChange={(event) => props.onSeek(Number(event.target.value))}
        style={
          {
            '--sound-progress': `${props.duration ? (props.currentTime / props.duration) * 100 : 0}%`,
          } as React.CSSProperties
        }
      />
      <div className="hc-sound-times">
        <span>{soundTime(props.currentTime)}</span>
        <span>{soundTime(props.duration)}</span>
      </div>
      <div className="hc-sound-transport">
        <button
          type="button"
          className={props.shuffle ? 'is-on' : ''}
          aria-label="Shuffle"
          aria-pressed={props.shuffle}
          onClick={props.onShuffle}
        >
          <Shuffle size={19} />
        </button>
        <button type="button" aria-label="Previous Track" onClick={props.onPrevious}>
          <SkipBack size={23} fill="currentColor" />
        </button>
        <button
          type="button"
          className="hc-sound-play"
          aria-label={props.playing ? 'Pause' : 'Play'}
          onClick={props.onToggle}
        >
          {props.buffering && props.playing ? (
            <LoaderCircle className="hc-sound-spin" size={26} />
          ) : props.playing ? (
            <Pause size={26} fill="currentColor" />
          ) : (
            <Play size={26} fill="currentColor" />
          )}
        </button>
        <button type="button" aria-label="Next Track" onClick={props.onNext}>
          <SkipForward size={23} fill="currentColor" />
        </button>
        <button
          type="button"
          className={props.repeat !== 'off' ? 'is-on' : ''}
          aria-label={`Repeat: ${props.repeat === 'all' ? 'playlist' : props.repeat === 'one' ? 'one track' : 'off'}`}
          onClick={props.onRepeat}
        >
          {props.repeat === 'one' ? <Repeat1 size={19} /> : <Repeat size={19} />}
        </button>
      </div>
      <div className="hc-sound-actions">
        <button type="button" onClick={props.onLibrary} aria-label="Open sound library">
          <ListMusic size={17} />
          <span>Library</span>
        </button>
        <button type="button" onClick={props.onMixer} aria-label="Ambient Layer Mixer">
          <Layers size={17} />
          <span>Mix</span>
        </button>
        <button
          type="button"
          disabled={saved || !props.canDownload || Boolean(props.pending)}
          onClick={props.onDownload}
          aria-label={saved ? 'Track downloaded' : 'Download current track'}
        >
          {downloading ? (
            <LoaderCircle size={17} className="hc-sound-spin" />
          ) : saved ? (
            <Headphones size={17} />
          ) : (
            <Download size={17} />
          )}
          <span>{downloading ? `${props.pending?.percent}%` : saved ? 'Offline' : 'Save'}</span>
        </button>
        <button
          type="button"
          aria-label={props.muted ? 'Unmute' : 'Mute'}
          aria-pressed={props.muted}
          onClick={props.onMute}
        >
          {props.muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      </div>
    </section>
  );
}
