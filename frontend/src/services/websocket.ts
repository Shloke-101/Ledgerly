import { WebSocketScanEvent } from '../types/api';

export interface ScanSubscriptionCallbacks {
  onEvent?: (event: WebSocketScanEvent) => void;
  onComplete?: (event: WebSocketScanEvent) => void;
  onError?: (error: Error) => void;
}

export function subscribeToScan(
  scanId: string,
  callbacks: ScanSubscriptionCallbacks
): () => void {
  const baseUrl = (import.meta.env.VITE_API_URL || window.location.origin).replace(/\/$/, '');
  const wsProtocol = baseUrl.startsWith('https') ? 'wss:' : 'ws:';
  
  // Extract host part (e.g., localhost:8001)
  let host = window.location.host;
  try {
    const url = new URL(baseUrl);
    host = url.host;
  } catch {
    // fallback to window.location.host
  }

  const wsUrl = `${wsProtocol}//${host}/ws/scans/${scanId}`;
  let ws: WebSocket | null = null;
  let isClosed = false;

  try {
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log(`[WebSocket] Connected to scan stream: ${scanId}`);
    };

    ws.onmessage = (event) => {
      try {
        const payload: WebSocketScanEvent = JSON.parse(event.data);
        callbacks.onEvent?.(payload);

        if (payload.status === 'completed' || payload.status === 'failed') {
          callbacks.onComplete?.(payload);
        }
      } catch (err) {
        console.warn('[WebSocket] Failed to parse event message', event.data, err);
      }
    };

    ws.onerror = (event) => {
      console.warn('[WebSocket] Error in scan stream:', event);
      callbacks.onError?.(new Error('WebSocket connection error'));
    };

    ws.onclose = () => {
      if (!isClosed) {
        console.log(`[WebSocket] Stream closed for scan: ${scanId}`);
      }
    };
  } catch (err) {
    console.warn('[WebSocket] Could not establish connection:', err);
    callbacks.onError?.(err instanceof Error ? err : new Error(String(err)));
  }

  // Cleanup function
  return () => {
    isClosed = true;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
  };
}
