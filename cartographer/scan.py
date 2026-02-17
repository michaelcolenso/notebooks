"""File tree scanner that respects .gitignore patterns."""

from __future__ import annotations

import fnmatch
import os
from dataclasses import dataclass, field
from pathlib import Path


# Directories to always skip, regardless of .gitignore
ALWAYS_SKIP = {
    ".git", "__pycache__", "node_modules", ".tox", ".mypy_cache",
    ".pytest_cache", ".ruff_cache", ".venv", "venv", "env",
    ".eggs", "*.egg-info", "dist", "build", ".next", ".nuxt",
    "target",  # Rust/Java
    "vendor",  # Go (debatable, but usually not interesting)
    ".terraform", ".cache", "coverage", ".coverage",
}

# Binary/uninteresting extensions to skip
SKIP_EXTENSIONS = {
    ".pyc", ".pyo", ".so", ".dylib", ".dll", ".exe", ".o", ".a",
    ".whl", ".egg", ".tar", ".gz", ".zip", ".jar",
    ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".webp",
    ".woff", ".woff2", ".ttf", ".eot",
    ".mp3", ".mp4", ".wav", ".avi", ".mov",
    ".pdf", ".doc", ".docx", ".xls", ".xlsx",
    ".db", ".sqlite", ".sqlite3",
    ".min.js", ".min.css",
    ".map",  # source maps
    ".lock",  # lock files are huge and uninteresting structurally
}


@dataclass
class FileInfo:
    """Metadata about a single file."""
    path: Path
    relative: str
    size: int
    extension: str
    lines: int | None = None


@dataclass
class DirInfo:
    """Metadata about a directory."""
    path: Path
    relative: str
    file_count: int = 0
    subdirs: list[str] = field(default_factory=list)


@dataclass
class ScanResult:
    """The result of scanning a project directory."""
    root: Path
    files: list[FileInfo] = field(default_factory=list)
    dirs: list[DirInfo] = field(default_factory=list)
    total_files: int = 0
    total_dirs: int = 0
    skipped_count: int = 0

    @property
    def extensions(self) -> dict[str, int]:
        """Count files by extension."""
        counts: dict[str, int] = {}
        for f in self.files:
            ext = f.extension or "(no ext)"
            counts[ext] = counts.get(ext, 0) + 1
        return dict(sorted(counts.items(), key=lambda x: -x[1]))

    def files_by_dir(self) -> dict[str, list[FileInfo]]:
        """Group files by their parent directory."""
        groups: dict[str, list[FileInfo]] = {}
        for f in self.files:
            parent = str(Path(f.relative).parent)
            if parent == ".":
                parent = ""
            groups.setdefault(parent, []).append(f)
        return groups


def _load_gitignore(root: Path) -> list[str]:
    """Load .gitignore patterns from the project root."""
    gitignore = root / ".gitignore"
    if not gitignore.exists():
        return []
    patterns = []
    for line in gitignore.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#"):
            patterns.append(line)
    return patterns


def _should_skip_dir(name: str, gitignore_patterns: list[str]) -> bool:
    """Check if a directory should be skipped."""
    if name in ALWAYS_SKIP:
        return True
    for pattern in ALWAYS_SKIP:
        if fnmatch.fnmatch(name, pattern):
            return True
    for pattern in gitignore_patterns:
        clean = pattern.rstrip("/")
        if fnmatch.fnmatch(name, clean):
            return True
    return False


def _should_skip_file(name: str, gitignore_patterns: list[str]) -> bool:
    """Check if a file should be skipped."""
    ext = Path(name).suffix.lower()
    if ext in SKIP_EXTENSIONS:
        return True
    # Check for .min.js / .min.css
    if name.endswith(".min.js") or name.endswith(".min.css"):
        return True
    for pattern in gitignore_patterns:
        if fnmatch.fnmatch(name, pattern):
            return True
    return False


def _count_lines(path: Path) -> int | None:
    """Count lines in a text file. Returns None if binary."""
    try:
        return len(path.read_text(errors="ignore").splitlines())
    except Exception:
        return None


def scan_tree(root: Path, count_lines: bool = True, max_files: int = 5000) -> ScanResult:
    """Walk a project directory and collect file metadata.

    Args:
        root: The project root directory.
        count_lines: Whether to count lines in each file (slower but useful).
        max_files: Stop scanning after this many files to avoid huge repos.
    """
    root = root.resolve()
    gitignore = _load_gitignore(root)
    result = ScanResult(root=root)
    file_count = 0

    for dirpath, dirnames, filenames in os.walk(root):
        rel_dir = os.path.relpath(dirpath, root)
        if rel_dir == ".":
            rel_dir = ""

        # Filter directories in-place to prevent os.walk from descending
        dirnames[:] = [
            d for d in sorted(dirnames)
            if not _should_skip_dir(d, gitignore)
        ]

        dir_info = DirInfo(
            path=Path(dirpath),
            relative=rel_dir,
            subdirs=list(dirnames),
        )

        dir_file_count = 0
        for fname in sorted(filenames):
            if _should_skip_file(fname, gitignore):
                result.skipped_count += 1
                continue

            fpath = Path(dirpath) / fname
            if not fpath.is_file():
                continue

            rel = os.path.relpath(fpath, root)
            stat = fpath.stat()

            lines = None
            if count_lines and stat.st_size < 500_000:  # skip huge files
                lines = _count_lines(fpath)

            fi = FileInfo(
                path=fpath,
                relative=rel,
                size=stat.st_size,
                extension=fpath.suffix.lower(),
                lines=lines,
            )
            result.files.append(fi)
            dir_file_count += 1
            file_count += 1

            if file_count >= max_files:
                break

        dir_info.file_count = dir_file_count
        result.dirs.append(dir_info)
        result.total_dirs += 1

        if file_count >= max_files:
            break

    result.total_files = file_count
    return result


def scan_project(root: str | Path) -> ScanResult:
    """Convenience wrapper for scan_tree."""
    return scan_tree(Path(root))
