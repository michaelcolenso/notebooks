"""Tests for the markdown renderer."""

import tempfile
from pathlib import Path

from cartographer.analyze import analyze
from cartographer.detect import detect_project
from cartographer.render import render
from cartographer.scan import scan_tree


class TestRender:
    def _render_project(self, root: Path) -> str:
        scan = scan_tree(root)
        project = detect_project(root)
        analysis = analyze(scan)
        return render(scan, project, analysis)

    def test_includes_project_name(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "main.py").write_text("pass\n")
            output = self._render_project(root)
            assert "# Project Map:" in output

    def test_includes_directory_structure(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "main.py").write_text("pass\n")
            (root / "src").mkdir()
            (root / "src" / "app.py").write_text("pass\n")
            output = self._render_project(root)
            assert "## Directory Structure" in output
            assert "src/" in output

    def test_includes_commands_for_python(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "pyproject.toml").write_text(
                '[project]\nname = "x"\n'
                '[build-system]\nrequires = ["setuptools"]\n'
                '[tool.pytest]\n'
            )
            (root / "main.py").write_text("pass\n")
            output = self._render_project(root)
            assert "## Commands" in output
            assert "pytest" in output

    def test_includes_language_breakdown(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "app.py").write_text("x = 1\n")
            output = self._render_project(root)
            assert "## Language Breakdown" in output
            assert "Python" in output

    def test_includes_architecture_for_packages(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            pkg = root / "mylib"
            pkg.mkdir()
            (pkg / "__init__.py").write_text('"""My library."""\n')
            (pkg / "core.py").write_text(
                '"""Core module."""\n'
                'class Engine:\n'
                '    """The main engine."""\n'
                '    def run(self): pass\n'
            )
            output = self._render_project(root)
            assert "## Architecture" in output
            assert "Engine" in output

    def test_empty_project(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            output = self._render_project(root)
            # Should still produce valid output
            assert "# Project Map:" in output
            assert "**Files:** 0" in output
