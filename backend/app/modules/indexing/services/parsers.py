import os
from typing import Any

# Initialize languages safely
import tree_sitter_python
import tree_sitter_typescript
from tree_sitter import Language, Parser

try:
    # Modern tree-sitter bindings (>= 0.22)
    PY_LANGUAGE = Language(tree_sitter_python.language())
    TS_LANGUAGE = Language(tree_sitter_typescript.language_typescript())
    TSX_LANGUAGE = Language(tree_sitter_typescript.language_tsx())
except Exception:
    # Older bindings fallback
    PY_LANGUAGE = Language(tree_sitter_python.language())
    TS_LANGUAGE = Language(tree_sitter_typescript.language_typescript())
    TSX_LANGUAGE = Language(tree_sitter_typescript.language_tsx())

def get_parser(extension: str) -> Parser | None:
    parser = Parser()
    if extension == ".py":
        parser.language = PY_LANGUAGE
    elif extension == ".ts":
        parser.language = TS_LANGUAGE
    elif extension == ".tsx":
        parser.language = TSX_LANGUAGE
    elif extension in (".js", ".jsx"):
        # Fallback to TS parser for JS since we didn't install tree-sitter-javascript
        parser.language = TSX_LANGUAGE if extension == ".jsx" else TS_LANGUAGE
    else:
        return None
    return parser

def extract_symbols(node, source_code: bytes, symbols: list, parent_type=None):
    valid_types = (
        "function_definition", "class_definition", "method_definition", 
        "function_declaration", "class_declaration", "method_declaration"
    )
    
    if node.type in valid_types:
        name_node = None
        for child in node.children:
            if child.type in ("identifier", "name", "property_identifier"):
                name_node = child
                break
        
        if name_node:
            try:
                name = source_code[name_node.start_byte:name_node.end_byte].decode('utf8')
                symbols.append({
                    "name": name,
                    "type": node.type,
                    "line_start": node.start_point[0] + 1,  # tree-sitter is 0-indexed
                    "line_end": node.end_point[0] + 1
                })
            except UnicodeDecodeError:
                pass
            
    for child in node.children:
        extract_symbols(child, source_code, symbols, node.type)

def parse_file(file_path: str, source_text: str) -> list[dict]:
    """Returns a list of symbols extracted from the AST."""
    _, ext = os.path.splitext(file_path)
    parser = get_parser(ext)
    if not parser:
        return []
    
    try:
        source_bytes = source_text.encode('utf8')
        tree = parser.parse(source_bytes)
        symbols: list[dict[str, Any]] = []
        extract_symbols(tree.root_node, source_bytes, symbols)
        return symbols
    except Exception:
        return []
