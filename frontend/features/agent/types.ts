export interface TaggedEntity {
  type: "repo" | "req" | "pr";
  id: string;
  label: string;
  name?: string;
  details?: string;
}

export interface AgentSession {
  id: string;
  workspace_id: string;
  user_id: string;
  repository_id?: string | null;
  requirement_id?: string | null;
  title: string;
  status: string;
  current_phase: string;
  context_metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface AgentMessage {
  id: string;
  session_id: string;
  sender: "user" | "agent";
  agent_role?: string | null;
  content: string;
  message_type: string;
  artifacts?: Record<string, any>;
  tool_calls?: any[];
  created_at: string;
}

export interface AgentApproval {
  id: string;
  session_id: string;
  message_id?: string | null;
  action_type: "confirm_starting_point" | "confirm_review_standards" | "publish_pr_draft" | string;
  payload: Record<string, any>;
  status: "pending" | "approved" | "rejected" | "timed_out";
  user_feedback?: string | null;
  decided_by?: string | null;
  decided_at?: string | null;
  created_at: string;
}

export interface StartingPointItem {
  file_path: string;
  symbol_name: string;
  symbol_type?: string;
  line_start: number;
  line_end: number;
  confidence: number;
  reasoning: string;
}

export interface ImpactSummary {
  risk_level: "low" | "medium" | "high" | "critical" | string;
  impacted_files_count: number;
  impacted_files?: string[];
  affected_callers?: string[];
  downstream_routes?: string[];
  blast_radius_score?: number;
}

export interface ReviewFinding {
  file_path: string;
  rule_id?: string;
  severity: "high" | "medium" | "low";
  line_number?: number;
  message: string;
  recommendation?: string;
}

export interface TestGapItem {
  file_path: string;
  status?: string;
  recommendation?: string;
  target_function?: string;
}

export interface PRDraft {
  title: string;
  summary: string;
  raw_markdown: string;
  linked_requirement?: string;
}

export interface AgentSessionDetail {
  session: AgentSession;
  messages: AgentMessage[];
  approvals: AgentApproval[];
  pending_approval: AgentApproval | null;
}

export interface StreamEvent {
  type: "token" | "status" | "approval_request" | "done" | "error" | "ping";
  data: Record<string, any>;
  session_id?: string;
  timestamp?: number;
}
