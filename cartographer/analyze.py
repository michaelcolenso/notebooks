"""Code structure analyzer — extract modules, key definitions, and architecture."""

from __future__ import annotations

import ast
import re
from dataclasses import dataclass, field
from pathlib import Path

from cartographer.scan import FileInfo, ScanResult


@dataclass
class FunctionDef:
    """A function or method definition."""
    name: str
    file: str
    line: int
    args: list[str]
    is_method: bool = False
    is_async: bool = False
    docstring: str | None = None


@dataclass
class ClassDef:
    """A class definition."""
    name: str
    file: str
    line: int
    bases: list[str]
    methods: list[str]
    docstring: str | None = None


@dataclass
class ModuleInfo:
    """Analysis of a single module/file."""
    path: str
    classes: list[ClassDef] = field(default_factory=list)
    functions: list[FunctionDef] = field(default_factory=list)
    imports: list[str] = field(default_factory=list)
    exports: list[str] = field(default_factory=list)  # __all__ or similar
    docstring: str | None = None
    lines: int = 0


@dataclass
class AnalysisResult:
    """Full structural analysis of a project."""
    modules: list[ModuleInfo] = field(default_factory=list)
    top_level_dirs: list[str] = field(default_factory=list)
    test_files: list[str] = field(default_factory=list)
    doc_files: list[str] = field(default_factory=list)
    total_lines: int = 0
    language_breakdown: dict[str, int] = field(default_factory=dict)

    @property
    def all_classes(self) -> list[ClassDef]:
        return [c for m in self.modules for c in m.classes]

    @property
    def all_functions(self) -> list[FunctionDef]:
        return [f for m in self.modules for f in m.functions
                if not f.is_method]


def analyze(scan: ScanResult) -> AnalysisResult:
    """Analyze scanned files to extract structural information."""
    result = AnalysisResult()
    lang_lines: dict[str, int] = {}

    # Identify top-level directories
    for d in scan.dirs:
        if d.relative and "/" not in d.relative and d.relative != "":
            result.top_level_dirs.append(d.relative)

    for fi in scan.files:
        lines = fi.lines or 0
        result.total_lines += lines

        # Classify files
        rel = fi.relative
        name_lower = rel.lower()

        if _is_test_file(rel):
            result.test_files.append(rel)
        if _is_doc_file(rel):
            result.doc_files.append(rel)

        # Language line counts
        lang = _ext_to_language(fi.extension)
        if lang:
            lang_lines[lang] = lang_lines.get(lang, 0) + lines

        # Deep analysis for Python files
        if fi.extension == ".py" and fi.size < 200_000:
            mod = _analyze_python(fi)
            if mod:
                result.modules.append(mod)

        # Light analysis for JS/TS
        elif fi.extension in (".js", ".ts", ".jsx", ".tsx") and fi.size < 200_000:
            mod = _analyze_js(fi)
            if mod:
                result.modules.append(mod)

    result.language_breakdown = dict(sorted(lang_lines.items(), key=lambda x: -x[1]))
    return result


def _is_test_file(path: str) -> bool:
    parts = path.lower().split("/")
    name = parts[-1]
    return (
        name.startswith("test_") or
        name.endswith("_test.py") or
        name.endswith(".test.js") or
        name.endswith(".test.ts") or
        name.endswith(".test.tsx") or
        name.endswith(".spec.js") or
        name.endswith(".spec.ts") or
        name.endswith(".spec.tsx") or
        "tests/" in path.lower() or
        "__tests__/" in path.lower() or
        "test/" in path.lower()
    )


def _is_doc_file(path: str) -> bool:
    name = path.lower().split("/")[-1]
    return name in (
        "readme.md", "readme.rst", "readme.txt", "readme",
        "changelog.md", "changelog.rst", "changes.md",
        "contributing.md", "contributing.rst",
        "architecture.md", "design.md",
    ) or path.lower().startswith("docs/")


