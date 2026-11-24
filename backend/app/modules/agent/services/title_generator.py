"""Dynamic, human-friendly title generator for agent chat sessions.

Generates concise, informative session titles from the user's first prompt
and active repository/requirement context, similar to ChatGPT, Claude, and Cursor.
"""

from __future__ import annotations

import re


def generate_dynamic_chat_title(
    message: str,
    repo_name: str | None = None,
    req_title: str | None = None,
    max_length: int = 38,
) -> str:
    """Generate a clean, readable title for a chat session from the initial prompt.

    Args:
        message: The user's input prompt.
        repo_name: Optional name of the active repository (e.g. 'Sri-dinesh/resume-builder-ai').
        req_title: Optional title/key of the active requirement (e.g. '[KAN-5] Add resume auto-save').
        max_length: Maximum character limit for the title.

    Returns:
        A concise, capitalized title string (e.g. 'PR #7: Enhance forms', 'Check Blast Radius').
    """
    cleaned = (message or "").strip()
    if not cleaned:
        if repo_name:
            short_repo = repo_name.split("/")[-1]
            return f"Chat • {short_repo}"[:max_length]
        return "New Chat"

    lower = cleaned.lower()

    # 1. PR mentions: e.g. PR #7 or @PR #7: Enhance forms
    pr_match = re.search(r"PR\s*#?(\d+)", cleaned, re.IGNORECASE)
    if pr_match:
        pr_num = pr_match.group(1)
        sub_match = re.search(rf"PR\s*#?{pr_num}[:\s\-]+([^@\n\r]+)", cleaned, re.IGNORECASE)
        if sub_match:
            sub = sub_match.group(1).strip()
            sub = re.sub(r"\s+", " ", sub).strip(" .,!?:;-")
            return f"PR #{pr_num}: {sub}"[:max_length].rstrip(" .:-")
        return f"Review PR #{pr_num}"

    # 2. Jira keys: e.g. [KAN-5] Add resume auto-save or PROJ-102
    jira_match = re.search(r"\b([A-Z][A-Z0-9]+-\d+)\b", cleaned)
    if jira_match:
        j_key = jira_match.group(1)
        sub_match = re.search(rf"{j_key}\]?\s*[:\-]?\s*([^@\n\r]+)", cleaned)
        if sub_match:
            sub = sub_match.group(1).strip()
            sub = re.sub(r"\s+", " ", sub).strip(" .,!?:;-")
            return f"{j_key}: {sub}"[:max_length].rstrip(" .:-")
        return f"Requirement {j_key}"

    # 3. Check for specific goal in "Where should I start ... to/for <goal>"
    start_goal_match = re.search(
        r"where should i start.*?\b(?:to|for)\s+(.+)", cleaned, re.IGNORECASE
    )
    if start_goal_match:
        goal = start_goal_match.group(1).strip()
        goal = re.sub(r"@[a-zA-Z0-9_\-\.\/]+", "", goal)
        goal = re.sub(r"\[.*?\]", "", goal)
        goal = re.sub(r"\s+", " ", goal)
        goal = re.sub(r"^[\s.,!?:;?_~-]+|[\s.,!?:;?_~-]+$", "", goal)
        if goal and not goal.lower().startswith("implement this requirement"):
            goal = goal[0].upper() + goal[1:]
            return goal[:max_length].rstrip(" .:-")

    # 4. Standard quick actions
    if "where should i start" in lower or "starting point" in lower:
        if req_title:
            t = re.sub(r"^\[.*?\]\s*", "", req_title).strip()
            return f"Start: {t}"[:max_length].rstrip(" .:-")
        if repo_name:
            short_repo = repo_name.split("/")[-1]
            return f"Explore {short_repo}"[:max_length]
        return "Find Starting Points"

    if "blast radius" in lower:
        return "Check Blast Radius"

    if (
        "pre-review" in lower
        or "standards and security" in lower
        or "coding standards" in lower
    ):
        return "Standards & Security Audit"

    if (
        "missing unit test" in lower
        or "test coverage gaps" in lower
        or "missing test" in lower
    ):
        return "Check Missing Tests"

    if (
        "pull request description" in lower
        or "draft a pr" in lower
        or "draft pr" in lower
    ):
        return "Draft PR Description"

    # 5. Tagged repo detection if message is "audit this project @Sri-dinesh/resume-builder-ai"
    tagged_repo = None
    repo_mention = re.search(
        r"@([a-zA-Z0-9_\-]+/[a-zA-Z0-9_\-]+|[a-zA-Z0-9_\-]{3,})", cleaned
    )
    if repo_mention:
        tagged_repo = repo_mention.group(1).split("/")[-1]

    # Clean tagged entities, brackets, and markdown characters
    cleaned = re.sub(r"@[a-zA-Z0-9_\-\.\/]+", "", cleaned)
    cleaned = re.sub(r"\[.*?\]", "", cleaned)
    cleaned = re.sub(r"[`*#_\"']", "", cleaned)

    # Strip conversational prefixes
    prefix_pattern = (
        r"^(hey|hi|hello|please|could you please|can you please|help me|i want to|"
        r"i need to|tell me|explain to me|how do i|how to|what is|what are|where is|where can i)\s+"
    )
    cleaned = re.sub(prefix_pattern, "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s+", " ", cleaned).strip(" .,!?:;-")

    if tagged_repo and any(
        w in lower for w in ("audit", "check", "explore", "review", "analyze", "analyse")
    ):
        verb = "Audit" if "audit" in lower else "Explore"
        return f"{verb} {tagged_repo}"[:max_length]

    # If prompt became too short (e.g. user just said "hi" or punctuation)
    if not cleaned or len(cleaned) < 3:
        if repo_name:
            short_repo = repo_name.split("/")[-1]
            return f"Chat • {short_repo}"[:max_length]
        if req_title:
            return f"Chat • {req_title[:20]}"[:max_length]
        return "Codebase Chat"

    # Truncate nicely at word boundary
    if len(cleaned) > max_length:
        truncated = cleaned[:max_length]
        last_space = truncated.rfind(" ")
        if last_space > 20:
            cleaned = truncated[:last_space]
        else:
            cleaned = truncated

    cleaned = cleaned.rstrip(" .,!?:;-")
    return cleaned[0].upper() + cleaned[1:]
