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
        'color-contrast': 'warn',
        'csp-xss': 'warn',
        'font-size': 'warn',
        'heading-order': 'warn',
        'inspector-issues': 'warn',
        'label-content-name-mismatch': 'warn',
        'meta-viewport': 'warn',
        'non-composited-animations': 'warn',
        'third-party-cookies': 'warn',
        'total-byte-weight': 'warn',
        'unused-css-rules': 'warn',
        'unused-javascript': 'warn',
        'uses-responsive-images': 'warn',
        'uses-text-compression': 'warn',
        'valid-source-maps': 'warn',
        'forced-reflow-insight': 'warn',
        'image-delivery-insight': 'warn',
        'network-dependency-tree-insight': 'warn'
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
