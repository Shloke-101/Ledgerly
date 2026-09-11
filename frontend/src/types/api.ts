export type ScanStatus = 'pending' | 'running' | 'completed' | 'failed';

export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low';

export interface ScanCreate {
  github_url: string;
}

export interface ScanCreateResponse {
  scan_id: string;
  repo_name: string;
  github_url: string;
  status: ScanStatus;
}

export interface ScanStatusResponse {
  scan_id: string;
  status: ScanStatus;
  risk_score?: number | null;
  progress: number;
  message?: string | null;
  total_dependencies?: number | null;
  vulnerable_count?: number | null;
}

export interface VulnerabilitySummary {
  id: string;
  osv_id: string;
  display_id?: string | null;
  severity: SeverityLevel | string;
  raw_description: string;
  llm_explanation?: string | null;
  suggested_fix_version?: string | null;
}

export interface DependencyReport {
  id: string;
  package_name: string;
  version: string;
  ecosystem: string;
  vulnerabilities: VulnerabilitySummary[];
}

export interface RepoDetails {
  id?: string;
  name?: string;
  github_url?: string;
  last_scanned_at?: string | null;
}

export interface ScanReport {
  scan_id: string;
  repo_id?: string | null;
  repo?: RepoDetails | null;
  status: ScanStatus;
  risk_score: number;
  started_at?: string | null;
  completed_at?: string | null;
  total_dependencies: number;
  vulnerable_dependencies_count: number;
  vulnerabilities_count: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  dependencies: DependencyReport[];
}

export interface RepoSummary {
  id: string;
  name: string;
  github_url: string;
  owner?: string | null;
  last_scanned_at?: string | null;
  created_at?: string | null;
}

export interface URLParseResponse {
  is_valid: boolean;
  owner: string;
  repo: string;
  normalized_url: string;
  display_name: string;
}

export interface DemoRepo {
  name: string;
  owner: string;
  github_url: string;
  description: string;
  language: string;
  ecosystem: string;
  sample_risk: string;
}

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  database: string;
  redis: string;
}

export interface WebSocketScanEvent {
  package_name: string;
  status: 'connecting' | 'parsing' | 'scanning' | 'clean' | 'vulnerable' | 'completed' | 'failed';
  message?: string;
  progress?: number;
  version?: string;
  ecosystem?: string;
  severity?: string | null;
  vuln_count?: number;
  risk_score?: number;
  total_dependencies?: number;
  vulnerable_count?: number;
  error?: string;
}
