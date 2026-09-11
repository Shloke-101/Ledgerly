import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { Home } from './pages/Home';
import { AuditResults } from './pages/AuditResults';
import { HistoryPage } from './pages/History';
import { AuditLoading } from './components/AuditLoading';
import { ErrorState } from './components/ErrorState';
import { api, ApiError } from './services/api';
import { subscribeToScan } from './services/websocket';
import { ScanReport, WebSocketScanEvent } from './types/api';

export const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<'home' | 'history' | 'results' | 'loading' | 'error'>('home');
  const [activeRepoName, setActiveRepoName] = useState<string>('');
  const [activeGithubUrl, setActiveGithubUrl] = useState<string>('');
  const [activeReport, setActiveReport] = useState<ScanReport | null>(null);
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentEvent, setCurrentEvent] = useState<WebSocketScanEvent | null>(null);
  const [pollingProgress, setPollingProgress] = useState<number>(10);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const cleanupWsRef = useRef<(() => void) | null>(null);
  const pollTimerRef = useRef<number | null>(null);

  // Clear timers & sockets on unmount
  useEffect(() => {
    return () => {
      if (cleanupWsRef.current) cleanupWsRef.current();
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  const handleStartAudit = async (githubUrl: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    setCurrentEvent(null);
    setPollingProgress(10);
    setActiveGithubUrl(githubUrl);
    
    // Extract a provisional name from url
    const cleanUrl = githubUrl.replace(/^https?:\/\//, '').replace(/^github\.com\//, '').replace(/\.git$/, '');
    setActiveRepoName(cleanUrl);
    setCurrentPage('loading');

    // Clean up previous listeners
    if (cleanupWsRef.current) {
      cleanupWsRef.current();
      cleanupWsRef.current = null;
    }
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }

    try {
      // 1. Submit scan job to backend
      const scanCreation = await api.createScan(githubUrl);
      const scanId = scanCreation.scan_id;
      setActiveRepoName(scanCreation.repo_name || cleanUrl);

      // Function to finalize and fetch completed report
      const finalizeSuccess = async () => {
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        if (cleanupWsRef.current) cleanupWsRef.current();

        try {
          const report = await api.getScanReport(scanId);
          setActiveReport(report);
          setIsLoading(false);
          setCurrentPage('results');
        } catch (fetchErr: unknown) {
          const errText = fetchErr instanceof Error ? fetchErr.message : 'Unable to retrieve completed scan report.';
          setErrorMessage(errText);
          setIsLoading(false);
          setCurrentPage('error');
        }
      };

      // 2. Connect to WebSocket stream
      cleanupWsRef.current = subscribeToScan(scanId, {
        onEvent: (evt) => {
          setCurrentEvent(evt);
          if (evt.progress) {
            setPollingProgress(evt.progress);
          }
        },
        onComplete: (evt) => {
          if (evt.status === 'completed') {
            finalizeSuccess();
          } else if (evt.status === 'failed') {
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
            setErrorMessage(evt.error || 'The security scan failed during pipeline execution.');
            setIsLoading(false);
            setCurrentPage('error');
          }
        },
        onError: (err) => {
          console.warn('[WebSocket] Falling back entirely to polling:', err);
        },
      });

      // 3. Status Polling as a fallback and synchronization mechanism
      let pollCount = 0;
      pollTimerRef.current = window.setInterval(async () => {
        pollCount += 1;
        try {
          const statusRes = await api.getScanStatus(scanId);
          if (statusRes.progress) {
            setPollingProgress((prev) => Math.max(prev, statusRes.progress));
          }

          if (statusRes.status === 'completed') {
            clearInterval(pollTimerRef.current!);
            await finalizeSuccess();
          } else if (statusRes.status === 'failed') {
            clearInterval(pollTimerRef.current!);
            setErrorMessage(statusRes.message || 'The repository scan failed during execution. Please verify the repository is accessible.');
            setIsLoading(false);
            setCurrentPage('error');
          }

          // Timeout check (3 minutes max)
          if (pollCount > 120) {
            clearInterval(pollTimerRef.current!);
            setErrorMessage('Scan timed out waiting for backend response.');
            setIsLoading(false);
            setCurrentPage('error');
          }
        } catch (pollErr: unknown) {
          console.warn('[Polling] Status check issue:', pollErr);
        }
      }, 1500);

    } catch (err: unknown) {
      setIsLoading(false);
      let message = 'Failed to initiate repository scan.';
      if (err instanceof ApiError) {
        message = err.message;
      } else if (err instanceof Error) {
        message = err.message;
      }
      setErrorMessage(message);
      setCurrentPage('error');
    }
  };

  const handleCancelLoading = () => {
    if (cleanupWsRef.current) cleanupWsRef.current();
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    setIsLoading(false);
    setCurrentPage('home');
  };

  return (
    <div className="min-h-screen bg-[#080b12] text-slate-100 flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Top Navbar */}
      <Navbar
        currentPage={currentPage === 'loading' || currentPage === 'error' ? 'home' : currentPage}
        onNavigate={(page) => {
          if (page === 'home') {
            if (activeReport) {
              setCurrentPage('results');
            } else {
              setCurrentPage('home');
            }
          } else {
            setCurrentPage('history');
          }
        }}
      />

      {/* Main Page Routing */}
      <main className="flex-1">
        {currentPage === 'home' && (
          <Home
            onStartAudit={handleStartAudit}
            isLoading={isLoading}
            onNavigateHistory={() => setCurrentPage('history')}
          />
        )}

        {currentPage === 'loading' && (
          <AuditLoading
            repoName={activeRepoName}
            githubUrl={activeGithubUrl}
            currentEvent={currentEvent}
            pollingProgress={pollingProgress}
            errorMessage={errorMessage}
            onRetry={() => handleStartAudit(activeGithubUrl)}
            onCancel={handleCancelLoading}
          />
        )}

        {currentPage === 'results' && activeReport && (
          <AuditResults
            report={activeReport}
            onBack={() => {
              setActiveReport(null);
              setCurrentPage('home');
            }}
            onReAudit={(url) => handleStartAudit(url)}
          />
        )}

        {currentPage === 'history' && (
          <HistoryPage
            onAuditRepo={(url) => handleStartAudit(url)}
            onNavigateHome={() => setCurrentPage('home')}
          />
        )}

        {currentPage === 'error' && (
          <ErrorState
            title="Scan Failed"
            message={errorMessage || 'An unexpected error occurred while analyzing the repository.'}
            onRetry={() => handleStartAudit(activeGithubUrl)}
            onReset={() => {
              setErrorMessage(null);
              setCurrentPage('home');
            }}
            retryLabel="Retry Analysis"
            resetLabel="Try another repository"
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#252b38] bg-[#080b12] py-6 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} Ledgerly Security Intelligence. Fast supply-chain vulnerability auditor.</p>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Powered by OSV.dev</span>
            <span>•</span>
            <span>FastAPI Engine</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
