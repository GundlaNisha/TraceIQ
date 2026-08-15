import tiktoken

MAX_CONTEXT_TOKENS = 60_000
enc = tiktoken.get_encoding("cl100k_base")


def build_context(chunks: list[dict]) -> str:
    """
    Pack retrieved code chunks into XML tags within the token limit.
    Format: <file path="...">...code...</file>
    Truncates safely — never cuts inside an open XML tag.
    chunks: list of {file_path: str, chunk_text: str}
    """
    parts = []
    total = 0
    for chunk in chunks:
        # Default to snippet if chunk_text isn't provided (hybrid search compatibility)
        text = chunk.get("chunk_text", chunk.get("snippet", ""))
        block = f'<file path="{chunk["file_path"]}">\n{text}\n</file>'
        tokens = len(enc.encode(block))

        if total + tokens > MAX_CONTEXT_TOKENS:
            break

        parts.append(block)
        total += tokens

    return "\n\n".join(parts)
