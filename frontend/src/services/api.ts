import {
  DemoRepo,
  HealthResponse,
  RepoSummary,
  ScanCreateResponse,
  ScanReport,
  ScanStatusResponse,
  URLParseResponse,
} from '../types/api';

const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export class ApiError extends Error {
  statusCode?: number;
  technicalDetails?: string;

  constructor(message: string, statusCode?: number, technicalDetails?: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.technicalDetails = technicalDetails;
  }
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      let errorMessage = `Request failed with status ${response.status}`;
      let technical = '';
      try {
        const errorData = await response.json();
        if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        } else if (errorData.detail && Array.isArray(errorData.detail)) {
          errorMessage = errorData.detail.map((d: { msg?: string }) => d.msg || 'Validation error').join(', ');
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
        technical = JSON.stringify(errorData);
      } catch {
        technical = await response.text().catch(() => '');
      }

      // Friendly mapping according to product guidelines
      if (response.status === 404) {
        throw new ApiError(errorMessage || 'Repository or scan not found.', 404, technical);
      } else if (response.status === 422 || response.status === 400) {
        throw new ApiError(errorMessage || 'Invalid repository URL format.', response.status, technical);
      } else if (response.status >= 500) {
        throw new ApiError(errorMessage || 'Backend service error occurred.', response.status, technical);
      }

      throw new ApiError(errorMessage, response.status, technical);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) {
      console.error(`[API Error] ${endpoint}:`, error.message, error.technicalDetails);
      throw error;
    }

    const networkError = error as Error;
    console.error(`[Network Error] ${endpoint}:`, networkError);
    throw new ApiError(
      'Unable to reach Ledgerly backend. Please check your connection and ensure the backend server is running.',
      0,
      networkError.message
    );
  }
}

export const api = {
  getApiBaseUrl(): string {
    return API_BASE_URL;
  },

  async checkHealth(): Promise<HealthResponse> {
    return request<HealthResponse>('/health');
  },

  async parseRepoUrl(githubUrl: string): Promise<URLParseResponse> {
    return request<URLParseResponse>('/api/repos/parse', {
      method: 'POST',
      body: JSON.stringify({ github_url: githubUrl }),
    });
  },

  async getDemoRepos(): Promise<DemoRepo[]> {
    return request<DemoRepo[]>('/api/repos/demo');
  },

  async listRecentRepos(limit = 10): Promise<RepoSummary[]> {
    return request<RepoSummary[]>(`/api/repos?limit=${encodeURIComponent(limit)}`);
  },

  async createScan(githubUrl: string): Promise<ScanCreateResponse> {
    return request<ScanCreateResponse>('/api/scans', {
      method: 'POST',
      body: JSON.stringify({ github_url: githubUrl.trim() }),
    });
  },

  async getScanStatus(scanId: string): Promise<ScanStatusResponse> {
    return request<ScanStatusResponse>(`/api/scans/${encodeURIComponent(scanId)}`);
  },

  async getScanReport(scanId: string): Promise<ScanReport> {
    return request<ScanReport>(`/api/scans/${encodeURIComponent(scanId)}/report`);
  },
};
