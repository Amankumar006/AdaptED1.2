module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:4173',
        'http://localhost:4173/dashboard',
        'http://localhost:4173/lessons',
        'http://localhost:4173/practice',
        'http://localhost:4173/chat',
        'http://localhost:4173/progress',
        'http://localhost:4173/achievements',
        'http://localhost:4173/collaboration',
      ],
      startServerCommand: 'npm run preview',
      startServerReadyPattern: 'Local:',
      startServerReadyTimeout: 30000,
      numberOfRuns: 3,
      settings: {
        chromeFlags: '--no-sandbox --disable-dev-shm-usage',
        preset: 'desktop',
        onlyCategories: ['accessibility', 'performance', 'best-practices', 'seo'],
      },
    },
    assert: {
      assertions: {
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:performance': ['warn', { minScore: 0.8 }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],
        'categories:seo': ['warn', { minScore: 0.8 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};