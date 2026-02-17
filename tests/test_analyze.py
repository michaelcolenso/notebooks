"""Tests for the code analyzer."""

import tempfile
from pathlib import Path

from cartographer.analyze import analyze, _is_test_file, _is_doc_file
from cartographer.scan import scan_tree


class TestFileClassification:
    def test_python_test_files(self):
        assert _is_test_file("tests/test_main.py")
        assert _is_test_file("test_main.py")
        assert _is_test_file("main_test.py")

    def test_js_test_files(self):
        assert _is_test_file("Button.test.tsx")
        assert _is_test_file("utils.spec.js")
        assert _is_test_file("__tests__/Button.js")

    def test_non_test_files(self):
        assert not _is_test_file("main.py")
        assert not _is_test_file("src/app.js")

    def test_doc_files(self):
        assert _is_doc_file("README.md")
        assert _is_doc_file("CHANGELOG.md")
        assert _is_doc_file("docs/guide.md")

    def test_non_doc_files(self):
        assert not _is_doc_file("main.py")
        assert not _is_doc_file("src/readme_generator.py")


class TestPythonAnalysis:
    def test_extracts_classes_and_functions(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "app.py").write_text(
                '"""The main application."""\n\n'
                'class Server:\n'
                '    """A web server."""\n'
                '    def start(self): pass\n'
                '    def stop(self): pass\n\n'
                'def create_app(config):\n'
                '    """Create and configure the app."""\n'
                '    return Server()\n'
            )

            scan = scan_tree(root)
            result = analyze(scan)

            assert len(result.modules) == 1
            mod = result.modules[0]
            assert mod.docstring == "The main application."
            assert len(mod.classes) == 1
            assert mod.classes[0].name == "Server"
            assert "start" in mod.classes[0].methods
            assert "stop" in mod.classes[0].methods
            assert len(mod.functions) == 1
            assert mod.functions[0].name == "create_app"
            assert mod.functions[0].args == ["config"]

    def test_extracts_imports(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "app.py").write_text(
                'import os\n'
                'from pathlib import Path\n'
                'from typing import Any, Optional\n'
            )

            scan = scan_tree(root)
            result = analyze(scan)
            mod = result.modules[0]
            assert "os" in mod.imports
            assert "pathlib.Path" in mod.imports

    def test_extracts_all_exports(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "pkg.py").write_text(
                '__all__ = ["Foo", "bar"]\n'
                'class Foo: pass\n'
                'def bar(): pass\n'
            )

            scan = scan_tree(root)
            result = analyze(scan)
            mod = result.modules[0]
            assert mod.exports == ["Foo", "bar"]

    def test_handles_syntax_errors(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "bad.py").write_text("def broken(:\n  pass\n")

            scan = scan_tree(root)
            result = analyze(scan)
            # Should not crash, just skip the file
            assert len(result.modules) == 0

    def test_async_functions(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "handlers.py").write_text(
                'async def handle_request(req):\n'
                '    return "ok"\n'
            )

            scan = scan_tree(root)
            result = analyze(scan)
            mod = result.modules[0]
            assert mod.functions[0].is_async


class TestLanguageBreakdown:
    def test_counts_lines_by_language(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "app.py").write_text("a\nb\nc\n")  # 3 lines
            (root / "util.py").write_text("x\ny\n")   # 2 lines
            (root / "style.css").write_text("body {}\n")  # 1 line

            scan = scan_tree(root)
            result = analyze(scan)
            assert result.language_breakdown["Python"] == 5
            assert result.language_breakdown["CSS"] == 1
            assert result.total_lines == 6
