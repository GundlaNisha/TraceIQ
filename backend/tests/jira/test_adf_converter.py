"""Unit tests for ADF to Markdown parser."""

from app.integrations.jira.adf_converter import adf_to_markdown


def test_empty_and_null_adf():
    assert adf_to_markdown(None) == ""
    assert adf_to_markdown("") == ""
    assert adf_to_markdown({}) == ""
    assert adf_to_markdown({"type": "doc", "content": []}) == ""


def test_plain_text_fallback():
    assert adf_to_markdown("Simple plain text description") == "Simple plain text description"


def test_wiki_markup_fallback():
    wiki_text = """h1. Requirement Header
*Bold Text* and _Italic Text_
-Strikethrough-
{code:python}
def foo():
    return True
{code}
[Jira Ticket|https://jira.com/PROJ-1]"""
    rendered = adf_to_markdown(wiki_text)
    assert "# Requirement Header" in rendered
    assert "**Bold Text**" in rendered
    assert "*Italic Text*" in rendered
    assert "~~Strikethrough~~" in rendered
    assert "```python\ndef foo():\n    return True\n```" in rendered
    assert "[Jira Ticket](https://jira.com/PROJ-1)" in rendered


def test_headings_and_paragraphs():
    adf = {
        "type": "doc",
        "version": 1,
        "content": [
            {
                "type": "heading",
                "attrs": {"level": 2},
                "content": [{"type": "text", "text": "Payment Service API"}],
            },
            {
                "type": "paragraph",
                "content": [
                    {"type": "text", "text": "This service handles "},
                    {"type": "text", "text": "idempotency keys", "marks": [{"type": "strong"}]},
                    {"type": "text", "text": " and "},
                    {
                        "type": "text",
                        "text": "Stripe charges",
                        "marks": [
                            {"type": "link", "attrs": {"href": "https://stripe.com/docs"}}
                        ],
                    },
                    {"type": "text", "text": "."},
                ],
            },
        ],
    }
    markdown = adf_to_markdown(adf)
    assert "## Payment Service API" in markdown
    assert "This service handles **idempotency keys** and [Stripe charges](https://stripe.com/docs)." in markdown


def test_code_blocks_and_quotes():
    adf = {
        "type": "doc",
        "version": 1,
        "content": [
            {
                "type": "codeBlock",
                "attrs": {"language": "typescript"},
                "content": [{"type": "text", "text": "const idempotencyKey = uuidv4();"}],
            },
            {
                "type": "blockquote",
                "content": [
                    {
                        "type": "paragraph",
                        "content": [{"type": "text", "text": "All charge requests must be signed."}],
                    }
                ],
            },
        ],
    }
    markdown = adf_to_markdown(adf)
    assert "```typescript\nconst idempotencyKey = uuidv4();\n```" in markdown
    assert "> All charge requests must be signed." in markdown


def test_bullet_and_ordered_lists():
    adf = {
        "type": "doc",
        "version": 1,
        "content": [
            {
                "type": "bulletList",
                "content": [
                    {
                        "type": "listItem",
                        "content": [
                            {
                                "type": "paragraph",
                                "content": [{"type": "text", "text": "Item A"}],
                            }
                        ],
                    },
                    {
                        "type": "listItem",
                        "content": [
                            {
                                "type": "paragraph",
                                "content": [{"type": "text", "text": "Item B"}],
                            }
                        ],
                    },
                ],
            },
            {
                "type": "orderedList",
                "attrs": {"order": 1},
                "content": [
                    {
                        "type": "listItem",
                        "content": [
                            {
                                "type": "paragraph",
                                "content": [{"type": "text", "text": "Step 1"}],
                            }
                        ],
                    },
                    {
                        "type": "listItem",
                        "content": [
                            {
                                "type": "paragraph",
                                "content": [{"type": "text", "text": "Step 2"}],
                            }
                        ],
                    },
                ],
            },
        ],
    }
    markdown = adf_to_markdown(adf)
    assert "- Item A\n- Item B" in markdown
    assert "1. Step 1\n2. Step 2" in markdown


def test_panels_and_tables():
    adf = {
        "type": "doc",
        "version": 1,
        "content": [
            {
                "type": "panel",
                "attrs": {"panelType": "info"},
                "content": [
                    {
                        "type": "paragraph",
                        "content": [{"type": "text", "text": "Production deployment notice"}],
                    }
                ],
            },
            {
                "type": "table",
                "content": [
                    {
                        "type": "tableRow",
                        "content": [
                            {
                                "type": "tableHeader",
                                "content": [
                                    {"type": "paragraph", "content": [{"type": "text", "text": "Key"}]}
                                ],
                            },
                            {
                                "type": "tableHeader",
                                "content": [
                                    {"type": "paragraph", "content": [{"type": "text", "text": "Value"}]}
                                ],
                            },
                        ],
                    },
                    {
                        "type": "tableRow",
                        "content": [
                            {
                                "type": "tableCell",
                                "content": [
                                    {"type": "paragraph", "content": [{"type": "text", "text": "AUTH_MODE"}]}
                                ],
                            },
                            {
                                "type": "tableCell",
                                "content": [
                                    {"type": "paragraph", "content": [{"type": "text", "text": "JWT_RS256"}]}
                                ],
                            },
                        ],
                    },
                ],
            },
        ],
    }
    markdown = adf_to_markdown(adf)
    assert "> [!NOTE]" in markdown
    assert "> Production deployment notice" in markdown
    assert "| Key | Value |" in markdown
    assert "| AUTH_MODE | JWT_RS256 |" in markdown
