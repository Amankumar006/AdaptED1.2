describe('Offline Performance Tests', () => {
  beforeEach(() => {
    cy.mockAPI()
    cy.login()
  })

  it('should download content efficiently', () => {
    cy.visit('/lessons')

    // Start performance measurement
    cy.window().then((win) => {
      win.performance.mark('download-start')
    })

    // Download multiple lessons
    cy.get('[data-testid="download-lesson"]').each(($el, index) => {
      if (index < 3) { // Download first 3 lessons
        cy.wrap($el).click()
        cy.get('[data-testid="download-progress"]').should('be.visible')
        cy.get('[data-testid="download-complete"]').should('be.visible')
      }
    })

    // End performance measurement
    cy.window().then((win) => {
      win.performance.mark('download-end')
      win.performance.measure('download-duration', 'download-start', 'download-end')
      
      const measure = win.performance.getEntriesByName('download-duration')[0]
      expect(measure.duration).to.be.lessThan(30000) // Should complete within 30 seconds
    })

    // Verify storage usage is reasonable
    cy.window().then((win) => {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        return navigator.storage.estimate()
      }
    }).then((estimate) => {
      if (estimate) {
        expect(estimate.usage).to.be.lessThan(50 * 1024 * 1024) // Less than 50MB
      }
    })
  })

  it('should sync efficiently when coming back online', () => {
    // Download content first
    cy.visit('/lessons')
    cy.get('[data-testid="download-lesson"]').first().click()
    cy.get('[data-testid="download-complete"]').should('be.visible')

    // Go offline
    cy.window().then((win) => {
      cy.stub(win.navigator, 'onLine').value(false)
      win.dispatchEvent(new Event('offline'))
    })

    // Make changes offline
    cy.get('[data-testid="lesson-card"]').first().click()
    cy.get('[data-testid="notes-button"]').click()
    cy.get('[data-testid="note-input"]').type('Offline note')
    cy.get('[data-testid="save-note-button"]').click()

    // Complete lesson offline
    cy.get('[data-testid="complete-lesson-button"]').click()

    // Start performance measurement for sync
    cy.window().then((win) => {
      win.performance.mark('sync-start')
    })

    // Go back online
    cy.window().then((win) => {
      cy.stub(win.navigator, 'onLine').value(true)
      win.dispatchEvent(new Event('online'))
    })

    // Wait for sync to complete
    cy.waitForOfflineSync()

    // End performance measurement
    cy.window().then((win) => {
      win.performance.mark('sync-end')
      win.performance.measure('sync-duration', 'sync-start', 'sync-end')
      
      const measure = win.performance.getEntriesByName('sync-duration')[0]
      expect(measure.duration).to.be.lessThan(5000) // Should sync within 5 seconds
    })
  })

  it('should handle large content downloads without blocking UI', () => {
    cy.visit('/lessons')

    // Start downloading large content
    cy.get('[data-testid="download-all-button"]').click()

    // UI should remain responsive during download
    cy.get('[data-testid="lessons-nav"]').click()
    cy.url().should('include', '/lessons')

    cy.get('[data-testid="dashboard-nav"]').click()
    cy.url().should('include', '/dashboard')

    // Check that download continues in background
    cy.get('[data-testid="download-progress-indicator"]').should('be.visible')

    // Measure UI responsiveness
    cy.window().then((win) => {
      const observer = new win.PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry) => {
          if (entry.entryType === 'measure' && entry.name === 'click-response') {
            expect(entry.duration).to.be.lessThan(100) // UI should respond within 100ms
          }
        })
      })
      observer.observe({ entryTypes: ['measure'] })
    })

    // Test UI interactions during download
    cy.get('[data-testid="search-input"]').type('test')
    cy.get('[data-testid="filter-button"]').click()
  })

  it('should efficiently manage storage space', () => {
    cy.visit('/lessons')

    // Download content until storage limit is approached
    cy.get('[data-testid="download-lesson"]').each(($el, index) => {
      cy.wrap($el).click()
      cy.get('[data-testid="download-complete"]').should('be.visible')

      // Check storage usage after each download
      cy.window().then((win) => {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
          return navigator.storage.estimate()
        }
      }).then((estimate) => {
        if (estimate && estimate.usage) {
          const usagePercentage = (estimate.usage / estimate.quota) * 100
          if (usagePercentage > 80) {
            // Should trigger cleanup when approaching limit
            cy.get('[data-testid="storage-cleanup-notification"]').should('be.visible')
            return false // Stop downloading
          }
        }
      })
    })

    // Verify automatic cleanup works
    cy.get('[data-testid="storage-usage-indicator"]').should('contain', 'Optimized')
  })

  it('should handle network interruptions gracefully', () => {
    cy.visit('/lessons')

    // Start download
    cy.get('[data-testid="download-lesson"]').first().click()

    // Simulate network interruption during download
    cy.window().then((win) => {
      setTimeout(() => {
        cy.stub(win.navigator, 'onLine').value(false)
        win.dispatchEvent(new Event('offline'))
      }, 1000)
    })

    // Should show appropriate error message
    cy.get('[data-testid="download-interrupted"]').should('be.visible')

    // Resume when network returns
    cy.window().then((win) => {
      setTimeout(() => {
        cy.stub(win.navigator, 'onLine').value(true)
        win.dispatchEvent(new Event('online'))
      }, 2000)
    })

    // Should resume download automatically
    cy.get('[data-testid="download-resumed"]').should('be.visible')
    cy.get('[data-testid="download-complete"]').should('be.visible')
  })

  it('should optimize content for offline use', () => {
    cy.visit('/lessons')

    // Download lesson with media content
    cy.get('[data-testid="download-lesson-with-media"]').first().click()

    // Verify content optimization
    cy.get('[data-testid="optimization-progress"]').should('be.visible')
    cy.get('[data-testid="optimization-complete"]').should('be.visible')

    // Go offline and verify optimized content loads quickly
    cy.window().then((win) => {
      cy.stub(win.navigator, 'onLine').value(false)
      win.dispatchEvent(new Event('offline'))
    })

    cy.window().then((win) => {
      win.performance.mark('offline-load-start')
    })

    cy.get('[data-testid="lesson-card"]').first().click()
    cy.get('[data-testid="lesson-content"]').should('be.visible')

    cy.window().then((win) => {
      win.performance.mark('offline-load-end')
      win.performance.measure('offline-load-duration', 'offline-load-start', 'offline-load-end')
      
      const measure = win.performance.getEntriesByName('offline-load-duration')[0]
      expect(measure.duration).to.be.lessThan(2000) // Should load within 2 seconds offline
    })
  })

  it('should handle concurrent sync operations efficiently', () => {
    // Create multiple offline changes
    cy.window().then((win) => {
      cy.stub(win.navigator, 'onLine').value(false)
      win.dispatchEvent(new Event('offline'))
    })

    // Make multiple changes that need syncing
    cy.visit('/lessons/1')
    cy.get('[data-testid="bookmark-button"]').click()
    cy.get('[data-testid="notes-button"]').click()
    cy.get('[data-testid="note-input"]').type('Note 1')
    cy.get('[data-testid="save-note-button"]').click()

    cy.visit('/lessons/2')
    cy.get('[data-testid="complete-lesson-button"]').click()

    cy.visit('/practice')
    cy.get('[data-testid="start-practice-button"]').click()
    cy.get('[data-testid="answer-input"]').type('42')
    cy.get('[data-testid="submit-answer-button"]').click()

    // Start performance measurement
    cy.window().then((win) => {
      win.performance.mark('concurrent-sync-start')
    })

    // Go back online
    cy.window().then((win) => {
      cy.stub(win.navigator, 'onLine').value(true)
      win.dispatchEvent(new Event('online'))
    })

    // Wait for all syncs to complete
    cy.get('[data-testid="sync-queue-empty"]').should('be.visible')

    // End performance measurement
    cy.window().then((win) => {
      win.performance.mark('concurrent-sync-end')
      win.performance.measure('concurrent-sync-duration', 'concurrent-sync-start', 'concurrent-sync-end')
      
      const measure = win.performance.getEntriesByName('concurrent-sync-duration')[0]
      expect(measure.duration).to.be.lessThan(10000) // Should sync all within 10 seconds
    })
  })
})