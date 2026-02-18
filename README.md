# Cartographer

Scan a codebase and generate a structured project map — the kind of context
an AI coding assistant (or a new team member) needs to start working
effectively.

```
$ cartographer /path/to/project

# Project Map: myapp

## Overview
- Languages: Python
- Frameworks: FastAPI
- Package manager: pip
- Files: 47
- Lines of code: 3,212

## Commands
Build  pip install -e .
Test   pytest
Lint   ruff check .

## Directory Structure
...

## Architecture
### myapp/
- __init__.py — exports: create_app
- api.py — classes: Router — functions: health_check, get_users
- models.py — classes: User, Session
...
```

## What it detects

- **Languages:** Python, JavaScript/TypeScript, Rust, Go, Ruby
- **Frameworks:** Django, Flask, FastAPI, React, Next.js, Vue, Svelte, Express, Rails
- **Package managers:** pip, poetry, npm, yarn, pnpm, bun, cargo, bundler
- **Commands:** build, test, lint, run — extracted from pyproject.toml, package.json, Cargo.toml, etc.
- **CI/CD:** GitHub Actions, GitLab CI, CircleCI, Travis, Jenkins
- **Code structure:** classes, functions, exports, imports, docstrings (via Python AST and JS regex)
- **File organization:** directory tree, language breakdown by lines, test files, doc files

## Usage

```
# Scan current directory
cartographer

# Scan a specific project
cartographer /path/to/project

# Write to file
cartographer -o PROJECT_MAP.md

# Skip line counting (faster for large repos)
cartographer --no-line-count

# Limit file count for huge repos
cartographer --max-files 2000
```

## Why this exists

Every time an AI assistant starts working in a new repo, it spends dozens of
tool calls just figuring out the basics: what language, what framework, how to
test, what the key modules are. Cartographer does that in one pass and produces
a structured document that can be fed straight into context.

## Running tests

```
pip install pytest
pytest tests/ -v
```