_EXT_LANGUAGES = {
    ".py": "Python", ".pyi": "Python",
    ".js": "JavaScript", ".jsx": "JavaScript",
    ".ts": "TypeScript", ".tsx": "TypeScript",
    ".rs": "Rust",
    ".go": "Go",
    ".rb": "Ruby",
    ".java": "Java",
    ".kt": "Kotlin",
    ".swift": "Swift",
    ".c": "C", ".h": "C",
    ".cpp": "C++", ".cc": "C++", ".hpp": "C++",
    ".cs": "C#",
    ".php": "PHP",
    ".sh": "Shell", ".bash": "Shell", ".zsh": "Shell",
    ".sql": "SQL",
    ".html": "HTML", ".htm": "HTML",
    ".css": "CSS", ".scss": "SCSS", ".less": "Less",
    ".yaml": "YAML", ".yml": "YAML",
    ".json": "JSON",
    ".toml": "TOML",
    ".md": "Markdown", ".rst": "reStructuredText",
}


def _ext_to_language(ext: str) -> str | None:
    return _EXT_LANGUAGES.get(ext)


def _analyze_python(fi: FileInfo) -> ModuleInfo | None:
    """Parse a Python file with AST and extract structure."""
    try:
        source = fi.path.read_text(errors="ignore")
        tree = ast.parse(source)
    except (SyntaxError, ValueError, UnicodeDecodeError):
        return None

    mod = ModuleInfo(path=fi.relative, lines=fi.lines or 0)
    mod.docstring = ast.get_docstring(tree)

    for node in ast.iter_child_nodes(tree):
        if isinstance(node, ast.ClassDef):
            methods = [
                n.name for n in ast.walk(node)
                if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))
                and n is not node
            ]
            cd = ClassDef(
                name=node.name,
                file=fi.relative,
                line=node.lineno,
                bases=[_unparse_expr(b) for b in node.bases],
                methods=methods,
                docstring=ast.get_docstring(node),
            )
            mod.classes.append(cd)

        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            args = [a.arg for a in node.args.args if a.arg != "self"]
            fd = FunctionDef(
                name=node.name,
                file=fi.relative,
                line=node.lineno,
                args=args,
                is_async=isinstance(node, ast.AsyncFunctionDef),
                docstring=ast.get_docstring(node),
            )
            mod.functions.append(fd)

        elif isinstance(node, (ast.Import, ast.ImportFrom)):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    mod.imports.append(alias.name)
            else:
                module = node.module or ""
                for alias in node.names:
                    mod.imports.append(f"{module}.{alias.name}")

        elif isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id == "__all__":
                    if isinstance(node.value, (ast.List, ast.Tuple)):
                        for elt in node.value.elts:
                            if isinstance(elt, ast.Constant) and isinstance(elt.value, str):
                                mod.exports.append(elt.value)

    return mod


def _unparse_expr(node: ast.expr) -> str:
    """Convert an AST expression back to a string."""
    try:
        return ast.unparse(node)
    except Exception:
        return "?"


def _analyze_js(fi: FileInfo) -> ModuleInfo | None:
    """Light regex-based analysis for JavaScript/TypeScript files."""
    try:
        source = fi.path.read_text(errors="ignore")
    except Exception:
        return None

    mod = ModuleInfo(path=fi.relative, lines=fi.lines or 0)

    # Find exported functions
    for match in re.finditer(
        r'export\s+(?:default\s+)?(?:async\s+)?function\s+(\w+)',
        source
    ):
        mod.functions.append(FunctionDef(
            name=match.group(1),
            file=fi.relative,
            line=source[:match.start()].count("\n") + 1,
            args=[],
        ))

    # Find exported classes
    for match in re.finditer(
        r'export\s+(?:default\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?',
        source
    ):
        mod.classes.append(ClassDef(
            name=match.group(1),
            file=fi.relative,
            line=source[:match.start()].count("\n") + 1,
            bases=[match.group(2)] if match.group(2) else [],
            methods=[],
        ))

    # Find top-level const/function exports
    for match in re.finditer(
        r'export\s+(?:const|let|var)\s+(\w+)',
        source
    ):
        mod.exports.append(match.group(1))

    if not mod.functions and not mod.classes and not mod.exports:
        return None

    return mod
