// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import DemoVideoPlayer from './DemoVideoPlayer';

afterEach(cleanup);

it('offers native playback controls, exposes a failure and can retry', () => {
  render(<DemoVideoPlayer src="/demo.mp4" poster="/poster.jpg" alt="Clinical workflow demo" />);
  fireEvent.click(screen.getByRole('button', { name: 'Play Clinical workflow demo' }));
  const video = screen.getByLabelText('Clinical workflow demo');
  expect(video.hasAttribute('controls')).toBe(true);
  expect(screen.queryByRole('button')).toBeNull();
  fireEvent.error(video);
  expect(screen.getByRole('status').textContent).toContain('could not be played');
  fireEvent.click(screen.getByRole('button', { name: 'Retry Clinical workflow demo' }));
  expect(screen.queryByRole('status')).toBeNull();
  fireEvent.ended(screen.getByLabelText('Clinical workflow demo'));
  expect(screen.getByRole('button', { name: 'Play Clinical workflow demo' })).toBeDefined();
});

it('stops replacing the poster when its fallback is also unavailable', () => {
  const { container } = render(
    <DemoVideoPlayer src="/demo.mp4" poster="/missing.jpg" alt="Clinical workflow demo" />
  );
  const image = container.querySelector('img')!;
  fireEvent.error(image);
  expect(image.getAttribute('src')).toBe('/videos/healthchain-overview-poster.jpg');
  fireEvent.error(image);
  expect(image.hidden).toBe(true);
  expect(screen.getByRole('button', { name: 'Play Clinical workflow demo' })).toBeDefined();
});
