module.exports = {
  ci: {
    collect: {
      staticDistDir: './dist',
      url: ['http://localhost:8080'],
    },
    assert: {
      // Track site-wide category thresholds as warnings while individual
      // Lighthouse findings are reviewed and assigned explicit budgets.
      assertions: {
        'categories:performance': ['warn', { minScore: 0.9 }],
        'categories:accessibility': ['warn', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],
        'categories:seo': ['warn', { minScore: 0.9 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
