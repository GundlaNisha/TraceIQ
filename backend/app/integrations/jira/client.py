"""Asynchronous Jira REST API Client.

Supports Jira Cloud REST API v3 with automatic fallback to v2 and Jira Server/Data Center.
"""

from __future__ import annotations

import base64
import logging
from typing import Any
import httpx

from app.integrations.jira.adf_converter import adf_to_markdown

logger = logging.getLogger(__name__)


class JiraApiError(Exception):
    """Custom exception for Jira API errors."""

    def __init__(self, message: str, status_code: int = 400, details: Any = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.details = details


def normalize_jira_url(domain_or_url: str) -> str:
    """Ensure Jira URL starts with https:// and has no trailing slash."""
    url = domain_or_url.strip()
    if not url:
        raise JiraApiError("Jira domain/URL cannot be empty", status_code=400)

    if not url.startswith("http://") and not url.startswith("https://"):
        url = f"https://{url}"

    url = url.rstrip("/")
    return url


class JiraClient:
    """Asynchronous client interacting with Jira REST API."""

    def __init__(self, domain: str, email: str, api_token: str, timeout: float = 15.0):
        self.base_url = normalize_jira_url(domain)
        self.email = email.strip()
        self.api_token = api_token.strip()
        self.timeout = timeout

        # Basic Auth header: email:api_token
        auth_bytes = f"{self.email}:{self.api_token}".encode("utf-8")
        self._auth_header = f"Basic {base64.b64encode(auth_bytes).decode('utf-8')}"

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": self._auth_header,
            "Accept": "application/json",
            "Content-Type": "application/json",
            "User-Agent": "TraceIQ-App/1.0",
        }

    async def _request(
        self,
        method: str,
        path: str,
        params: dict[str, Any] | None = None,
        json_data: dict[str, Any] | None = None,
    ) -> Any:
        url = f"{self.base_url}{path}"
        headers = self._headers()

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.request(
                    method=method,
                    url=url,
                    headers=headers,
                    params=params,
                    json=json_data,
                )
            except (httpx.ConnectError, httpx.TimeoutException) as e:
                logger.error(f"Jira network error connecting to {url}: {e}")
                raise JiraApiError(
                    f"Could not connect to Jira instance at {self.base_url}. Please check the domain name and network accessibility.",
                    status_code=502,
                ) from e
            except httpx.RequestError as e:
                logger.error(f"Jira request error: {e}")
                raise JiraApiError(f"Network error communicating with Jira: {e!s}", status_code=502) from e

        if response.is_success:
            if response.status_code == 204:
                return {}
            return response.json()

        # Handle Jira error responses
        status_code = response.status_code
        error_msg = f"Jira API error ({status_code})"
        details = None
        try:
            body = response.json()
            details = body
            if isinstance(body, dict):
                if "errorMessages" in body and body["errorMessages"]:
                    error_msg = "; ".join(body["errorMessages"])
                elif "errors" in body and isinstance(body["errors"], dict):
                    error_msg = "; ".join(f"{k}: {v}" for k, v in body["errors"].items())
                elif "message" in body:
                    error_msg = body["message"]
        except Exception:
            error_msg = response.text or error_msg

        if status_code == 401:
            raise JiraApiError(
                "Authentication failed. Please verify your Jira email and API token.",
                status_code=401,
                details=details,
            )
        elif status_code == 403:
            raise JiraApiError(
                f"Access denied: {error_msg}. Check your Jira permissions.",
                status_code=403,
                details=details,
            )
        elif status_code == 404:
            raise JiraApiError(
                f"Resource not found on Jira instance: {error_msg}",
                status_code=404,
                details=details,
            )
        elif status_code == 429:
            raise JiraApiError(
                "Jira rate limit exceeded. Please retry in a few moments.",
                status_code=429,
                details=details,
            )
        else:
            raise JiraApiError(
                f"Jira API error ({status_code}): {error_msg}",
                status_code=status_code if 400 <= status_code < 500 else 502,
                details=details,
            )

    async def test_connection(self) -> dict[str, Any]:
        """Test authentication and retrieve current user profile."""
        # Try v3 first, fallback to v2
        try:
            data = await self._request("GET", "/rest/api/3/myself")
        except JiraApiError as e:
            if e.status_code in (404, 400):
                data = await self._request("GET", "/rest/api/2/myself")
            else:
                raise

        return {
            "account_id": data.get("accountId") or data.get("key") or data.get("name"),
            "display_name": data.get("displayName") or data.get("name", "Jira User"),
            "email_address": data.get("emailAddress") or self.email,
            "active": data.get("active", True),
            "jira_url": self.base_url,
        }

    async def get_projects(self) -> list[dict[str, Any]]:
        """List all accessible Jira projects."""
        try:
            data = await self._request("GET", "/rest/api/3/project")
        except JiraApiError as e:
            if e.status_code in (404, 400):
                data = await self._request("GET", "/rest/api/2/project")
            else:
                raise

        projects = []
        if isinstance(data, list):
            for p in data:
                if isinstance(p, dict):
                    avatar_urls = p.get("avatarUrls", {})
                    projects.append({
                        "id": str(p.get("id", "")),
                        "key": p.get("key", ""),
                        "name": p.get("name", ""),
                        "project_type_key": p.get("projectTypeKey", "software"),
                        "avatar_url": avatar_urls.get("48x48") or avatar_urls.get("32x32") or avatar_urls.get("16x16") or "",
                    })
        return projects

    async def get_issue_types(self) -> list[dict[str, Any]]:
        """List all configured issue types (Stories, Tasks, To-Dos, Bugs, Epics, Sub-tasks, etc.)."""
        try:
            data = await self._request("GET", "/rest/api/3/issuetype")
        except JiraApiError as e:
            if e.status_code in (404, 400):
                data = await self._request("GET", "/rest/api/2/issuetype")
            else:
                raise

        types = []
        if isinstance(data, list):
            for t in data:
                if isinstance(t, dict):
                    types.append({
                        "id": str(t.get("id", "")),
                        "name": t.get("name", ""),
                        "description": t.get("description", ""),
                        "subtask": bool(t.get("subtask", False)),
                        "icon_url": t.get("iconUrl", ""),
                    })
        return types

    async def get_statuses(self) -> list[dict[str, Any]]:
        """List all workflow statuses (To Do, In Progress, Backlog, Done, etc.)."""
        try:
            data = await self._request("GET", "/rest/api/3/status")
        except JiraApiError as e:
            if e.status_code in (404, 400):
                data = await self._request("GET", "/rest/api/2/status")
            else:
                raise

        statuses = []
        if isinstance(data, list):
            for s in data:
                if isinstance(s, dict):
                    cat = s.get("statusCategory") or {}
                    statuses.append({
                        "id": str(s.get("id", "")),
                        "name": s.get("name", ""),
                        "category_key": cat.get("key", "undefined"),
                        "category_name": cat.get("name", "Unknown"),
                    })
        return statuses

    async def get_boards(self, project_key_or_id: str | None = None) -> list[dict[str, Any]]:
        """List all Kanban and Scrum boards."""
        params: dict[str, Any] = {"maxResults": 50}
        if project_key_or_id:
            params["projectKeyOrId"] = project_key_or_id

        try:
            data = await self._request("GET", "/rest/agile/1.0/board", params=params)
        except JiraApiError:
            # If Agile API not available or no permissions, return empty list
            return []

        values = data.get("values", [])
        boards = []
        for b in values:
            if isinstance(b, dict):
                loc = b.get("location") or {}
                boards.append({
                    "id": b.get("id"),
                    "name": b.get("name", ""),
                    "type": b.get("type", "kanban"),  # "kanban" or "scrum"
                    "project_key": loc.get("projectKey") or loc.get("projectKeyOrId"),
                    "project_name": loc.get("projectName"),
                })
        return boards

    async def get_board_sprints(self, board_id: int | str, state: str = "active,future") -> list[dict[str, Any]]:
        """List sprints for a Scrum board."""
        try:
            data = await self._request("GET", f"/rest/agile/1.0/board/{board_id}/sprint", params={"state": state})
        except JiraApiError:
            return []

        values = data.get("values", [])
        sprints = []
        for s in values:
            if isinstance(s, dict):
                sprints.append({
                    "id": s.get("id"),
                    "name": s.get("name", ""),
                    "state": s.get("state", "active"),
                    "goal": s.get("goal"),
                    "start_date": s.get("startDate"),
                    "end_date": s.get("endDate"),
                })
        return sprints

    async def search_issues(
        self,
        jql: str = "",
        query: str = "",
        project_key: str | None = None,
        issue_type: str | None = None,
        status: str | None = None,
        status_category: str | None = None,
        board_id: int | str | None = None,
        sprint_id: int | str | None = None,
        start_at: int = 0,
        max_results: int = 50,
    ) -> dict[str, Any]:
        """Search Jira issues using JQL or structured query parameters including boards, sprints, and statuses."""
        # If board_id is provided, try fetching directly from agile board endpoint
        if board_id and not jql:
            try:
                board_params: dict[str, Any] = {
                    "startAt": start_at,
                    "maxResults": min(max_results, 100),
                    "fields": [
                        "summary",
                        "description",
                        "status",
                        "issuetype",
                        "priority",
                        "project",
                        "assignee",
                        "updated",
                        "created",
                        "labels",
                    ],
                    "expand": "renderedFields",
                }
                if query:
                    clean_q = query.replace('"', '\\"')
                    board_params["jql"] = f'(key = "{clean_q}" OR summary ~ "{clean_q}" OR text ~ "{clean_q}")'

                data = await self._request("GET", f"/rest/agile/1.0/board/{board_id}/issue", params=board_params)
                issues_raw = data.get("issues", [])
                total = data.get("total", len(issues_raw))
                items = [self._parse_issue_summary(raw) for raw in issues_raw]
                return {
                    "total": total,
                    "start_at": data.get("startAt", start_at),
                    "max_results": data.get("maxResults", max_results),
                    "issues": items,
                }
            except JiraApiError:
                # Fallback to JQL search
                pass

        final_jql = jql.strip()
        if not final_jql:
            clauses = []
            if project_key:
                clauses.append(f'project = "{project_key}"')
            if issue_type:
                clauses.append(f'issuetype = "{issue_type}"')
            if status:
                clauses.append(f'status = "{status}"')
            if status_category:
                clauses.append(f'statusCategory = "{status_category}"')
            if sprint_id:
                clauses.append(f'sprint = {sprint_id}')
            if query:
                clean_q = query.replace('"', '\\"')
                # Search key or summary or text
                clauses.append(f'(key = "{clean_q}" OR summary ~ "{clean_q}" OR text ~ "{clean_q}")')

            if clauses:
                final_jql = " AND ".join(clauses) + " ORDER BY updated DESC"
            else:
                final_jql = "ORDER BY updated DESC"

        params = {
            "jql": final_jql,
            "startAt": start_at,
            "maxResults": min(max_results, 100),
            "fields": [
                "summary",
                "description",
                "status",
                "issuetype",
                "priority",
                "project",
                "assignee",
                "updated",
                "created",
                "labels",
            ],
            "expand": "renderedFields",
        }

        try:
            data = await self._request("GET", "/rest/api/3/search", params=params)
        except JiraApiError as e:
            if e.status_code in (404, 400, 405):
                # Try v2 search fallback
                data = await self._request("GET", "/rest/api/2/search", params=params)
            else:
                raise

        issues_raw = data.get("issues", [])
        total = data.get("total", len(issues_raw))
        items: list[dict[str, Any]] = []

        for raw in issues_raw:
            parsed = self._parse_issue_summary(raw)
            items.append(parsed)

        return {
            "total": total,
            "start_at": data.get("startAt", start_at),
            "max_results": data.get("maxResults", max_results),
            "issues": items,
        }

    async def get_issue(self, issue_key_or_id: str) -> dict[str, Any]:
        """Fetch a single Jira issue by key (e.g. PROJ-123) or ID with full markdown conversion."""
        key = issue_key_or_id.strip()
        if not key:
            raise JiraApiError("Issue key or ID is required", status_code=400)

        # Handle full URL if user pasted full browse URL
        if "/browse/" in key:
            key = key.split("/browse/")[-1].split("?")[0].strip()

        params = {
            "fields": [
                "summary",
                "description",
                "status",
                "issuetype",
                "priority",
                "project",
                "assignee",
                "reporter",
                "updated",
                "created",
                "labels",
                "components",
                "issuelinks",
            ],
            "expand": "renderedFields,names",
        }

        try:
            data = await self._request("GET", f"/rest/api/3/issue/{key}", params=params)
        except JiraApiError as e:
            if e.status_code in (404, 400):
                data = await self._request("GET", f"/rest/api/2/issue/{key}", params=params)
            else:
                raise

        return self._parse_issue_detail(data)

    def _parse_issue_summary(self, raw: dict[str, Any]) -> dict[str, Any]:
        fields = raw.get("fields", {})
        key = raw.get("key", "")
        summary = fields.get("summary", "")

        status_obj = fields.get("status") or {}
        issuetype_obj = fields.get("issuetype") or {}
        priority_obj = fields.get("priority") or {}
        project_obj = fields.get("project") or {}
        assignee_obj = fields.get("assignee") or {}

        # Parse brief description
        desc_raw = fields.get("description")
        markdown_desc = adf_to_markdown(desc_raw)

        return {
            "id": str(raw.get("id", "")),
            "key": key,
            "summary": summary,
            "url": f"{self.base_url}/browse/{key}",
            "status": status_obj.get("name", "Unknown"),
            "status_category": (status_obj.get("statusCategory") or {}).get("key", "undefined"),
            "issue_type": issuetype_obj.get("name", "Story"),
            "issue_type_icon_url": issuetype_obj.get("iconUrl", ""),
            "priority": priority_obj.get("name", "Medium"),
            "priority_icon_url": priority_obj.get("iconUrl", ""),
            "project_key": project_obj.get("key", ""),
            "project_name": project_obj.get("name", ""),
            "assignee_name": assignee_obj.get("displayName") if assignee_obj else None,
            "updated_at": fields.get("updated"),
            "created_at": fields.get("created"),
            "labels": fields.get("labels", []),
            "description_preview": markdown_desc[:300] if markdown_desc else "",
        }

    def _parse_issue_detail(self, raw: dict[str, Any]) -> dict[str, Any]:
        fields = raw.get("fields", {})
        key = raw.get("key", "")
        summary = fields.get("summary", "")

        status_obj = fields.get("status") or {}
        issuetype_obj = fields.get("issuetype") or {}
        priority_obj = fields.get("priority") or {}
        project_obj = fields.get("project") or {}
        assignee_obj = fields.get("assignee") or {}
        reporter_obj = fields.get("reporter") or {}

        desc_raw = fields.get("description")
        markdown_desc = adf_to_markdown(desc_raw)

        # Build full requirement text formatted nicely
        text_parts = []
        if markdown_desc:
            text_parts.append(markdown_desc)

        # Append structured context if relevant (labels, components, etc.)
        labels = fields.get("labels", [])
        components = [c.get("name") for c in fields.get("components", []) if isinstance(c, dict) and c.get("name")]
        
        meta_lines = []
        if labels:
            meta_lines.append(f"**Labels**: {', '.join(labels)}")
        if components:
            meta_lines.append(f"**Components**: {', '.join(components)}")
        
        if meta_lines and not markdown_desc:
            text_parts.append("\n".join(meta_lines))

        full_text = "\n\n".join(text_parts).strip()
        if not full_text:
            full_text = f"Requirement imported from Jira issue [{key}]({self.base_url}/browse/{key}): {summary}"

        return {
            "id": str(raw.get("id", "")),
            "key": key,
            "summary": summary,
            "url": f"{self.base_url}/browse/{key}",
            "description_markdown": full_text,
            "raw_description": markdown_desc,
            "status": status_obj.get("name", "Unknown"),
            "status_category": (status_obj.get("statusCategory") or {}).get("key", "undefined"),
            "issue_type": issuetype_obj.get("name", "Story"),
            "issue_type_icon_url": issuetype_obj.get("iconUrl", ""),
            "priority": priority_obj.get("name", "Medium"),
            "priority_icon_url": priority_obj.get("iconUrl", ""),
            "project_key": project_obj.get("key", ""),
            "project_name": project_obj.get("name", ""),
            "assignee_name": assignee_obj.get("displayName") if assignee_obj else None,
            "reporter_name": reporter_obj.get("displayName") if reporter_obj else None,
            "updated_at": fields.get("updated"),
            "created_at": fields.get("created"),
            "labels": labels,
            "components": components,
        }
