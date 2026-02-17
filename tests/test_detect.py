"""Tests for project type detection."""

import json
import tempfile
from pathlib import Path

from cartographer.detect import detect_project


class TestPythonDetection:
    def test_detects_python_from_pyproject(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "pyproject.toml").write_text(
                '[project]\nname = "myapp"\ndescription = "A test app"\n'
                '[build-system]\nrequires = ["setuptools"]\n'
                '[tool.pytest]\n'
                '[tool.ruff]\n'
            )
            info = detect_project(root)
            assert "Python" in info.languages
            assert info.package_manager == "pip"
            assert info.test_command == "pytest"
            assert info.lint_command == "ruff check ."
            assert info.description == "A test app"

    def test_detects_python_from_requirements(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "requirements.txt").write_text("flask==2.0\n")
            info = detect_project(root)
            assert "Python" in info.languages

    def test_detects_poetry(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "pyproject.toml").write_text(
                '[build-system]\nrequires = ["poetry-core"]\n'
                '[project]\nname = "x"\n'
            )
            info = detect_project(root)
            assert info.package_manager == "poetry"

    def test_detects_django(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "pyproject.toml").write_text(
                '[project]\nname = "x"\ndependencies = ["django>=4.0"]\n'
                '[build-system]\nrequires = ["setuptools"]\n'
            )
            info = detect_project(root)
            assert "Django" in info.frameworks


class TestNodeDetection:
    def test_detects_node_project(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            pkg = {
                "name": "myapp",
                "description": "A node app",
                "scripts": {
                    "build": "tsc",
                    "test": "jest",
                    "lint": "eslint .",
                    "dev": "next dev",
                },
                "dependencies": {"react": "^18.0", "next": "^13.0"},
            }
            (root / "package.json").write_text(json.dumps(pkg))
            info = detect_project(root)
            assert "JavaScript/TypeScript" in info.languages
            assert info.build_command == "npm run build"
            assert info.test_command == "npm test"
            assert info.run_command == "npm run dev"
            assert "React" in info.frameworks
            assert "Next.js" in info.frameworks

    def test_detects_pnpm(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "package.json").write_text('{"name":"x","scripts":{"build":"tsc"}}')
            (root / "pnpm-lock.yaml").write_text("")
            info = detect_project(root)
            assert info.package_manager == "pnpm"
            assert info.build_command == "pnpm run build"

    def test_detects_yarn(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "package.json").write_text('{"name":"x"}')
            (root / "yarn.lock").write_text("")
            info = detect_project(root)
            assert info.package_manager == "yarn"


class TestRustDetection:
    def test_detects_rust(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "Cargo.toml").write_text(
                '[package]\nname = "myapp"\nversion = "0.1.0"\n'
                'description = "A rust app"\n'
            )
            info = detect_project(root)
            assert "Rust" in info.languages
            assert info.build_command == "cargo build"
            assert info.test_command == "cargo test"


class TestGoDetection:
    def test_detects_go(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "go.mod").write_text("module example.com/myapp\n\ngo 1.21\n")
            info = detect_project(root)
            assert "Go" in info.languages
            assert info.test_command == "go test ./..."


class TestCIDetection:
    def test_detects_github_actions(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            workflows = root / ".github" / "workflows"
            workflows.mkdir(parents=True)
            (workflows / "ci.yml").write_text("name: CI\n")
            info = detect_project(root)
            assert any("ci.yml" in f for f in info.ci_files)

    def test_detects_config_files(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "Makefile").write_text("all:\n\techo hi\n")
            (root / "Dockerfile").write_text("FROM python:3.11\n")
            info = detect_project(root)
            assert "Makefile" in info.config_files
            assert "Dockerfile" in info.config_files


class TestMultiLanguage:
    def test_detects_multiple_languages(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "pyproject.toml").write_text(
                '[project]\nname = "x"\n'
                '[build-system]\nrequires = ["setuptools"]\n'
            )
            (root / "package.json").write_text('{"name":"x"}')
            info = detect_project(root)
            assert "Python" in info.languages
            assert "JavaScript/TypeScript" in info.languages
