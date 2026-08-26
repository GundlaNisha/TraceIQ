import os
import re
from typing import Any

# Tree-sitter parsers for primary languages
try:
    import tree_sitter_python
    import tree_sitter_typescript
    from tree_sitter import Language, Parser

    PY_LANGUAGE = Language(tree_sitter_python.language())
    TS_LANGUAGE = Language(tree_sitter_typescript.language_typescript())
    TSX_LANGUAGE = Language(tree_sitter_typescript.language_tsx())
except Exception:
    PY_LANGUAGE = None
    TS_LANGUAGE = None
    TSX_LANGUAGE = None

# Regex patterns for fast, robust import & dependency extraction across multi-language enterprise codebases
RE_PY_IMPORT = re.compile(
    r"^(?:from\s+([a-zA-Z0-9_\.]+)\s+import|import\s+([a-zA-Z0-9_\.]+))",
    re.MULTILINE,
)
RE_JS_IMPORT = re.compile(
    r"""(?:import\s+(?:[\w\s{},*]+from\s+)?['"]([^'"]+)['"]|require\s*\(\s*['"]([^'"]+)['"]\s*\)|export\s+[\w\s{},*]+from\s+['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\))""",
    re.MULTILINE,
)
RE_GO_IMPORT = re.compile(
    r"""(?:import\s+['"]([^'"]+)['"]|import\s*\((.*?)\))""",
    re.DOTALL,
)
RE_RUST_IMPORT = re.compile(
    r"""(?:use\s+([a-zA-Z0-9_:]+)|mod\s+([a-zA-Z0-9_]+);)""",
    re.MULTILINE,
)
RE_JAVA_IMPORT = re.compile(
    r"""^import\s+(?:static\s+)?([a-zA-Z0-9_\.]+);""",
    re.MULTILINE,
)
RE_CPP_INCLUDE = re.compile(
    r"""^#\s*include\s*[<"]([^>"]+)[>"]""",
    re.MULTILINE,
)

# Multi-Language Symbol Extraction Fallback Regexes for Go, Rust, Java, C++, C#
RE_GO_SYMBOLS = re.compile(
    r"""^(?:func\s+(?:\([^)]+\)\s+)?([a-zA-Z0-9_]+)\s*\(|type\s+([a-zA-Z0-9_]+)\s+(?:struct|interface))""",
    re.MULTILINE,
)
RE_RUST_SYMBOLS = re.compile(
    r"""^(?:(?:pub(?:\([^)]+\))?\s+)?(?:fn|struct|enum|trait|type|impl(?:\s*<[^>]+>)?)\s+([a-zA-Z0-9_]+))""",
    re.MULTILINE,
)
RE_JAVA_SYMBOLS = re.compile(
    r"""(?:(?:public|protected|private|static|\s)+)?\s*(?:class|interface|enum|record)\s+([a-zA-Z0-9_]+)|(?:(?:public|protected|private|static|final|abstract|\s)+)\s+(?:[\w<>\[\],\s]+)\s+([a-zA-Z0-9_]+)\s*\([^)]*\)\s*[{;]""",
    re.MULTILINE,
)
RE_CPP_SYMBOLS = re.compile(
    r"""^(?:(?:class|struct|namespace)\s+([a-zA-Z0-9_]+)|(?:[\w:*&<>\s]+)\s+([a-zA-Z0-9_]+)\s*\([^)]*\)\s*(?:const)?\s*[{;])""",
    re.MULTILINE,
)
RE_SQL_SYMBOLS = re.compile(
    r"""CREATE\s+(?:OR\s+REPLACE\s+)?(?:TABLE|VIEW|FUNCTION|PROCEDURE|INDEX)\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_\"\.]+)""",
    re.IGNORECASE | re.MULTILINE,
)


def get_parser(extension: str) -> Parser | None:
    """Initializes Tree-sitter AST parser based on file extension."""
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


