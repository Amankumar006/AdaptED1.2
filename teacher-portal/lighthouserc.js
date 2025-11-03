module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:5173/',
        'http://localhost:5173/dashboard',
        'http://localhost:5173/lessons',
        'http://localhost:5173/assessments',
        'http://localhost:5173/students',
        'http://localhost:5173/analytics',
      ],
      startServerCommand: 'npm run dev',
      startServerReadyPattern: 'Local:',
      numberOfRuns: 3,
      settings: {
        chromeFlags: '--no-sandbox --disable-dev-shm-usage',
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.8 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.8 }],
        'categories:pwa': ['warn', { minScore: 0.6 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};