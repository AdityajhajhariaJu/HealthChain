import { RefObject, useEffect, useRef, useState } from 'react';

interface Props {
  content: string;
  onComplete: () => void;
  messagesEndRef?: RefObject<HTMLElement | null>;
}

export function TypewriterText({ content, onComplete, messagesEndRef }: Props) {
  const [displayed, setDisplayed] = useState('');
  const complete = useRef(onComplete);
  complete.current = onComplete;

  useEffect(() => {
    // Each message has its own cancellation flag. A replacement message or
    // Strict Mode replay must not re-enable an earlier typing loop.
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setDisplayed(content);
      complete.current();
      return;
    }
    setDisplayed('');
    void (async () => {
      for (let length = 3; length < content.length; length += 3) {
        if (cancelled) return;
        setDisplayed(content.slice(0, length));
        const end = messagesEndRef?.current;
        const container = end?.parentElement?.parentElement;
        if (
          container &&
          container.scrollHeight - container.scrollTop - container.clientHeight < 150
        ) {
          requestAnimationFrame(() => {
            if (!cancelled) messagesEndRef?.current?.scrollIntoView({ behavior: 'auto' });
          });
        }
        await new Promise<void>((resolve) => {
          timer = setTimeout(resolve, 10);
        });
      }
      if (!cancelled) {
        setDisplayed(content);
        complete.current();
      }
    })();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [content, messagesEndRef]);

  return <span style={{ whiteSpace: 'pre-wrap' }}>{displayed}</span>;
}
