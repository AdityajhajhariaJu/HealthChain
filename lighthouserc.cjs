module.exports = {
  ci: {
    collect: {
      staticDistDir: './dist',
      url: ['http://localhost:8080'],
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        'categories:performance': ['warn', { minScore: 0.9 }],
        'categories:accessibility': ['warn', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],
        'categories:seo': ['warn', { minScore: 0.9 }],
        'color-contrast': 'off',
        'csp-xss': 'off',
        'font-size': 'off',
        'heading-order': 'off',
        'inspector-issues': 'off',
        'label-content-name-mismatch': 'off',
        'meta-viewport': 'off',
        'non-composited-animations': 'off',
        'third-party-cookies': 'off',
        'total-byte-weight': 'off',
        'unused-css-rules': 'off',
        'unused-javascript': 'off',
        'uses-responsive-images': 'off',
        'uses-text-compression': 'off',
        'valid-source-maps': 'off',
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
