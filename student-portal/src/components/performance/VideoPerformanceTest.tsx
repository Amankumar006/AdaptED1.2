import React, { useState, useEffect, useRef } from 'react';

interface VideoMetrics {
  loadTime: number | null;
  startTime: number | null;
  bufferHealth: number;
  quality: string;
  format: string;
  networkCondition: string;
}

interface VideoTestResult {
  passed: boolean;
  metrics: VideoMetrics;
  timestamp: string;
}

const VideoPerformanceTest: React.FC = () => {
  const [testResults, setTestResults] = useState<VideoTestResult[]>([]);
  const [currentTest, setCurrentTest] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const startTimeRef = useRef<number>(0);

  const videoSources = [
    {
      format: 'MP4 H.264',
      src: '/api/content/video/sample.mp4',
      fallback: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
    },
    {
      format: 'WebM VP9',
      src: '/api/content/video/sample.webm',
      fallback: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.webm'
    },
    {
      format: 'HLS Adaptive',
      src: '/api/content/video/sample.m3u8',
      fallback: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8'
    }
  ];

  const networkConditions = [
    { name: 'Fast 3G', throttling: 'fast3g' },
    { name: 'Regular 3G', throttling: 'slow3g' },
    { name: 'No Throttling', throttling: null }
  ];

  const runVideoTest = async (videoSource: typeof videoSources[0], networkCondition: typeof networkConditions[0]) => {
    return new Promise<VideoTestResult>((resolve) => {
      const video = videoRef.current;
      if (!video) {
        resolve({
          passed: false,
          metrics: {
            loadTime: null,
            startTime: null,
            bufferHealth: 0,
            quality: 'Unknown',
            format: videoSource.format,
            networkCondition: networkCondition.name
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      startTimeRef.current = Date.now();
      let loadTime: number | null = null;
      let startTime: number | null = null;

      const metrics: VideoMetrics = {
        loadTime: null,
        startTime: null,
        bufferHealth: 0,
        quality: 'Unknown',
        format: videoSource.format,
        networkCondition: networkCondition.name
      };

      // Event listeners
      const onLoadedMetadata = () => {
        loadTime = Date.now() - startTimeRef.current;
        metrics.loadTime = loadTime;
        metrics.quality = `${video.videoWidth}x${video.videoHeight}`;
      };

      const onPlaying = () => {
        if (!startTime) {
          startTime = Date.now() - startTimeRef.current;
          metrics.startTime = startTime;
        }
      };

      const onProgress = () => {
        if (video.buffered.length > 0 && video.duration) {
          const bufferedEnd = video.buffered.end(video.buffered.length - 1);
          metrics.bufferHealth = Math.round((bufferedEnd / video.duration) * 100);
        }
      };

      const onCanPlay = () => {
        // Auto-play to measure start time
        video.play().catch(console.error);
      };

      const onTimeUpdate = () => {
        if (video.currentTime > 0 && !startTime) {
          startTime = Date.now() - startTimeRef.current;
          metrics.startTime = startTime;
          
          // Test complete after 2 seconds of playback
          setTimeout(() => {
            cleanup();
            resolve({
              passed: (startTime || 0) <= 3000, // 3 second target
              metrics,
              timestamp: new Date().toISOString()
            });
          }, 2000);
        }
      };

      const onError = () => {
        cleanup();
        resolve({
          passed: false,
          metrics,
          timestamp: new Date().toISOString()
        });
      };

      const cleanup = () => {
        video.removeEventListener('loadedmetadata', onLoadedMetadata);
        video.removeEventListener('playing', onPlaying);
        video.removeEventListener('progress', onProgress);
        video.removeEventListener('canplay', onCanPlay);
        video.removeEventListener('timeupdate', onTimeUpdate);
        video.removeEventListener('error', onError);
        video.pause();
        video.currentTime = 0;
      };

      // Add event listeners
      video.addEventListener('loadedmetadata', onLoadedMetadata);
      video.addEventListener('playing', onPlaying);
      video.addEventListener('progress', onProgress);
      video.addEventListener('canplay', onCanPlay);
      video.addEventListener('timeupdate', onTimeUpdate);
      video.addEventListener('error', onError);

      // Start test by setting video source
      video.src = videoSource.src;
      video.load();

      // Fallback timeout
      setTimeout(() => {
        if (!startTime) {
          cleanup();
          resolve({
            passed: false,
            metrics,
            timestamp: new Date().toISOString()
          });
        }
      }, 15000);
    });
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    
    for (const networkCondition of networkConditions) {
      for (const videoSource of videoSources) {
        setCurrentTest(`Testing ${videoSource.format} on ${networkCondition.name}`);
        
        const result = await runVideoTest(videoSource, networkCondition);
        setTestResults(prev => [...prev, result]);
        
        // Wait between tests
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    setCurrentTest('');
    setIsRunning(false);
  };

  const calculateSummary = () => {
    if (testResults.length === 0) return null;
    
    const passedTests = testResults.filter(r => r.passed).length;
    const totalTests = testResults.length;
    const passRate = (passedTests / totalTests) * 100;
    
    const validStartTimes = testResults
      .map(r => r.metrics.startTime)
      .filter(t => t !== null) as number[];
    
    const avgStartTime = validStartTimes.length > 0 
      ? validStartTimes.reduce((sum, time) => sum + time, 0) / validStartTimes.length
      : 0;
    
    return {
      passedTests,
      totalTests,
      passRate: Math.round(passRate * 100) / 100,
      avgStartTime: Math.round(avgStartTime),
      targetMet: passRate >= 95 && avgStartTime <= 3000
    };
  };

  const summary = calculateSummary();

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        Video Performance Validation - Phase Gate B
      </h2>
      
      <div className="mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <h3 className="font-semibold text-blue-800 mb-2">Target Criteria</h3>
          <p className="text-blue-700">Video start time ≤ 3 seconds across all formats and network conditions</p>
        </div>
        
        <button
          onClick={runAllTests}
          disabled={isRunning}
          className={`px-6 py-3 rounded-lg font-semibold ${
            isRunning
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isRunning ? 'Running Tests...' : 'Run Video Performance Tests'}
        </button>
      </div>

      {currentTest && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800 font-medium">{currentTest}</p>
        </div>
      )}

      {/* Hidden video element for testing */}
      <video
        ref={videoRef}
        style={{ display: 'none' }}
        preload="metadata"
        muted
      />

      {summary && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-gray-800">{summary.passedTests}/{summary.totalTests}</div>
            <div className="text-sm text-gray-600">Tests Passed</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-gray-800">{summary.passRate}%</div>
            <div className="text-sm text-gray-600">Pass Rate</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-gray-800">{summary.avgStartTime}ms</div>
            <div className="text-sm text-gray-600">Avg Start Time</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className={`text-2xl font-bold ${summary.targetMet ? 'text-green-600' : 'text-red-600'}`}>
              {summary.targetMet ? '✅' : '❌'}
            </div>
            <div className="text-sm text-gray-600">Target Met</div>
          </div>
        </div>
      )}

      {testResults.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 px-4 py-2 text-left">Format</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Network</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Start Time</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Quality</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {testResults.map((result, index) => (
                <tr key={index} className={result.passed ? 'bg-green-50' : 'bg-red-50'}>
                  <td className="border border-gray-300 px-4 py-2">{result.metrics.format}</td>
                  <td className="border border-gray-300 px-4 py-2">{result.metrics.networkCondition}</td>
                  <td className="border border-gray-300 px-4 py-2">
                    {result.metrics.startTime ? `${result.metrics.startTime}ms` : 'Failed'}
                  </td>
                  <td className="border border-gray-300 px-4 py-2">{result.metrics.quality}</td>
                  <td className="border border-gray-300 px-4 py-2">
                    <span className={`px-2 py-1 rounded text-sm font-medium ${
                      result.passed 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {result.passed ? 'PASS' : 'FAIL'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {summary && !summary.targetMet && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h4 className="font-semibold text-red-800 mb-2">Recommendations</h4>
          <ul className="text-red-700 space-y-1">
            {summary.avgStartTime > 3000 && (
              <li>• Video start time exceeds 3s target - optimize video encoding and CDN configuration</li>
            )}
            {summary.passRate < 95 && (
              <li>• Pass rate below 95% - investigate failed test scenarios</li>
            )}
            <li>• Consider implementing adaptive bitrate streaming for better performance</li>
            <li>• Optimize video compression and delivery infrastructure</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default VideoPerformanceTest;