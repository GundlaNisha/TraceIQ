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
  repository_url: string;
  repository_name: string;
  user: GitHubUser;
}