def extract_tree_sitter_symbols(
    node: Any,
    source_code: bytes,
    symbols: list[dict[str, Any]],
    parent_name: str | None = None,
) -> None:
    """Recursively walks Tree-sitter AST and extracts typed definitions."""
    valid_types = {
        "function_definition": "function",
        "class_definition": "class",
        "method_definition": "method",
        "function_declaration": "function",
        "class_declaration": "class",
        "interface_declaration": "interface",
        "type_alias_declaration": "type",
        "enum_declaration": "enum",
        "arrow_function": "arrow_function",
    }

    sym_type = valid_types.get(node.type)
    current_name = parent_name

    if sym_type:
        name_node = None
        # Locate identifier node for declaration
        for child in node.children:
            if child.type in ("identifier", "name", "property_identifier", "type_identifier"):
                name_node = child
                break

        # Check for variable declarations containing arrow functions: `export const MyComponent = () => ...`
        if not name_node and node.parent and node.parent.type in ("variable_declarator", "assignment_expression"):
            for sibling in node.parent.children:
                if sibling.type in ("identifier", "property_identifier"):
                    name_node = sibling
                    break

        if name_node:
            try:
                name = source_code[name_node.start_byte : name_node.end_byte].decode("utf8")
                qualified_name = f"{parent_name}.{name}" if parent_name else name
                current_name = name

                symbols.append(
                    {
                        "name": qualified_name,
                        "raw_name": name,
                        "type": sym_type,
                        "line_start": node.start_point[0] + 1,
                        "line_end": node.end_point[0] + 1,
                    }
                )
            except (UnicodeDecodeError, Exception):
                pass

    for child in node.children:
        extract_tree_sitter_symbols(child, source_code, symbols, current_name)


def extract_regex_symbols(extension: str, source_text: str) -> list[dict[str, Any]]:
    """Extracts symbols using pattern matching for languages without Tree-sitter parsers."""
    symbols: list[dict[str, Any]] = []
    lines = source_text.splitlines()

    def get_line_no(char_idx: int) -> int:
        return source_text[:char_idx].count("\n") + 1

    pattern = None
    default_type = "symbol"

    if extension == ".go":
        pattern = RE_GO_SYMBOLS
        default_type = "function"
    elif extension == ".rs":
        pattern = RE_RUST_SYMBOLS
        default_type = "struct_or_fn"
    elif extension in (".java", ".kt"):
        pattern = RE_JAVA_SYMBOLS
        default_type = "class_or_method"
    elif extension in (".c", ".cpp", ".cc", ".h", ".hpp", ".cs"):
        pattern = RE_CPP_SYMBOLS
        default_type = "declaration"
    elif extension == ".sql":
        pattern = RE_SQL_SYMBOLS
        default_type = "table_or_proc"

    if pattern:
        for match in pattern.finditer(source_text):
            name = next((g for g in match.groups() if g), None)
            if name:
                line_start = get_line_no(match.start())
                # Estimate line end (up to end of line or next 30 lines)
                line_end = min(len(lines), line_start + 15)
                symbols.append(
                    {
                        "name": name.strip(),
                        "raw_name": name.strip(),
                        "type": default_type,
                        "line_start": line_start,
                        "line_end": line_end,
                    }
                )

    return symbols


def extract_imports(file_path: str, source_text: str) -> list[str]:
    """Extracts imported modules, packages, and file paths across languages."""
    _, ext = os.path.splitext(file_path)
    ext = ext.lower()
    imports: set[str] = set()

    if ext == ".py":
        for match in RE_PY_IMPORT.finditer(source_text):
            module = match.group(1) or match.group(2)
            if module:
                imports.add(module.strip())

    elif ext in (".js", ".jsx", ".ts", ".tsx"):
        for match in RE_JS_IMPORT.finditer(source_text):
            target = match.group(1) or match.group(2) or match.group(3) or match.group(4)
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

    elif ext == ".rs":
        for match in RE_RUST_IMPORT.finditer(source_text):
            use_path = match.group(1) or match.group(2)
            if use_path:
                imports.add(use_path.strip())

    elif ext in (".java", ".kt"):
        for match in RE_JAVA_IMPORT.finditer(source_text):
            pkg = match.group(1)
            if pkg:
                imports.add(pkg.strip())

    elif ext in (".c", ".cpp", ".cc", ".h", ".hpp"):
        for match in RE_CPP_INCLUDE.finditer(source_text):
            inc = match.group(1)
            if inc:
                imports.add(inc.strip())

    return list(imports)


def parse_file(file_path: str, source_text: str) -> list[dict[str, Any]]:
    """Returns list of AST and regex-extracted symbols."""
    _, ext = os.path.splitext(file_path)
    ext = ext.lower()
    parser = get_parser(ext)

    if parser:
        try:
            source_bytes = source_text.encode("utf8")
            tree = parser.parse(source_bytes)
            symbols: list[dict[str, Any]] = []
            extract_tree_sitter_symbols(tree.root_node, source_bytes, symbols)
            if symbols:
                return symbols
        except Exception:
            pass

    # Fallback to regex symbol extraction
    return extract_regex_symbols(ext, source_text)


def parse_file_symbols_and_imports(
    file_path: str, source_text: str
) -> tuple[list[dict[str, Any]], list[str]]:
    """Fast combined AST symbol extraction and dependency extraction."""
    symbols = parse_file(file_path, source_text)
    imports = extract_imports(file_path, source_text)
    return symbols, imports
