import tiktoken

from app.ai.context.builder import MAX_CONTEXT_TOKENS, build_context


def test_build_context_truncates():
    # 1. Create a massive list of chunks
    chunks = [{"file_path": f"src/file_{i}.py", "chunk_text": "def test_fn():\n    pass\n" * 5} for i in range(20000)]
    
    # 2. Build context
    context_str = build_context(chunks)
    
    # 3. Assert tokens are bounded
    enc = tiktoken.get_encoding("cl100k_base")
    tokens = len(enc.encode(context_str))
    assert tokens <= MAX_CONTEXT_TOKENS
    
    # 4. Ensure no unclosed <file> tags
    open_tags = context_str.count("<file path=")
    close_tags = context_str.count("</file>")
    assert open_tags == close_tags
    assert open_tags > 0 # Ensure it actually added some tags
