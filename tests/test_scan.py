"""Tests for the file scanner."""

import os
import tempfile
from pathlib import Path

from cartographer.scan import scan_tree, _should_skip_dir, _should_skip_file


class TestSkipRules:
    def test_skip_pycache(self):
        assert _should_skip_dir("__pycache__", [])

    def test_skip_node_modules(self):
        assert _should_skip_dir("node_modules", [])

    def test_skip_dotgit(self):
        assert _should_skip_dir(".git", [])

    def test_dont_skip_src(self):
        assert not _should_skip_dir("src", [])

    def test_skip_gitignore_pattern(self):
        assert _should_skip_dir("build", ["build/"])

    def test_skip_binary_extensions(self):
        assert _should_skip_file("image.png", [])
        assert _should_skip_file("archive.zip", [])
        assert _should_skip_file("lib.so", [])

    def test_dont_skip_source_files(self):
        assert not _should_skip_file("main.py", [])
        assert not _should_skip_file("index.js", [])
        assert not _should_skip_file("Cargo.toml", [])

    def test_skip_minified(self):
        assert _should_skip_file("bundle.min.js", [])
        assert _should_skip_file("styles.min.css", [])

    def test_gitignore_file_pattern(self):
        assert _should_skip_file("secret.env", ["*.env"])


class TestScanTree:
    def test_scan_simple_project(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "main.py").write_text("print('hello')\n")
            (root / "lib.py").write_text("x = 1\ny = 2\n")
            (root / "sub").mkdir()
            (root / "sub" / "util.py").write_text("def f(): pass\n")

            result = scan_tree(root)
            assert result.total_files == 3
            names = {f.relative for f in result.files}
            assert "main.py" in names
            assert "lib.py" in names
            assert os.path.join("sub", "util.py") in names

    def test_respects_gitignore(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / ".gitignore").write_text("*.log\nsecrets/\n")
            (root / "app.py").write_text("pass\n")
            (root / "debug.log").write_text("log data\n")
            (root / "secrets").mkdir()
            (root / "secrets" / "key.txt").write_text("secret\n")

            result = scan_tree(root)
            names = {f.relative for f in result.files}
            assert "app.py" in names
            assert "debug.log" not in names
            assert os.path.join("secrets", "key.txt") not in names

    def test_skips_pycache(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "app.py").write_text("pass\n")
            cache = root / "__pycache__"
            cache.mkdir()
            (cache / "app.cpython-311.pyc").write_text("bytes")

            result = scan_tree(root)
            names = {f.relative for f in result.files}
            assert "app.py" in names
            assert len(names) == 1

    def test_line_counting(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "code.py").write_text("a\nb\nc\nd\ne\n")

            result = scan_tree(root, count_lines=True)
            assert result.files[0].lines == 5

    def test_line_counting_disabled(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "code.py").write_text("a\nb\n")

            result = scan_tree(root, count_lines=False)
            assert result.files[0].lines is None

    def test_extensions_property(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "a.py").write_text("pass\n")
            (root / "b.py").write_text("pass\n")
            (root / "c.js").write_text("//\n")

            result = scan_tree(root)
            assert result.extensions[".py"] == 2
            assert result.extensions[".js"] == 1

    def test_max_files_limit(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for i in range(20):
                (root / f"file_{i}.py").write_text(f"x = {i}\n")

            result = scan_tree(root, max_files=5)
            assert result.total_files == 5

    def test_empty_directory(self):
        with tempfile.TemporaryDirectory() as tmp:
            result = scan_tree(Path(tmp))
            assert result.total_files == 0
            assert result.files == []
