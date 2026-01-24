export interface ExamSession {
  id: string;
  name: string;
  status: string;
  disqualification_reason: string | null;
  started_at: string | null;
  finished_at: string | null;
  duration_minutes: number | null;
  twk_score: number;
  tiu_score: number;
  tkp_score: number;
  total_score: number;
  answered_count: number;
  total_questions: number;
  device_fingerprint: string;
  created_at: string;
  deleted_at: string | null;
}

export interface AuditLog {
  id: string;
  action: string;
  target_id: string | null;
  target_name: string | null;
  details: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface FilterState {
  searchQuery: string;
  statusFilter: string;
  dateFrom: string;
  dateTo: string;
}
