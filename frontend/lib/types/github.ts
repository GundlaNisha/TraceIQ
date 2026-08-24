export interface GitHubUser {
  login: string;
  avatar_url: string;
}

export interface GitHubPullRequest {
  id: string;
  number: number;
  title: string;
  state: "open" | "closed" | "merged";
  html_url: string;
  created_at: string;
  updated_at: string;
  draft: boolean;
  repository_id?: string | null;
  repository_url: string;
  repository_name: string;
  workspace_id?: string | null;
  workspace_name?: string | null;
  user: GitHubUser;
}
