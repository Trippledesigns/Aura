import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';

interface CacheInfo {
  cache_dir: string;
  total_size_bytes: number;
  total_size_mb: number;
  file_count: number;
  exists: boolean;
}

export const PerformanceMonitor: React.FC = () => {
  const [cacheInfo, setCacheInfo] = useState<CacheInfo | null>(null);
  const [failedPlatforms, setFailedPlatforms] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCacheInfo();
  }, []);

  const loadCacheInfo = async () => {
    try {
      const info = await invoke<CacheInfo>('get_cache_info');
      setCacheInfo(info);
    } catch (error) {
      console.error('Failed to get cache info:', error);
    }
  };

  const clearAllCache = async () => {
    setLoading(true);
    try {
      await invoke('clear_all_cache');
      await loadCacheInfo();
    } catch (error) {
      console.error('Failed to clear cache:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkFailedScans = async () => {
    try {
      const failed = await invoke<string[]>('retry_failed_scans');
      setFailedPlatforms(failed);
    } catch (error) {
      console.error('Failed to check scans:', error);
    }
  };

  const scanWithRetry = async () => {
    setLoading(true);
    try {
      const result = await invoke('scan_with_retry', { forceRefresh: false });
      console.log('Scan result:', result);
      await loadCacheInfo();
    } catch (error) {
      console.error('Failed to scan:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="performance-monitor p-4 bg-gray-800 rounded-lg">
      <h3 className="text-lg font-semibold mb-4 text-white">Performance Monitor</h3>
      
      {/* Cache Information */}
      {cacheInfo && (
        <div className="mb-6">
          <h4 className="text-md font-medium mb-2 text-gray-300">Cache Status</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Cache Size:</span>
              <span className="ml-2 text-white">{cacheInfo.total_size_mb} MB</span>
            </div>
            <div>
              <span className="text-gray-400">Cached Files:</span>
              <span className="ml-2 text-white">{cacheInfo.file_count}</span>
            </div>
            <div>
              <span className="text-gray-400">Status:</span>
              <span className="ml-2 text-white">
                {cacheInfo.exists ? 'Active' : 'No Cache'}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Performance:</span>
              <span className="ml-2 text-green-400">
                {cacheInfo.exists ? 'Optimized' : 'First Scan'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Failed Platforms */}
      {failedPlatforms.length > 0 && (
        <div className="mb-6">
          <h4 className="text-md font-medium mb-2 text-gray-300">Scan Issues</h4>
          <div className="text-sm text-red-400">
            Failed platforms: {failedPlatforms.join(', ')}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={clearAllCache}
          disabled={loading}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
        >
          {loading ? 'Clearing...' : 'Clear Cache'}
        </button>
        
        <button
          onClick={checkFailedScans}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          Check Issues
        </button>
        
        <button
          onClick={scanWithRetry}
          disabled={loading}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? 'Scanning...' : 'Smart Scan'}
        </button>
      </div>

      {/* Performance Tips */}
      <div className="mt-6 text-xs text-gray-400">
        <p>• Cache expires after 1 hour automatically</p>
        <p>• File system changes clear relevant cache automatically</p>
        <p>• Smart scans preserve performance while detecting new games</p>
      </div>
    </div>
  );
};
