"""Project type detection — language, framework, and key commands."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

try:
    import json
except ImportError:
    json = None  # type: ignore

try:
    import tomllib
except ImportError:
    try:
        import tomli as tomllib  # type: ignore
    except ImportError:
        tomllib = None  # type: ignore


@dataclass
class ProjectInfo:
    """Detected project metadata."""
    languages: list[str] = field(default_factory=list)
    frameworks: list[str] = field(default_factory=list)
    build_command: str | None = None
    test_command: str | None = None
    lint_command: str | None = None
    run_command: str | None = None
    package_manager: str | None = None
    python_version: str | None = None
    node_version: str | None = None
    description: str | None = None
    entry_points: list[str] = field(default_factory=list)
    ci_files: list[str] = field(default_factory=list)
    config_files: list[str] = field(default_factory=list)
    extra: dict[str, Any] = field(default_factory=dict)


# Map of config file -> detection function
_DETECTORS: list[tuple[str, type]] = []


def detect_project(root: Path) -> ProjectInfo:
    """Analyze config files at `root` and return project metadata."""
    root = Path(root).resolve()
    info = ProjectInfo()

    # Detect CI
    ci_patterns = [
        ".github/workflows", ".gitlab-ci.yml", ".circleci/config.yml",
        "Jenkinsfile", ".travis.yml", "azure-pipelines.yml",
    ]
    for pattern in ci_patterns:
        p = root / pattern
        if p.exists():
            if p.is_dir():
                for f in sorted(p.iterdir()):
                    info.ci_files.append(str(f.relative_to(root)))
            else:
                info.ci_files.append(pattern)

    # Detect project types (order matters — most specific first)
    _detect_python(root, info)
    _detect_node(root, info)
    _detect_rust(root, info)
    _detect_go(root, info)
    _detect_ruby(root, info)
    _detect_docker(root, info)

    # Collect notable config files
    config_names = [
        "Makefile", "Dockerfile", "docker-compose.yml", "docker-compose.yaml",
        ".env.example", ".editorconfig", ".prettierrc", ".eslintrc.js",
        ".eslintrc.json", "tsconfig.json", "tox.ini", "setup.cfg",
        "mypy.ini", ".flake8", "ruff.toml", ".ruff.toml",
    ]
    for name in config_names:
        if (root / name).exists():
            info.config_files.append(name)

    return info


def _read_json(path: Path) -> dict | None:
    try:
        return json.loads(path.read_text())
    except Exception:
        return None


def _read_toml(path: Path) -> dict | None:
    if tomllib is None:
        return None
    try:
        return tomllib.loads(path.read_text())
    except Exception:
        return None


def _detect_python(root: Path, info: ProjectInfo) -> None:
    pyproject = root / "pyproject.toml"
    setup_py = root / "setup.py"
    setup_cfg = root / "setup.cfg"
    requirements = root / "requirements.txt"
    pipfile = root / "Pipfile"

    has_python = any(p.exists() for p in [pyproject, setup_py, setup_cfg, requirements, pipfile])
    if not has_python:
        return

    info.languages.append("Python")
    info.config_files.append("pyproject.toml" if pyproject.exists() else
                              "setup.py" if setup_py.exists() else
                              "requirements.txt")

    # Try to read pyproject.toml
    if pyproject.exists():
        data = _read_toml(pyproject)
        if data:
            project = data.get("project", {})
            info.description = project.get("description")
            info.python_version = project.get("requires-python")

            # Detect package manager
            build_sys = data.get("build-system", {})
            requires = build_sys.get("requires", [])
            if any("poetry" in r for r in requires):
                info.package_manager = "poetry"
                info.build_command = "poetry build"
                info.run_command = "poetry run python"
            elif any("hatch" in r for r in requires):
                info.package_manager = "hatch"
                info.build_command = "hatch build"
            elif any("setuptools" in r for r in requires):
                info.package_manager = "pip"
                info.build_command = "pip install -e ."

            # Detect test framework
            tool = data.get("tool", {})
            if "pytest" in tool:
                info.test_command = "pytest"
            elif "tox" in tool:
                info.test_command = "tox"

            # Detect linter
            if "ruff" in tool:
                info.lint_command = "ruff check ."
            elif "flake8" in tool:
                info.lint_command = "flake8"
            elif "pylint" in tool:
                info.lint_command = "pylint"

            # Detect frameworks
            deps = project.get("dependencies", [])
            dep_str = " ".join(str(d) for d in deps)
            if "django" in dep_str.lower():
                info.frameworks.append("Django")
            if "flask" in dep_str.lower():
                info.frameworks.append("Flask")
            if "fastapi" in dep_str.lower():
                info.frameworks.append("FastAPI")

            # Entry points
            scripts = project.get("scripts", {})
            for name, target in scripts.items():
                info.entry_points.append(f"{name} -> {target}")

    elif pipfile.exists():
        info.package_manager = "pipenv"
        info.build_command = "pipenv install"

    # Fallback test detection
    if not info.test_command:
        if (root / "pytest.ini").exists() or (root / "conftest.py").exists():
            info.test_command = "pytest"
        elif (root / "tox.ini").exists():
            info.test_command = "tox"
        else:
            info.test_command = "pytest"  # reasonable default for Python

    # Fallback lint detection
    if not info.lint_command:
        if (root / "ruff.toml").exists() or (root / ".ruff.toml").exists():
            info.lint_command = "ruff check ."
        elif (root / ".flake8").exists():
            info.lint_command = "flake8"


def _detect_node(root: Path, info: ProjectInfo) -> None:
    package_json = root / "package.json"
    if not package_json.exists():
        return

    info.languages.append("JavaScript/TypeScript")
    info.config_files.append("package.json")

    data = _read_json(package_json)
    if not data:
        return

    info.description = info.description or data.get("description")

    # Package manager
    if (root / "pnpm-lock.yaml").exists():
        info.package_manager = "pnpm"
    elif (root / "yarn.lock").exists():
        info.package_manager = "yarn"
    elif (root / "bun.lockb").exists():
        info.package_manager = "bun"
    else:
        info.package_manager = info.package_manager or "npm"

    pm = info.package_manager
    scripts = data.get("scripts", {})

    if "build" in scripts:
        info.build_command = f"{pm} run build"
    if "test" in scripts:
        info.test_command = info.test_command or f"{pm} test"
    if "lint" in scripts:
        info.lint_command = info.lint_command or f"{pm} run lint"
    if "dev" in scripts:
        info.run_command = f"{pm} run dev"
    elif "start" in scripts:
        info.run_command = f"{pm} start"

    # Main/entry
    main = data.get("main")
    if main:
        info.entry_points.append(main)

    # Detect frameworks from dependencies
    all_deps = {**data.get("dependencies", {}), **data.get("devDependencies", {})}
    if "react" in all_deps:
        info.frameworks.append("React")
    if "next" in all_deps:
        info.frameworks.append("Next.js")
    if "vue" in all_deps:
        info.frameworks.append("Vue")
    if "nuxt" in all_deps:
        info.frameworks.append("Nuxt")
    if "express" in all_deps:
        info.frameworks.append("Express")
    if "svelte" in all_deps or "@sveltejs/kit" in all_deps:
        info.frameworks.append("Svelte")
    if "typescript" in all_deps:
        if "JavaScript/TypeScript" in info.languages:
            pass  # already noted
        info.config_files.append("tsconfig.json") if (root / "tsconfig.json").exists() else None

    if (root / "tsconfig.json").exists() and "tsconfig.json" not in info.config_files:
        info.config_files.append("tsconfig.json")


def _detect_rust(root: Path, info: ProjectInfo) -> None:
    cargo = root / "Cargo.toml"
    if not cargo.exists():
        return

    info.languages.append("Rust")
    info.config_files.append("Cargo.toml")
    info.package_manager = "cargo"
    info.build_command = "cargo build"
    info.test_command = info.test_command or "cargo test"
    info.lint_command = info.lint_command or "cargo clippy"
    info.run_command = "cargo run"

    data = _read_toml(cargo)
    if data:
        pkg = data.get("package", {})
        info.description = info.description or pkg.get("description")


def _detect_go(root: Path, info: ProjectInfo) -> None:
    go_mod = root / "go.mod"
    if not go_mod.exists():
        return

    info.languages.append("Go")
    info.config_files.append("go.mod")
    info.package_manager = "go"
    info.build_command = "go build ./..."
    info.test_command = info.test_command or "go test ./..."
    info.lint_command = info.lint_command or "golangci-lint run"
    info.run_command = "go run ."


def _detect_ruby(root: Path, info: ProjectInfo) -> None:
    gemfile = root / "Gemfile"
    if not gemfile.exists():
        return

    info.languages.append("Ruby")
    info.config_files.append("Gemfile")
    info.package_manager = "bundler"
    info.build_command = "bundle install"
    info.test_command = info.test_command or "bundle exec rspec"

    if (root / "config/application.rb").exists():
        info.frameworks.append("Rails")
        info.run_command = "rails server"


def _detect_docker(root: Path, info: ProjectInfo) -> None:
    if (root / "Dockerfile").exists():
        info.config_files.append("Dockerfile")
    if (root / "docker-compose.yml").exists() or (root / "docker-compose.yaml").exists():
        name = "docker-compose.yml" if (root / "docker-compose.yml").exists() else "docker-compose.yaml"
        if name not in info.config_files:
            info.config_files.append(name)
