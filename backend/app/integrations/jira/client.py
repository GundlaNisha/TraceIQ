"""Asynchronous Jira REST API Client.

Supports Jira Cloud REST API v3 with automatic fallback to v2 and Jira Server/Data Center.
"""

from __future__ import annotations

import base64
import logging
from collections.abc import Awaitable, Callable
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
    """Asynchronous client interacting with Jira REST API (API Token or OAuth 2.0 3LO)."""

    def __init__(
        self,
        domain: str,
        email: str = "",
        api_token: str = "",
        timeout: float = 15.0,
        *,
        auth_type: str = "api_token",
        access_token: str = "",
        cloud_id: str | None = None,
        on_token_refresh: Callable[[], Awaitable[str]] | None = None,
    ):
        self.site_url = normalize_jira_url(domain)
        self.email = email.strip()
        self.api_token = api_token.strip()
        self.timeout = timeout
        self.auth_type = auth_type
        self.cloud_id = cloud_id
        self._on_token_refresh = on_token_refresh

        if auth_type == "oauth2" and cloud_id:
            self.base_url = f"https://api.atlassian.com/ex/jira/{cloud_id}"
            self._auth_header = f"Bearer {access_token.strip()}"
        else:
            self.base_url = self.site_url
            auth_bytes = f"{self.email}:{self.api_token}".encode()
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
        _retried_auth: bool = False,
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
                    f"Could not connect to Jira instance at {self.site_url}. Please check the domain name and network accessibility.",
                    status_code=502,
                ) from e
            except httpx.RequestError as e:
                logger.error(f"Jira request error: {e}")
                raise JiraApiError(f"Network error communicating with Jira: {e!s}", status_code=502) from e

        if response.status_code == 401 and self.auth_type == "oauth2" and self._on_token_refresh and not _retried_auth:
            new_access_token = await self._on_token_refresh()
            self._auth_header = f"Bearer {new_access_token.strip()}"
            return await self._request(
                method=method,
                path=path,
                params=params,
                json_data=json_data,
                _retried_auth=True,
            )

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
            "jira_url": self.site_url,
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
                # Jira Cloud /rest/api/3/search/jql rejects unbounded JQL queries.
                final_jql = "issuetype IS NOT EMPTY ORDER BY updated DESC"

        fields_list = [
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
        ]
        clamped_max = min(max_results, 100)
        data = await self._search_jql_raw(
            jql=final_jql,
            fields_list=[
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
            start_at=start_at,
            max_results=clamped_max,
            expand="renderedFields",
        )

        issues_raw = data.get("issues", [])
        items: list[dict[str, Any]] = []

        for raw in issues_raw:
            parsed = self._parse_issue_summary(raw)
            items.append(parsed)

        total = data.get("total")
        if total is None:
            is_last = data.get("isLast", True)
            total = start_at + len(items) if is_last else start_at + len(items) + 1

        return {
            "total": total,
            "start_at": data.get("startAt", start_at),
            "max_results": data.get("maxResults", max_results),
            "issues": items,
        }

    async def _search_jql_raw(
        self,
        jql: str,
        fields_list: list[str],
        start_at: int = 0,
        max_results: int = 50,
        expand: str = "renderedFields",
    ) -> dict[str, Any]:
        """Execute a JQL search preferring Jira Cloud /search/jql with Server fallback."""
        jql_params = {
            "jql": jql,
            "maxResults": max_results,
            "fields": ",".join(fields_list),
            "expand": expand,
        }
        legacy_params = {
            "jql": jql,
            "startAt": start_at,
            "maxResults": max_results,
            "fields": fields_list,
            "expand": expand,
        }
        try:
            return await self._request("GET", "/rest/api/3/search/jql", params=jql_params)
        except JiraApiError as e:
            if e.status_code in (404, 405, 410):
                try:
                    return await self._request("GET", "/rest/api/3/search", params=legacy_params)
                except JiraApiError as e2:
                    if e2.status_code in (404, 400, 405, 410):
                        return await self._request("GET", "/rest/api/2/search", params=legacy_params)
                    raise
            raise

    async def get_issues_by_keys(self, issue_keys: list[str]) -> dict[str, dict[str, Any]]:
        """Batch-fetch full parsed issue details for a list of Jira issue keys."""
        cleaned = [k.strip() for k in issue_keys if k and k.strip()]
        if not cleaned:
            return {}

        fields_list = [
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
        ]
        results: dict[str, dict[str, Any]] = {}
        for i in range(0, len(cleaned), 50):
            chunk = cleaned[i : i + 50]
            jql = "key IN (" + ", ".join(f'"{k}"' for k in chunk) + ")"
            data = await self._search_jql_raw(
                jql=jql,
                fields_list=fields_list,
                start_at=0,
                max_results=len(chunk),
                expand="renderedFields,names",
            )
            for raw in data.get("issues", []):
                parsed = self._parse_issue_detail(raw)
                if parsed.get("key"):
                    results[parsed["key"]] = parsed

        return results

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
            "url": f"{self.site_url}/browse/{key}",
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
            full_text = f"Requirement imported from Jira issue [{key}]({self.site_url}/browse/{key}): {summary}"

        return {
            "id": str(raw.get("id", "")),
            "key": key,
            "summary": summary,
            "url": f"{self.site_url}/browse/{key}",
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

    # ------------------------------------------------------------------
    # Phase 2: Bidirectional Sync — Comment posting, Transitions
    # ------------------------------------------------------------------

    @staticmethod
    def _markdown_to_adf(text: str) -> dict:
        """Convert plain text / light Markdown to minimal Atlassian Document Format (ADF).

        Supports paragraphs, **bold**, *italic*, `code`, [links](url),
        fenced code blocks (with optional language), blockquotes (>),
        bullet lists (- / *), and headings (# / ## / ###).
        """
        import re

        def parse_inline(line: str) -> list[dict]:
            nodes: list[dict] = []
            pattern = re.compile(
                r"(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|\[(.+?)\]\((https?://[^\s)]+)\))"
            )
            last = 0
            for m in pattern.finditer(line):
                if m.start() > last:
                    nodes.append({"type": "text", "text": line[last : m.start()]})
                raw = m.group(0)
                if raw.startswith("**"):
                    nodes.append({"type": "text", "text": m.group(2), "marks": [{"type": "strong"}]})
                elif raw.startswith("*"):
                    nodes.append({"type": "text", "text": m.group(3), "marks": [{"type": "em"}]})
                elif raw.startswith("`"):
                    nodes.append({"type": "text", "text": m.group(4), "marks": [{"type": "code"}]})
                elif raw.startswith("["):
                    link_text = m.group(5)
                    link_url = m.group(6)
                    nodes.append({
                        "type": "text",
                        "text": link_text,
                        "marks": [{"type": "link", "attrs": {"href": link_url}}],
                    })
                last = m.end()
            if last < len(line):
                nodes.append({"type": "text", "text": line[last:]})
            return nodes or [{"type": "text", "text": line}]

        content: list[dict] = []
        lines = text.split("\n")
        i = 0
        while i < len(lines):
            line = lines[i]

            # Fenced code block
            if line.strip().startswith("```"):
                lang = line.strip()[3:].strip()
                code_lines: list[str] = []
                i += 1
                while i < len(lines) and not lines[i].strip().startswith("```"):
                    code_lines.append(lines[i])
                    i += 1
                attrs = {"language": lang} if lang else {}
                content.append({
                    "type": "codeBlock",
                    "attrs": attrs,
                    "content": [{"type": "text", "text": "\n".join(code_lines)}],
                })

            # Blockquote
            elif line.startswith(">"):
                quote_text = re.sub(r"^>\s*", "", line)
                content.append({
                    "type": "blockquote",
                    "content": [{"type": "paragraph", "content": parse_inline(quote_text)}],
                })

            # Heading
            elif re.match(r"^#{1,3} ", line):
                heading_match = re.match(r"^(#+)", line)
                level = len(heading_match.group(1)) if heading_match else 1
                heading_text = re.sub(r"^#+\s+", "", line)
                content.append({
                    "type": "heading",
                    "attrs": {"level": min(level, 3)},
                    "content": parse_inline(heading_text),
                })

            # Bullet list item — collect consecutive items
            elif re.match(r"^[-*] ", line):
                list_items: list[dict] = []
                while i < len(lines) and re.match(r"^[-*] ", lines[i]):
                    item_text = re.sub(r"^[-*] ", "", lines[i])
                    list_items.append({
                        "type": "listItem",
                        "content": [{"type": "paragraph", "content": parse_inline(item_text)}],
                    })
                    i += 1
                content.append({"type": "bulletList", "content": list_items})
                continue  # already advanced i

            # Blank line
            elif line.strip() == "":
                pass

            # Regular paragraph
            else:
                content.append({"type": "paragraph", "content": parse_inline(line)})

            i += 1

        if not content:
            content = [{"type": "paragraph", "content": [{"type": "text", "text": text}]}]

        return {"type": "doc", "version": 1, "content": content}

    async def post_comment(self, issue_key: str, body_text: str) -> dict[str, Any]:
        """Post a comment on a Jira issue.

        Args:
            issue_key: Jira issue key (e.g. PROJ-123).
            body_text: Plain text or Markdown comment body.

        Returns:
            dict with comment_id, author, created timestamp.
        """
        key = issue_key.strip()
        if not key:
            raise JiraApiError("Issue key is required", status_code=400)
        if not body_text.strip():
            raise JiraApiError("Comment body cannot be empty", status_code=400)

        adf_body = self._markdown_to_adf(body_text)
        payload: dict[str, Any] = {"body": adf_body}

        try:
            data = await self._request("POST", f"/rest/api/3/issue/{key}/comment", json_data=payload)
        except JiraApiError as e:
            if e.status_code in (400, 404, 405):
                # Fallback: Jira v2 accepts plain-text body string
                v2_payload: dict[str, Any] = {"body": body_text}
                data = await self._request("POST", f"/rest/api/2/issue/{key}/comment", json_data=v2_payload)
            else:
                raise

        author = data.get("author") or {}
        return {
            "comment_id": str(data.get("id", "")),
            "author": author.get("displayName") or author.get("emailAddress") or self.email,
            "created": data.get("created"),
            "self_url": data.get("self", ""),
        }

    async def get_issue_transitions(self, issue_key: str) -> list[dict[str, Any]]:
        """List available workflow transitions for a Jira issue.

        Args:
            issue_key: Jira issue key (e.g. PROJ-123).

        Returns:
            List of transition dicts with id, name, to_status, to_status_category.
        """
        key = issue_key.strip()
        if not key:
            raise JiraApiError("Issue key is required", status_code=400)

        try:
            data = await self._request("GET", f"/rest/api/3/issue/{key}/transitions")
        except JiraApiError as e:
            if e.status_code in (400, 404):
                data = await self._request("GET", f"/rest/api/2/issue/{key}/transitions")
            else:
                raise

        transitions = []
        for t in data.get("transitions", []):
            if not isinstance(t, dict):
                continue
            to = t.get("to") or {}
            status_cat = to.get("statusCategory") or {}
            transitions.append({
                "id": str(t.get("id", "")),
                "name": t.get("name", ""),
                "to_status": to.get("name", ""),
                "to_status_category": status_cat.get("key", "undefined"),
            })
        return transitions

    async def transition_issue(self, issue_key: str, transition_id: str) -> None:
        """Apply a workflow transition to a Jira issue.

        Args:
            issue_key: Jira issue key (e.g. PROJ-123).
            transition_id: Transition ID from get_issue_transitions().
        """
        key = issue_key.strip()
        if not key or not transition_id.strip():
            raise JiraApiError("Issue key and transition_id are required", status_code=400)

        payload: dict[str, Any] = {"transition": {"id": str(transition_id).strip()}}

        try:
            await self._request("POST", f"/rest/api/3/issue/{key}/transitions", json_data=payload)
        except JiraApiError as e:
            if e.status_code in (400, 404, 405):
                await self._request("POST", f"/rest/api/2/issue/{key}/transitions", json_data=payload)
            else:
                raise

    # ------------------------------------------------------------------
    # Dynamic Webhooks (OAuth 2.0 3LO — Jira Cloud REST API v3)
    # ------------------------------------------------------------------

    async def register_dynamic_webhook(
        self,
        webhook_url: str,
        jql_filter: str = "issuetype IS NOT EMPTY",
        events: list[str] | None = None,
    ) -> str:
        """Register a dynamic webhook in Jira Cloud (valid for 30 days)."""
        target_events = events or ["jira:issue_updated", "jira:issue_deleted"]
        payload = {
            "url": webhook_url,
            "webhooks": [
                {
                    "jqlFilter": jql_filter,
                    "events": target_events,
                }
            ],
        }
        data = await self._request("POST", "/rest/api/3/webhook", json_data=payload)
        results = data.get("webhookRegistrationResult", [])
        if not results:
            raise JiraApiError("Jira returned empty webhookRegistrationResult", status_code=502, details=data)

        first = results[0]
        if first.get("errors"):
            err_str = "; ".join(str(e) for e in first["errors"])
            raise JiraApiError(f"Failed to register Jira webhook: {err_str}", status_code=400, details=first)

        created_id = first.get("createdWebhookId")
        if created_id is None:
            raise JiraApiError("Jira did not return createdWebhookId", status_code=502, details=first)
        return str(created_id)

    async def list_dynamic_webhooks(self) -> list[dict[str, Any]]:
        """List dynamic webhooks registered by this OAuth 2.0 app on the Jira site."""
        data = await self._request("GET", "/rest/api/3/webhook")
        return list(data.get("values", [])) if isinstance(data, dict) else []

    async def refresh_dynamic_webhooks(self, webhook_ids: list[int | str]) -> str | None:
        """Extend the expiration of registered dynamic webhooks by 30 days."""
        numeric_ids: list[int] = []
        for wid in webhook_ids:
            try:
                numeric_ids.append(int(wid))
            except (TypeError, ValueError):
                continue
        if not numeric_ids:
            return None

        data = await self._request(
            "PUT",
            "/rest/api/3/webhook/refresh",
            json_data={"webhookIds": numeric_ids},
        )
        return data.get("expirationDate") if isinstance(data, dict) else None

    async def delete_dynamic_webhooks(self, webhook_ids: list[int | str]) -> None:
        """Delete dynamic webhooks registered by this OAuth 2.0 app."""
        numeric_ids: list[int] = []
        for wid in webhook_ids:
            try:
                numeric_ids.append(int(wid))
            except (TypeError, ValueError):
                continue
        if not numeric_ids:
            return
        await self._request(
            "DELETE",
            "/rest/api/3/webhook",
            json_data={"webhookIds": numeric_ids},
        )
