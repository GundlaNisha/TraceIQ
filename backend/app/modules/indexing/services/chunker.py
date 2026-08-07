def chunk_file(source_text: str, symbols: list[dict]) -> list[dict]:
    """
    Splits source code into overlapping chunks. 
    Since sentence-transformers all-MiniLM-L6-v2 handles ~256 tokens well,
    we chunk by 50 lines (approx 300-400 words) with a 10-line overlap 
    so we don't accidentally cut context in half.
    """
    lines = source_text.split('\n')
    chunks = []
    
    chunk_size = 50
    overlap = 10
    
    start = 0
    while start < len(lines):
        end = min(start + chunk_size, len(lines))
        chunk_lines = lines[start:end]
        chunk_text = "\n".join(chunk_lines).strip()
        
        if chunk_text:
            chunks.append({
                "text": chunk_text,
                "line_start": start + 1,
                "line_end": end,
                "token_count": len(chunk_text.split())  # Fast rough word count estimate
            })
            
        if end == len(lines):
            break
            
        start += (chunk_size - overlap)
        
    return chunks
