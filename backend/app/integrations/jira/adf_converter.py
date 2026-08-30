"""Atlassian Document Format (ADF) to Markdown and Plain Text Converter.

Jira Cloud REST API v3 returns issue descriptions in ADF JSON format.
This module recursively parses ADF nodes into clean, readable Markdown
compatible with GitHub Flavored Markdown (GFM).
"""

from __future__ import annotations

import re
from typing import Any


def adf_to_markdown(adf_content: Any) -> str:
    """Convert an ADF document (dict or list) or plain string to Markdown."""
    if not adf_content:
        return ""

    if isinstance(adf_content, str):
        # Plain text or Jira wiki markup fallback
        return _convert_jira_wiki_markup_to_markdown(adf_content)

    if not isinstance(adf_content, dict):
        return str(adf_content)

    # Standard ADF root is {"type": "doc", "version": 1, "content": [...]}
    content = adf_content.get("content", [])
    if not isinstance(content, list):
        return ""

    rendered_blocks: list[str] = []
    for node in content:
        block_text = _render_node(node)
        if block_text.strip():
            rendered_blocks.append(block_text.strip())

    return "\n\n".join(rendered_blocks).strip()


def _render_node(node: dict[str, Any], indent_level: int = 0) -> str:
    if not isinstance(node, dict):
        return ""

    node_type = node.get("type", "")
    content = node.get("content", [])
    attrs = node.get("attrs", {})

    if node_type == "paragraph":
        return _render_inline_content(content)

    elif node_type == "heading":
        level = min(max(attrs.get("level", 1), 1), 6)
        prefix = "#" * level
        text = _render_inline_content(content)
        return f"{prefix} {text}"

    elif node_type == "bulletList":
        items = []
        for item in content:
            item_text = _render_list_item(item, indent_level, is_ordered=False)
            if item_text:
                items.append(item_text)
        return "\n".join(items)

    elif node_type == "orderedList":
        items = []
        start_index = attrs.get("order", 1)
        for i, item in enumerate(content, start=start_index):
            item_text = _render_list_item(item, indent_level, is_ordered=True, index=i)
            if item_text:
                items.append(item_text)
        return "\n".join(items)

    elif node_type == "codeBlock":
        language = attrs.get("language", "") or ""
        code_text = "".join(child.get("text", "") for child in content if isinstance(child, dict))
        return f"```{language}\n{code_text}\n```"

    elif node_type == "blockquote":
        inner_lines = []
        for child in content:
            rendered = _render_node(child, indent_level)
            if rendered:
                for line in rendered.splitlines():
                    inner_lines.append(f"> {line}" if line.strip() else ">")
        return "\n".join(inner_lines)

    elif node_type == "rule":
        return "---"

    elif node_type == "panel":
        panel_type = attrs.get("panelType", "info").lower()
        title = ""
        if panel_type == "info":
            alert_tag = "> [!NOTE]"
        elif panel_type in ("warning", "caution"):
            alert_tag = "> [!WARNING]"
        elif panel_type == "error":
            alert_tag = "> [!CAUTION]"
        elif panel_type == "success":
            alert_tag = "> [!TIP]"
        else:
            alert_tag = ">"

        inner_texts = []
        for child in content:
            rendered = _render_node(child, indent_level)
            if rendered:
                for line in rendered.splitlines():
                    inner_texts.append(f"> {line}" if line.strip() else ">")
        
        body = "\n".join(inner_texts)
        if body:
            return f"{alert_tag}\n{body}"
        return alert_tag

    elif node_type == "table":
        return _render_table(content)

    elif node_type in ("mediaSingle", "mediaGroup"):
        return _render_media(content)

    elif node_type == "expand":
        title = attrs.get("title", "Details")
        inner_texts = [_render_node(c) for c in content]
        body = "\n\n".join(t for t in inner_texts if t.strip())
        return f"<details>\n<summary>{title}</summary>\n\n{body}\n</details>"

    # Fallback to inline children
    return _render_inline_content(content)


def _render_list_item(
    item_node: dict[str, Any],
    indent_level: int,
    is_ordered: bool = False,
    index: int = 1,
) -> str:
    if not isinstance(item_node, dict):
        return ""

    indent = "  " * indent_level
    bullet = f"{index}. " if is_ordered else "- "
    content = item_node.get("content", [])

    lines: list[str] = []
    for i, child in enumerate(content):
        child_type = child.get("type", "")
        if child_type in ("bulletList", "orderedList"):
            # Nested list
            nested = _render_node(child, indent_level + 1)
            if nested:
                lines.append(nested)
        else:
            rendered = _render_node(child, indent_level)
            if rendered:
                if i == 0:
                    lines.append(f"{indent}{bullet}{rendered}")
                else:
                    # Multi-paragraph in same list item
                    lines.append(f"{indent}  {rendered}")

    return "\n".join(lines)


