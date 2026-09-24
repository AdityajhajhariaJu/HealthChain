// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { AnimatedTrackThumbnail } from '../AnimatedTrackThumbnail';

describe('AnimatedTrackThumbnail', () => {
  const tracks = [
    'm1',
    'mood-0',
    'mood-1',
    'mood-2',
    'soundscape-0',
    'soundscape-1',
    'soundscape-2',
    'soundscape-3'
  ];

  tracks.forEach((trackId) => {
    it(`renders animated thumbnail for track "${trackId}" successfully`, () => {
      const { container } = render(
        <AnimatedTrackThumbnail trackId={trackId} size={44} isHovered={false} />
      );
      expect(container.firstChild).toBeDefined();
    });

    it(`renders hovered state for track "${trackId}"`, () => {
      const { container } = render(
        <AnimatedTrackThumbnail trackId={trackId} size={52} isHovered={true} />
      );
      expect(container.firstChild).toBeDefined();
    });
  });
});
