import { Download, Headphones, LoaderCircle, Music2, Search, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import FocusTrap from '../../components/ui/FocusTrap';
import { AUDIO_STORAGE_LIMIT, audioInfo } from '../../services/AudioLibrary';
import type { useAudioDownloads } from './useAudioLibrary';
import { soundTime, type SoundTrack } from './SoundPlayerControls';

interface Props {
  tracks: SoundTrack[];
  title: string;
  active: number;
  playing: boolean;
  onSelect: (index: number) => void;
  onClose: () => void;
  library: ReturnType<typeof useAudioDownloads>;
}
export function SoundLibrary({
  tracks,
  title,
  active,
  playing,
  onSelect,
  onClose,
  library,
}: Props) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'offline'>('all');
  const available = new Set(
    library.downloads.filter((entry) => entry.available).map((entry) => entry.path)
  );
  const used = library.downloads.reduce((sum, entry) => sum + entry.bytes, 0);
  const matches = tracks
    .map((track, index) => ({ track, index }))
    .filter(
      ({ track }) =>
        (filter === 'all' || available.has(track.audioUrl)) &&
        `${track.title} ${track.subtitle}`.toLowerCase().includes(query.trim().toLowerCase())
    );
  return (
    <div
      className="hc-sound-library-layer"
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
    >
      <button className="hc-sound-backdrop" aria-label="Dismiss sound library" onClick={onClose} />
      <FocusTrap className="hc-sound-library-trap" onEscape={onClose}>
        <section
          className="hc-sound-library"
          role="dialog"
          aria-modal="true"
          aria-label="Sound library"
        >
          <header>
            <div>
              <span className="hc-sound-eyebrow">YOUR LISTENING SPACE</span>
              <h2>{title}</h2>
              <p>{tracks.length} sounds for a little breathing room</p>
            </div>
            <button
              type="button"
              className="hc-sound-icon"
              aria-label="Close sound library"
              onClick={onClose}
            >
              <X size={20} />
            </button>
          </header>
          <div className="hc-sound-library-tools">
            <label className="hc-sound-search">
              <Search size={18} />
              <input
                type="search"
                aria-label="Search sounds"
                placeholder="Find a sound…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <div className="hc-sound-filters">
              <button
                type="button"
                aria-pressed={filter === 'all'}
                onClick={() => setFilter('all')}
              >
                All sounds
              </button>
              <button
                type="button"
                aria-pressed={filter === 'offline'}
                onClick={() => setFilter('offline')}
              >
                <Headphones size={14} />
                Downloaded
              </button>
            </div>
          </div>
          <div className="hc-sound-library-list">
            {matches.map(({ track, index }) => {
              const selected = index === active,
                saved = available.has(track.audioUrl),
                pending = library.pending?.path === track.audioUrl;
              return (
                <div className={`hc-sound-row ${selected ? 'is-selected' : ''}`} key={track.id}>
                  <button
                    type="button"
                    className="hc-sound-row-play"
                    aria-label={`Play ${track.title}`}
                    aria-pressed={selected}
                    onClick={() => onSelect(index)}
                  >
                    <div className="hc-sound-row-art">
                      <img src={track.cover} alt="" loading="lazy" />
                      {selected && (
                        <span className="hc-sound-row-now">
                          <Music2 size={17} className={playing ? 'is-playing' : ''} />
                        </span>
                      )}
                    </div>
                    <div className="hc-sound-row-copy">
                      <strong>{track.title}</strong>
                      <span>{track.subtitle}</span>
                      <small>
                        {soundTime(audioInfo(track.audioUrl).seconds)}
                        {saved && ' · Available offline'}
                        {selected && ' · Selected'}
                      </small>
                    </div>
                  </button>
                  <button
                    type="button"
                    className="hc-sound-icon hc-sound-download"
                    disabled={!library.supported || Boolean(library.pending && !pending)}
                    aria-label={
                      pending
                        ? `Cancel download of ${track.title}`
                        : saved
                          ? `Remove download of ${track.title}`
                          : `Download ${track.title}`
                    }
                    onClick={() => {
                      if (pending) library.cancel();
                      else if (saved) void library.remove(track.audioUrl);
                      else void library.download(track.audioUrl);
                    }}
                  >
                    {pending ? (
                      <>
                        <LoaderCircle size={18} className="hc-sound-spin" />
                        <small>{library.pending?.percent}%</small>
                      </>
                    ) : saved ? (
                      <Headphones size={19} />
                    ) : (
                      <Download size={18} />
                    )}
                  </button>
                </div>
              );
            })}
            {!matches.length && (
              <div className="hc-sound-empty">
                <Headphones size={28} />
                <h3>{filter === 'offline' ? 'Your offline collection' : 'No sounds found'}</h3>
                <p>
                  {filter === 'offline'
                    ? 'Save a sound to listen without an internet connection.'
                    : 'Try another title or description.'}
                </p>
              </div>
            )}
          </div>
          <footer>
            {library.error && (
              <p className="hc-sound-download-error" role="alert">
                {library.error}
              </p>
            )}
            {!library.supported ? (
              <p>Offline downloads are unavailable on this device. You can still stream sounds.</p>
            ) : (
              <div className="hc-sound-storage">
                <div>
                  <strong>
                    {(used / 1_000_000).toFixed(1)} / {AUDIO_STORAGE_LIMIT / 1_000_000} MB
                  </strong>
                  <span>Downloaded sounds · Internet needed for streaming</span>
                </div>
                <button
                  type="button"
                  disabled={!library.downloads.length || Boolean(library.pending)}
                  onClick={() => void library.remove()}
                >
                  <Trash2 size={15} />
                  Clear downloads
                </button>
              </div>
            )}
          </footer>
        </section>
      </FocusTrap>
    </div>
  );
}
