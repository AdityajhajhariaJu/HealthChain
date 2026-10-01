module.exports = {
  ci: {
    collect: {
      startServerCommand: 'node scripts/serve-lighthouse.mjs',
      startServerReadyPattern: 'Lighthouse server ready',
      url: ['http://localhost:8080'],
    },
    assert: {
      // Functional accessibility/quality categories are release gates.
      // Keep the higher mobile performance target visible as a warning.
      assertions: {
        'categories:performance': ['warn', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
