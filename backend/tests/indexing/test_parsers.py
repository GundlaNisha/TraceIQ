from app.modules.indexing.services.chunker import chunk_file
from app.modules.indexing.services.parsers import (
    extract_imports,
    parse_file_symbols_and_imports,
)


def test_python_import_extraction():
    code = """
import os
import sys
from app.models.user import User
from ..utils.helpers import format_time
import numpy as np
"""
    imports = extract_imports("app/services/auth.py", code)
    assert "os" in imports
    assert "sys" in imports
    assert "app.models.user" in imports
    assert "..utils.helpers" in imports
    assert "numpy" in imports


def test_typescript_import_extraction():
    code = """
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
const utils = require("./utils/math");
const dynamicMod = import("../dynamic/loader");
"""
    imports = extract_imports("components/Header.tsx", code)
    assert "react" in imports
    assert "@/components/ui/button" in imports
    assert "./utils/math" in imports
    assert "../dynamic/loader" in imports


def test_symbols_and_imports_combined():
    py_code = """
class Calculator:
    def add(self, a, b):
        return a + b

def standalone_func():
    pass
"""
    symbols, imports = parse_file_symbols_and_imports("calc.py", py_code)
    symbol_names = [s["name"] for s in symbols]
    raw_names = [s["raw_name"] for s in symbols]
    assert "Calculator" in symbol_names
    assert "Calculator.add" in symbol_names or "add" in symbol_names
    assert "add" in raw_names
    assert "standalone_func" in symbol_names


def test_ast_aware_semantic_chunker():
    py_code = """
class DataPipeline:
    def process_records(self, items):
        total = 0
        for item in items:
            total += item.value
        return total

def run_pipeline():
    dp = DataPipeline()
    return dp.process_records([])
"""
    symbols, _ = parse_file_symbols_and_imports("pipeline.py", py_code)
    chunks = chunk_file(py_code, symbols, file_path="src/pipeline.py")

    assert len(chunks) >= 2
    # Verify contextual breadcrumbs are injected
    assert any("pipeline.py" in c["text"] for c in chunks)
    assert any("DataPipeline" in c["text"] for c in chunks)
    assert all("line_start" in c and "line_end" in c for c in chunks)