def _render_inline_content(content: list[dict[str, Any]]) -> str:
    if not isinstance(content, list):
        return ""

    result: list[str] = []
    for node in content:
        if not isinstance(node, dict):
            continue

        node_type = node.get("type", "")

        if node_type == "text":
            text = node.get("text", "")
            marks = node.get("marks", [])
            result.append(_apply_marks(text, marks))

        elif node_type == "hardBreak":
            result.append("  \n")

        elif node_type == "mention":
            attrs = node.get("attrs", {})
            text = attrs.get("text") or attrs.get("displayName") or "@user"
            result.append(f"**{text}**")

        elif node_type == "emoji":
            attrs = node.get("attrs", {})
            short_name = attrs.get("shortName", "")
            fallback = attrs.get("text", "")
            result.append(fallback or short_name)

        elif node_type == "inlineCard":
            attrs = node.get("attrs", {})
            url = attrs.get("url", "")
            result.append(f"<{url}>" if url else "")

        elif node_type == "date":
            attrs = node.get("attrs", {})
            timestamp = attrs.get("timestamp", "")
            result.append(f"`{timestamp}`")

        elif node_type == "status":
            attrs = node.get("attrs", {})
            text = attrs.get("text", "")
            result.append(f"`[{text}]`" if text else "")

        else:
            # Check nested inline content
            if "content" in node:
                result.append(_render_inline_content(node["content"]))

    return "".join(result)


def _apply_marks(text: str, marks: list[dict[str, Any]]) -> str:
    if not marks or not text:
        return text

    for mark in marks:
        if not isinstance(mark, dict):
            continue
        mark_type = mark.get("type", "")
        attrs = mark.get("attrs", {})

        if mark_type == "strong":
            text = f"**{text}**"
        elif mark_type == "em":
            text = f"*{text}*"
        elif mark_type == "strike":
            text = f"~~{text}~~"
        elif mark_type == "code":
            text = f"`{text}`"
        elif mark_type == "link":
            href = attrs.get("href", "")
            title = attrs.get("title", "")
            if title:
                text = f'[{text}]({href} "{title}")'
            else:
                text = f"[{text}]({href})"
        elif mark_type == "underline":
            text = f"<u>{text}</u>"

    return text


def _render_table(content: list[dict[str, Any]]) -> str:
    if not content:
        return ""

    rows: list[list[str]] = []
    is_header_row = []

    for row_node in content:
        if row_node.get("type") != "tableRow":
            continue
        row_cells: list[str] = []
        is_header = False
        for cell_node in row_node.get("content", []):
            cell_type = cell_node.get("type", "")
            if cell_type == "tableHeader":
                is_header = True
            cell_content = cell_node.get("content", [])
            rendered_cell = " ".join(
                _render_node(c).replace("\n", " ").strip() for c in cell_content
            )
            # Escape pipes
            rendered_cell = rendered_cell.replace("|", "\\|")
            row_cells.append(rendered_cell.strip())
        if row_cells:
            rows.append(row_cells)
            is_header_row.append(is_header)

    if not rows:
        return ""

    max_cols = max(len(r) for r in rows)
    # Normalize rows
    for r in rows:
        while len(r) < max_cols:
            r.append("")

    output: list[str] = []
    # If first row is header or no header was specified
    first_row = rows[0]
    output.append("| " + " | ".join(first_row) + " |")
    output.append("| " + " | ".join(["---"] * max_cols) + " |")

    for r in rows[1:]:
        output.append("| " + " | ".join(r) + " |")

    return "\n".join(output)


def _render_media(content: list[dict[str, Any]]) -> str:
    items = []
    for item in content:
        attrs = item.get("attrs", {})
        alt = attrs.get("alt", "image")
        url = attrs.get("url", "")
        if url:
            items.append(f"![{alt}]({url})")
        else:
            items.append(f"[Media: {alt}]")
    return "\n".join(items)


def _convert_jira_wiki_markup_to_markdown(text: str) -> str:
    """Basic converter for legacy Jira wiki syntax (Jira Server / v2 format)."""
    if not text:
        return ""

    res = text
    # Ordered lists in Jira wiki markup: # item -> 1. item (do this before converting h1. -> #)
    res = re.sub(r"^#\s+(.+)$", r"1. \1", res, flags=re.MULTILINE)
    # Headings: h1. -> #, h2. -> ##, etc.
    res = re.sub(r"^h([1-6])\.\s*(.+)$", lambda m: f"{'#' * int(m.group(1))} {m.group(2)}", res, flags=re.MULTILINE)
    # Bold: *text* -> **text** (if not already markdown)
    res = re.sub(r"(?<!\*)\*([^\*\n]+)\*(?!\*)", r"**\1**", res)
    # Italic: _text_ -> *text*
    res = re.sub(r"(?<!_)\_([^_\n]+)\_(?!\_)", r"*\1*", res)
    # Strikethrough: -text- -> ~~text~~
    res = re.sub(r"(?<!\-)\-([^\-\n]+)\-(?!\-)", r"~~\1~~", res)
    # Code block: {code:python}...{code} or {code}...{code}
    res = re.sub(r"\{code(?::([a-zA-Z0-9_-]+))?\}([\s\S]*?)\{code\}", lambda m: f"```{m.group(1) or ''}\n{m.group(2).strip()}\n```", res)
    # Quotes: {quote}...{quote}
    res = re.sub(r"\{quote\}([\s\S]*?)\{quote\}", lambda m: "\n".join(f"> {l}" for l in m.group(1).strip().splitlines()), res)
    # Links: [title|url] or [url]
    res = re.sub(r"\[([^\|\]]+)\|([^\]]+)\]", r"[\1](\2)", res)
    res = re.sub(r"\[([a-zA-Z0-9+&@#/%?=~_|!:,.;-]+)\]", r"<\1>", res)

    return res.strip()

