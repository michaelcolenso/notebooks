"""Render analysis results as structured markdown."""

from __future__ import annotations

from cartographer.analyze import AnalysisResult, ClassDef, ModuleInfo
from cartographer.detect import ProjectInfo
from cartographer.scan import ScanResult


def render(
    scan: ScanResult,
    project: ProjectInfo,
    analysis: AnalysisResult,
) -> str:
    """Generate a structured markdown map of the project."""
    sections: list[str] = []

    # Header
    project_name = scan.root.name
    sections.append(f"# Project Map: {project_name}\n")

    # Overview
    sections.append(_render_overview(scan, project, analysis))

    # Commands
    cmd_section = _render_commands(project)
    if cmd_section:
        sections.append(cmd_section)

    # Directory structure
    sections.append(_render_tree(scan))

    # Language breakdown
    if analysis.language_breakdown:
        sections.append(_render_languages(analysis))

    # Key modules and architecture
    if analysis.modules:
        sections.append(_render_architecture(analysis))

    # Test structure
    if analysis.test_files:
        sections.append(_render_tests(analysis))

    # CI/CD
    if project.ci_files:
        sections.append(_render_ci(project))

    return "\n".join(sections)


def _render_overview(scan: ScanResult, project: ProjectInfo, analysis: AnalysisResult) -> str:
    lines = ["## Overview\n"]

    if project.description:
        lines.append(f"{project.description}\n")

    details = []
    if project.languages:
        details.append(f"**Languages:** {', '.join(project.languages)}")
    if project.frameworks:
        details.append(f"**Frameworks:** {', '.join(project.frameworks)}")
    if project.package_manager:
        details.append(f"**Package manager:** {project.package_manager}")
    details.append(f"**Files:** {scan.total_files}")
    details.append(f"**Lines of code:** {analysis.total_lines:,}")
    if project.entry_points:
        details.append(f"**Entry points:** {', '.join(project.entry_points)}")

    lines.extend(f"- {d}" for d in details)
    lines.append("")
    return "\n".join(lines)


def _render_commands(project: ProjectInfo) -> str | None:
    cmds = []
    if project.build_command:
        cmds.append(("Build", project.build_command))
    if project.test_command:
        cmds.append(("Test", project.test_command))
    if project.lint_command:
        cmds.append(("Lint", project.lint_command))
    if project.run_command:
        cmds.append(("Run", project.run_command))

    if not cmds:
        return None

    lines = ["## Commands\n"]
    lines.append("```")
    for label, cmd in cmds:
        lines.append(f"{label:6s} {cmd}")
    lines.append("```\n")
    return "\n".join(lines)


def _render_tree(scan: ScanResult) -> str:
    """Render a compact directory tree."""
    lines = ["## Directory Structure\n", "```"]

    files_by_dir = scan.files_by_dir()

    # Root files first
    root_files = files_by_dir.get("", [])
    for f in root_files:
        lines.append(f.relative)

    # Then directories
    seen_dirs: set[str] = set()
    for d in scan.dirs:
        if not d.relative or d.relative in seen_dirs:
            continue
        seen_dirs.add(d.relative)

        depth = d.relative.count("/")
        indent = "  " * depth
        dirname = d.relative.split("/")[-1]

        # Count total files recursively in this subtree
        child_files = files_by_dir.get(d.relative, [])
        sub_count = len(child_files)

        suffix = ""
        if sub_count > 0 and sub_count <= 8:
            # Show filenames inline for small directories
            fnames = [f.relative.split("/")[-1] for f in child_files]
            suffix = f"  ({', '.join(fnames)})"
        elif sub_count > 8:
            suffix = f"  ({sub_count} files)"

        lines.append(f"{indent}{dirname}/{suffix}")

    lines.append("```\n")
    return "\n".join(lines)


def _render_languages(analysis: AnalysisResult) -> str:
    lines = ["## Language Breakdown\n"]
    total = sum(analysis.language_breakdown.values())
    for lang, count in analysis.language_breakdown.items():
        pct = (count / total * 100) if total else 0
        bar_len = int(pct / 5)
        bar = "#" * bar_len
        lines.append(f"- {lang}: {count:,} lines ({pct:.0f}%) {bar}")
    lines.append("")
    return "\n".join(lines)


def _render_architecture(analysis: AnalysisResult) -> str:
    lines = ["## Architecture\n"]

    # Group modules by top-level package
    packages: dict[str, list[ModuleInfo]] = {}
    for mod in analysis.modules:
        if mod.path in ("setup.py", "conftest.py"):
            continue
        parts = mod.path.split("/")
        pkg = parts[0] if len(parts) > 1 else "(root)"
        packages.setdefault(pkg, []).append(mod)

    for pkg, modules in sorted(packages.items()):
        # Skip test packages in this section
        if pkg.lower() in ("tests", "test", "__tests__"):
            continue

        lines.append(f"### `{pkg}/`\n")

        for mod in sorted(modules, key=lambda m: m.path):
            fname = mod.path.split("/")[-1]
            desc_parts = []

            if mod.docstring:
                # First sentence of docstring
                first_sentence = mod.docstring.split(".")[0].strip()
                if first_sentence:
                    desc_parts.append(first_sentence)

            if mod.classes:
                class_names = [c.name for c in mod.classes]
                desc_parts.append(f"classes: {', '.join(class_names)}")

            if mod.functions:
                fn_names = [f.name for f in mod.functions if not f.name.startswith("_")]
                if fn_names:
                    desc_parts.append(f"functions: {', '.join(fn_names)}")

            if mod.exports:
                desc_parts.append(f"exports: {', '.join(mod.exports)}")

            desc = " — ".join(desc_parts) if desc_parts else f"{mod.lines} lines"
            lines.append(f"- **{fname}** — {desc}")

        lines.append("")

    # Key classes summary
    key_classes = [c for c in analysis.all_classes if not c.name.startswith("_")]
    if key_classes:
        lines.append("### Key Classes\n")
        for cls in key_classes[:15]:  # cap at 15
            base_str = f" (extends {', '.join(cls.bases)})" if cls.bases else ""
            method_count = len(cls.methods)
            doc = ""
            if cls.docstring:
                doc = f" — {cls.docstring.split(chr(10))[0].strip()}"
            lines.append(f"- `{cls.name}`{base_str} in `{cls.file}:{cls.line}`"
                         f" [{method_count} methods]{doc}")
        lines.append("")

    return "\n".join(lines)


def _render_tests(analysis: AnalysisResult) -> str:
    lines = ["## Tests\n"]
    lines.append(f"{len(analysis.test_files)} test files:\n")
    for tf in sorted(analysis.test_files)[:20]:
        lines.append(f"- `{tf}`")
    if len(analysis.test_files) > 20:
        lines.append(f"- ... and {len(analysis.test_files) - 20} more")
    lines.append("")
    return "\n".join(lines)


def _render_ci(project: ProjectInfo) -> str:
    lines = ["## CI/CD\n"]
    for ci in project.ci_files:
        lines.append(f"- `{ci}`")
    lines.append("")
    return "\n".join(lines)
