"""CLI entry point for Cartographer."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from cartographer.analyze import analyze
from cartographer.detect import detect_project
from cartographer.render import render
from cartographer.scan import scan_tree


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(
        prog="cartographer",
        description="Scan a codebase and generate a structured project map.",
    )
    parser.add_argument(
        "path",
        nargs="?",
        default=".",
        help="Path to the project root (default: current directory)",
    )
    parser.add_argument(
        "-o", "--output",
        help="Write output to a file instead of stdout",
    )
    parser.add_argument(
        "--no-line-count",
        action="store_true",
        help="Skip counting lines in files (faster for large repos)",
    )
    parser.add_argument(
        "--max-files",
        type=int,
        default=5000,
        help="Maximum number of files to scan (default: 5000)",
    )

    args = parser.parse_args(argv)
    root = Path(args.path).resolve()

    if not root.is_dir():
        print(f"Error: {root} is not a directory", file=sys.stderr)
        sys.exit(1)

    # Scan
    scan_result = scan_tree(
        root,
        count_lines=not args.no_line_count,
        max_files=args.max_files,
    )

    # Detect
    project_info = detect_project(root)

    # Analyze
    analysis_result = analyze(scan_result)

    # Render
    output = render(scan_result, project_info, analysis_result)

    if args.output:
        Path(args.output).write_text(output)
        print(f"Project map written to {args.output}", file=sys.stderr)
    else:
        print(output)


if __name__ == "__main__":
    main()
