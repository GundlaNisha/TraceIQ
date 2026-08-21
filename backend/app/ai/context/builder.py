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
        text = chunk.get("chunk_text", chunk.get("snippet", ""))
        block = f'<file path="{chunk["file_path"]}">\n{text}\n</file>'
        tokens = len(enc.encode(block))

        if total + tokens > MAX_CONTEXT_TOKENS:
            break

        parts.append(block)
        total += tokens

    return "\n\n".join(parts)


def build_graph_augmented_context(
    chunks: list[dict],
    dependencies: list[dict] | None = None,
) -> str:
    """
    Constructs Graph-Augmented RAG context containing:
    1. Structural code import graph edges (upstream imports & downstream callers)
    2. Code chunks for directly impacted seeds & 1-hop dependencies
    """
    sections = []

    if dependencies:
        dep_lines = [
            f"  {dep['source']} -> {dep['target']}" for dep in dependencies[:40]
        ]
        sections.append(
            "<code_dependency_graph>\n"
            + "\n".join(dep_lines)
            + "\n</code_dependency_graph>"
        )

    code_block = build_context(chunks)
    if code_block:
        sections.append(code_block)

    return "\n\n".join(sections)
