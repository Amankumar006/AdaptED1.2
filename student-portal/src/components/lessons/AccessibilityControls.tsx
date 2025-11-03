import React, { useState } from 'react'
import { AccessibilityPreferences } from '../../types'

interface AccessibilityControlsProps {
  isEnabled: boolean
  onToggle: () => void
  preferences?: AccessibilityPreferences
}

export const AccessibilityControls: React.FC<AccessibilityControlsProps> = ({
  isEnabled,
  onToggle,
  preferences
}) => {
  const [showPanel, setShowPanel] = useState(false)
  const [localSettings, setLocalSettings] = useState({
    fontSize: preferences?.fontSize || 'medium',
    highContrast: preferences?.highContrast || false,
    reducedMotion: preferences?.reducedMotion || false,
    screenReader: preferences?.screenReader || false,
    keyboardNavigation: preferences?.keyboardNavigation || false
  })
  
  const handleSettingChange = (setting: string, value: any) => {
    setLocalSettings(prev => ({ ...prev, [setting]: value }))
    
    // Apply settings immediately to the document
    applyAccessibilitySettings({ ...localSettings, [setting]: value })
  }
  
  const applyAccessibilitySettings = (settings: typeof localSettings) => {
    const root = document.documentElement
    
    // Font size
    root.classList.remove('text-small', 'text-medium', 'text-large')
    root.classList.add(`text-${settings.fontSize}`)
    
    // High contrast
    if (settings.highContrast) {
      root.classList.add('high-contrast')
    } else {
      root.classList.remove('high-contrast')
    }
    
    // Reduced motion
    if (settings.reducedMotion) {
      root.classList.add('reduce-motion')
    } else {
      root.classList.remove('reduce-motion')
    }
    
    // Screen reader optimizations
    if (settings.screenReader) {
      root.classList.add('screen-reader-optimized')
    } else {
      root.classList.remove('screen-reader-optimized')
    }
    
    // Keyboard navigation
    if (settings.keyboardNavigation) {
      root.classList.add('keyboard-navigation')
    } else {
      root.classList.remove('keyboard-navigation')
    }
  }
  
  const resetToDefaults = () => {
    const defaults = {
      fontSize: 'medium' as const,
      highContrast: false,
      reducedMotion: false,
      screenReader: false,
      keyboardNavigation: false
    }
    setLocalSettings(defaults)
    applyAccessibilitySettings(defaults)
  }
  
  return (
    <div className="accessibility-controls relative">
      <button
        onClick={() => setShowPanel(!showPanel)}
        className={`btn btn-sm ${isEnabled ? 'btn-primary' : 'btn-ghost'}`}
        aria-label="Accessibility options"
        title="Accessibility options"
      >
        ♿ A11y
      </button>
      
      {showPanel && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setShowPanel(false)}
          />
          
          {/* Panel */}
          <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4">
            <div className="panel-header flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Accessibility Settings</h3>
              <button
                onClick={() => setShowPanel(false)}
                className="btn btn-ghost btn-xs"
                aria-label="Close accessibility panel"
              >
                ✕
              </button>
            </div>
            
            <div className="settings-list space-y-4">
              {/* Font Size */}
              <div className="setting-group">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Font Size
                </label>
                <div className="flex space-x-2">
                  {(['small', 'medium', 'large'] as const).map(size => (
                    <button
                      key={size}
                      onClick={() => handleSettingChange('fontSize', size)}
                      className={`btn btn-sm ${
                        localSettings.fontSize === size ? 'btn-primary' : 'btn-ghost'
                      }`}
                    >
                      {size === 'small' ? 'A' : size === 'medium' ? 'A' : 'A'}
                      <span className="sr-only">{size}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* High Contrast */}
              <div className="setting-group">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={localSettings.highContrast}
                    onChange={(e) => handleSettingChange('highContrast', e.target.checked)}
                    className="form-checkbox h-4 w-4 text-blue-600"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">High Contrast</span>
                    <p className="text-xs text-gray-500">Increase color contrast for better visibility</p>
                  </div>
                </label>
              </div>
              
              {/* Reduced Motion */}
              <div className="setting-group">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={localSettings.reducedMotion}
                    onChange={(e) => handleSettingChange('reducedMotion', e.target.checked)}
                    className="form-checkbox h-4 w-4 text-blue-600"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">Reduce Motion</span>
                    <p className="text-xs text-gray-500">Minimize animations and transitions</p>
                  </div>
                </label>
              </div>
              
              {/* Screen Reader */}
              <div className="setting-group">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={localSettings.screenReader}
                    onChange={(e) => handleSettingChange('screenReader', e.target.checked)}
                    className="form-checkbox h-4 w-4 text-blue-600"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">Screen Reader Mode</span>
                    <p className="text-xs text-gray-500">Optimize for screen reader users</p>
                  </div>
                </label>
              </div>
              
              {/* Keyboard Navigation */}
              <div className="setting-group">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={localSettings.keyboardNavigation}
                    onChange={(e) => handleSettingChange('keyboardNavigation', e.target.checked)}
                    className="form-checkbox h-4 w-4 text-blue-600"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">Enhanced Keyboard Navigation</span>
                    <p className="text-xs text-gray-500">Improve keyboard-only navigation</p>
                  </div>
                </label>
              </div>
            </div>
            
            {/* Quick Actions */}
            <div className="quick-actions mt-6 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <button
                  onClick={resetToDefaults}
                  className="btn btn-ghost btn-sm"
                >
                  Reset to Defaults
                </button>
                
                <button
                  onClick={onToggle}
                  className={`btn btn-sm ${isEnabled ? 'btn-secondary' : 'btn-primary'}`}
                >
                  {isEnabled ? 'Disable A11y' : 'Enable A11y'}
                </button>
              </div>
            </div>
            
            {/* Keyboard Shortcuts */}
            <div className="keyboard-shortcuts mt-4 pt-4 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Keyboard Shortcuts</h4>
              <div className="text-xs text-gray-600 space-y-1">
                <div className="flex justify-between">
                  <span>Toggle high contrast:</span>
                  <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Alt + H</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Increase font size:</span>
                  <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Ctrl + +</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Decrease font size:</span>
                  <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Ctrl + -</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Focus main content:</span>
                  <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Alt + M</kbd>
                </div>
              </div>
            </div>
            
            {/* ARIA Live Region for Announcements */}
            <div 
              className="sr-only" 
              aria-live="polite" 
              aria-atomic="true"
              id="accessibility-announcements"
            />
          </div>
        </>
      )}
    </div>
  )
}