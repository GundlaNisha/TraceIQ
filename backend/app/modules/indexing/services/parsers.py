import os
import re
from typing import Any

# Initialize languages safely
import tree_sitter_python
import tree_sitter_typescript
from tree_sitter import Language, Parser

try:
    PY_LANGUAGE = Language(tree_sitter_python.language())
    TS_LANGUAGE = Language(tree_sitter_typescript.language_typescript())
    TSX_LANGUAGE = Language(tree_sitter_typescript.language_tsx())
except Exception:
    PY_LANGUAGE = None
    TS_LANGUAGE = None
    TSX_LANGUAGE = None

# Regex patterns for fast import extraction across languages
RE_PY_IMPORT = re.compile(
    r"^(?:from\s+([a-zA-Z0-9_\.]+)\s+import|import\s+([a-zA-Z0-9_\.]+))", re.MULTILINE
)
RE_JS_IMPORT = re.compile(
    r"""(?:import\s+.*?from\s+['"]([^'"]+)['"]|require\s*\(\s*['"]([^'"]+)['"]\s*\)|import\s*\(\s*['"]([^'"]+)['"]\s*\))""",
    re.MULTILINE,
)
RE_GO_IMPORT = re.compile(
    r"""(?:import\s+['"]([^'"]+)['"]|import\s*\((.*?)\))""", re.DOTALL
)


def get_parser(extension: str) -> Parser | None:
    if extension == ".py" and PY_LANGUAGE:
        parser = Parser()
        parser.language = PY_LANGUAGE
        return parser
    elif extension == ".ts" and TS_LANGUAGE:
        parser = Parser()
        parser.language = TS_LANGUAGE
        return parser
    elif extension == ".tsx" and TSX_LANGUAGE:
        parser = Parser()
        parser.language = TSX_LANGUAGE
        return parser
    elif extension in (".js", ".jsx"):
        lang = TSX_LANGUAGE if extension == ".jsx" else TS_LANGUAGE
        if lang:
            parser = Parser()
            parser.language = lang
            return parser
    return None


def extract_symbols(node, source_code: bytes, symbols: list, parent_type=None):
    valid_types = (
        "function_definition",
        "class_definition",
        "method_definition",
        "function_declaration",
        "class_declaration",
        "method_declaration",
    )

    if node.type in valid_types:
        name_node = None
        for child in node.children:
            if child.type in ("identifier", "name", "property_identifier"):
                name_node = child
                break

        if name_node:
            try:
                name = source_code[name_node.start_byte : name_node.end_byte].decode(
                    "utf8"
                )
                symbols.append(
                    {
                        "name": name,
                        "type": node.type,
                        "line_start": node.start_point[0] + 1,
                        "line_end": node.end_point[0] + 1,
                    }
                )
            except UnicodeDecodeError:
                pass

    for child in node.children:
        extract_symbols(child, source_code, symbols, node.type)


def extract_imports(file_path: str, source_text: str) -> list[str]:
    """
    Extracts referenced target files / modules imported by this source file.
    Returns relative or module target paths.
    """
    _, ext = os.path.splitext(file_path)
    imports: set[str] = set()

    if ext == ".py":
        for match in RE_PY_IMPORT.finditer(source_text):
            module = match.group(1) or match.group(2)
            if module:
                imports.add(module.strip())
    elif ext in (".js", ".jsx", ".ts", ".tsx"):
        for match in RE_JS_IMPORT.finditer(source_text):
            target = match.group(1) or match.group(2) or match.group(3)
            if target and not target.startswith(("http://", "https://")):
                imports.add(target.strip())
    elif ext == ".go":
        for match in RE_GO_IMPORT.finditer(source_text):
            single = match.group(1)
            if single:
                imports.add(single.strip())
            multi = match.group(2)
            if multi:
                for line in multi.splitlines():
                    cleaned = line.strip().strip('"').strip("'")
                    if cleaned:
                        imports.add(cleaned)

    return list(imports)


def parse_file(file_path: str, source_text: str) -> list[dict]:
    """Returns a list of symbols extracted from the AST."""
    _, ext = os.path.splitext(file_path)
    parser = get_parser(ext)
    if not parser:
        return []

    try:
        source_bytes = source_text.encode("utf8")
        tree = parser.parse(source_bytes)
        symbols: list[dict[str, Any]] = []
        extract_symbols(tree.root_node, source_bytes, symbols)
        return symbols
    except Exception:
        return []


def parse_file_symbols_and_imports(
    file_path: str, source_text: str
) -> tuple[list[dict], list[str]]:
    """Fast combined AST symbol extraction and dependency extraction."""
    symbols = parse_file(file_path, source_text)
    imports = extract_imports(file_path, source_text)
    return symbols, imports
