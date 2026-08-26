from typing import Any


def _estimate_tokens(text: str) -> int:
    """Fast, accurate token count estimation for code."""
    # Code generally averages ~1.2 to 1.3 tokens per whitespace-delimited word
    words = len(text.split())
    chars = len(text)
    return max(1, int(max(words * 1.3, chars / 4)))


def _chunk_text_by_paragraphs(
    text: str, file_path: str, max_lines: int = 50, overlap_lines: int = 10
) -> list[dict[str, Any]]:
    """Fallback chunker for flat files, markdown, SQL, or non-AST code."""
    lines = text.splitlines()
    if not lines:
        return []

    chunks: list[dict[str, Any]] = []
    start = 0
    total_lines = len(lines)

    while start < total_lines:
        end = min(start + max_lines, total_lines)
        chunk_lines = lines[start:end]
        raw_text = "\n".join(chunk_lines).strip()

        if raw_text:
            header = f"// File: {file_path} (Lines {start + 1}-{end})\n"
            enriched_text = header + raw_text

            chunks.append(
                {
                    "text": enriched_text,
                    "raw_text": raw_text,
                    "line_start": start + 1,
                    "line_end": end,
                    "token_count": _estimate_tokens(enriched_text),
                }
            )

        if end == total_lines:
            break
        start += max(1, max_lines - overlap_lines)

    return chunks


def chunk_file(
    source_text: str,
    symbols: list[dict[str, Any]] | None = None,
    file_path: str = "source_file",
    max_chunk_lines: int = 60,
    overlap_lines: int = 10,
) -> list[dict[str, Any]]:
    """Enterprise-Grade AST-Aware Semantic Code Chunker.

    1. Uses AST symbol coordinates (classes, methods, functions) to preserve intact code units.
    2. Injects hierarchical context breadcrumbs (e.g. `// Context: auth/service.ts > AuthService > login`)
       so vector representations retain their exact architectural location.
    3. Handles interstitial top-level code, imports, and non-AST languages gracefully.
    """
    if not source_text or not source_text.strip():
        return []

    lines = source_text.splitlines()
    total_lines = len(lines)

    # If no AST symbols are available or file is not code, use structured paragraph chunking
    if not symbols:
        return _chunk_text_by_paragraphs(
            source_text, file_path, max_lines=max_chunk_lines, overlap_lines=overlap_lines
        )

    # Sort symbols by their start lines
    sorted_symbols = sorted(symbols, key=lambda s: (s.get("line_start", 1), -s.get("line_end", 1)))

    chunks: list[dict[str, Any]] = []
    covered_lines = [False] * (total_lines + 1)

    # 1. Process AST Symbols (Functions, Classes, Methods)
    for sym in sorted_symbols:
        s_start = max(1, sym.get("line_start", 1))
        s_end = min(total_lines, sym.get("line_end", total_lines))
        sym_name = sym.get("name", "anonymous")
        sym_type = sym.get("type", "symbol")

        # Mark covered
        for line_no in range(s_start, s_end + 1):
            covered_lines[line_no] = True

        sym_lines = lines[s_start - 1 : s_end]
        raw_block = "\n".join(sym_lines).strip()
        if not raw_block:
            continue

        breadcrumb = f"// Context: {file_path} > {sym_type} {sym_name} (Lines {s_start}-{s_end})\n"

        # If symbol is within max chunk size, keep it intact as a high-fidelity unit
        if (s_end - s_start + 1) <= max_chunk_lines:
            enriched_text = breadcrumb + raw_block
            chunks.append(
                {
                    "text": enriched_text,
                    "raw_text": raw_block,
                    "line_start": s_start,
                    "line_end": s_end,
                    "token_count": _estimate_tokens(enriched_text),
                    "symbol_name": sym_name,
                    "symbol_type": sym_type,
                }
            )
        else:
            # Sub-chunk oversized symbols while maintaining breadcrumb context
            sub_start = s_start
            while sub_start <= s_end:
                sub_end = min(sub_start + max_chunk_lines - 1, s_end)
                sub_lines = lines[sub_start - 1 : sub_end]
                sub_text = "\n".join(sub_lines).strip()

                if sub_text:
                    sub_breadcrumb = (
                        f"// Context: {file_path} > {sym_type} {sym_name} (Part {sub_start}-{sub_end})\n"
                    )
                    enriched_sub = sub_breadcrumb + sub_text
                    chunks.append(
                        {
                            "text": enriched_sub,
                            "raw_text": sub_text,
                            "line_start": sub_start,
                            "line_end": sub_end,
                            "token_count": _estimate_tokens(enriched_sub),
                            "symbol_name": sym_name,
                            "symbol_type": sym_type,
                        }
                    )

                if sub_end >= s_end:
                    break
                sub_start += max(1, max_chunk_lines - overlap_lines)

    # 2. Capture Uncovered Interstitial Code (Imports, Module Vars, Scripts)
    curr_start = None
    for line_no in range(1, total_lines + 1):
        if not covered_lines[line_no]:
            if curr_start is None:
                curr_start = line_no
        else:
            if curr_start is not None:
                # We reached a covered region, chunk the gap
                gap_lines = lines[curr_start - 1 : line_no - 1]
                gap_text = "\n".join(gap_lines).strip()
                if gap_text and len(gap_text) > 10:
                    breadcrumb = f"// Context: {file_path} > module definitions (Lines {curr_start}-{line_no - 1})\n"
                    enriched_gap = breadcrumb + gap_text
                    chunks.append(
                        {
                            "text": enriched_gap,
                            "raw_text": gap_text,
                            "line_start": curr_start,
                            "line_end": line_no - 1,
                            "token_count": _estimate_tokens(enriched_gap),
                        }
                    )
                curr_start = None

    # Check trailing uncovered lines
    if curr_start is not None:
        gap_lines = lines[curr_start - 1 : total_lines]
        gap_text = "\n".join(gap_lines).strip()
        if gap_text and len(gap_text) > 10:
            breadcrumb = f"// Context: {file_path} > module declarations (Lines {curr_start}-{total_lines})\n"
            enriched_gap = breadcrumb + gap_text
            chunks.append(
                {
                    "text": enriched_gap,
                    "raw_text": gap_text,
                    "line_start": curr_start,
                    "line_end": total_lines,
                    "token_count": _estimate_tokens(enriched_gap),
                }
            )

    # If somehow no chunks were produced, fallback to standard paragraph chunking
    if not chunks:
        return _chunk_text_by_paragraphs(
            source_text, file_path, max_lines=max_chunk_lines, overlap_lines=overlap_lines
        )

    # Sort chunks by line start for clean chronological ordering
    chunks.sort(key=lambda c: c["line_start"])
    return chunks
