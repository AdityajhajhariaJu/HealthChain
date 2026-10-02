import { useState } from 'react';
import styles from '../Landing.module.css';

interface DemoVideoPlayerProps {
  src: string;
  poster: string;
  alt: string;
}

export default function DemoVideoPlayer({ src, poster, alt }: DemoVideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <div>
      <div className={styles.videoWrapper}>
        {isPlaying ? (
          <video
            src={src}
            controls
            autoPlay
            playsInline
            preload="metadata"
            aria-label={alt}
            className={styles.videoPlayer}
            onEnded={() => setIsPlaying(false)}
            onError={() => {
              setFailed(true);
              setIsPlaying(false);
            }}
          />
        ) : (
          <button
            type="button"
            className={`${styles.videoPosterContainer} ${styles.videoPosterButton}`}
            aria-label={`${failed ? 'Retry' : 'Play'} ${alt}`}
            onClick={() => {
              setFailed(false);
              setIsPlaying(true);
            }}
          >
            <img
              src={poster}
              alt=""
              className={styles.videoPosterImg}
              loading="lazy"
              decoding="async"
              onError={(event) => {
                const image = event.currentTarget;
                const fallback = '/videos/healthchain-overview-poster.jpg';
                if (image.getAttribute('src') === fallback) image.hidden = true;
                else image.src = fallback;
              }}
            />
            <span className={styles.videoPlayLabel}>{failed ? 'Retry video' : 'Play video'}</span>
          </button>
        )}
      </div>
      {failed && (
        <p role="status" className={styles.videoError}>
          This video could not be played. You can retry or continue with the review.
        </p>
      )}
    </div>
  );
}
