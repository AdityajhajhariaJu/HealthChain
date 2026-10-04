import { useEffect, useRef, useState } from 'react';
import { trackEvent } from '../../services/analytics';
import {
  audioStreamUrl,
  cachedAudio,
  clearAudioDownloads,
  downloadAudio,
  listAudioDownloads,
  removeAudioDownload,
  type AudioDownload,
} from '../../services/AudioLibrary';

export function useAudioSource(path: string | undefined, revision = 0) {
  const [source, setSource] = useState({
    path: '',
    revision: -1,
    src: '',
    offline: false,
    error: '',
  });
  useEffect(() => {
    let active = true;
    let objectUrl = '';
    if (!path) {
      setSource({ path: '', revision, src: '', offline: false, error: '' });
      return;
    }
    let stream: string;
    try {
      stream = audioStreamUrl(path);
    } catch {
      setSource({
        path,
        revision,
        src: '',
        offline: false,
        error: 'This sound is unavailable. Please choose another sound or refresh the app.',
      });
      return;
    }
    const fallback = setTimeout(() => {
      if (active) {
        active = false;
        setSource({ path, revision, src: stream, offline: false, error: '' });
      }
    }, 1500);
    void cachedAudio(path)
      .catch(() => undefined)
      .then((blob) => {
        if (!active) return;
        clearTimeout(fallback);
        objectUrl = blob ? URL.createObjectURL(blob) : '';
        setSource({
          path,
          revision,
          src: objectUrl || stream,
          offline: Boolean(objectUrl),
          error: '',
        });
      });
    return () => {
      active = false;
      clearTimeout(fallback);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path, revision]);
  return source.path === path && source.revision === revision
    ? source
    : { path, src: '', offline: false, error: '' };
}

export function useAudioDownloads() {
  const [downloads, setDownloads] = useState<AudioDownload[]>([]);
  const [pending, setPending] = useState<{ path: string; percent: number } | null>(null);
  const [error, setError] = useState('');
  const [supported, setSupported] = useState(true);
  const controller = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const refresh = async () => {
    try {
      const result = await listAudioDownloads();
      if (mounted.current) {
        setDownloads(result);
        setSupported(true);
      }
    } catch {
      if (mounted.current) setSupported(false);
    }
  };
  useEffect(() => {
    mounted.current = true;
    void refresh();
    return () => {
      mounted.current = false;
      controller.current?.abort();
    };
  }, []);
  const download = async (path: string) => {
    if (controller.current) return;
    const request = new AbortController();
    controller.current = request;
    setError('');
    setPending({ path, percent: 0 });
    try {
      await downloadAudio(path, request.signal, (percent) => {
        if (mounted.current) setPending({ path, percent });
      });
      await refresh();
      trackEvent('audio_action', { action: 'downloaded' });
    } catch (failure: any) {
      if (!request.signal.aborted) trackEvent('audio_action', { action: 'download_failed' });
      if (mounted.current && !request.signal.aborted)
        setError(failure?.message || 'Download failed. Check your connection and retry.');
    } finally {
      if (controller.current === request) controller.current = null;
      if (mounted.current) setPending(null);
    }
  };
  const remove = async (path?: string) => {
    controller.current?.abort();
    setError('');
    try {
      if (path) await removeAudioDownload(path);
      else await clearAudioDownloads();
      await refresh();
    } catch {
      if (mounted.current) setError('Downloads could not be removed. Please retry.');
    }
  };
  return {
    downloads,
    pending,
    error,
    supported,
    download,
    remove,
    cancel: () => controller.current?.abort(),
  };
}
