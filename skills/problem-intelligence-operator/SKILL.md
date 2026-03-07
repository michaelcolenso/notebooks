---
name: problem-intelligence-operator
description: Use this skill when working with the Problem Intelligence System CLI in this repository, including initializing the SQLite database, capturing problem/interview signals, generating cluster reports, and exporting JSON snapshots for analysis.
---

# Problem Intelligence Operator

Use this skill to run the repository's `problem_intelligence_tool.py` in a repeatable way.

## When to use

- The user asks to run, validate, or demo the Problem Intelligence CLI.
- The user asks to seed sample records, cluster weekly signals, or export data.
- The user asks for a practical walkthrough of the end-to-end workflow.

## Workflow

1. Initialize database:
   - `python problem_intelligence_tool.py init`
2. Capture at least 2-3 problem signals with `add-problem`.
3. Optionally capture interviews with `add-interview`.
4. Run prioritization:
   - `python problem_intelligence_tool.py cluster-weekly --min-volume 1`
5. Export snapshot:
   - `python problem_intelligence_tool.py export-json --out <file>.json`

## Reusable script

For a deterministic end-to-end demo, run:

- `bash skills/problem-intelligence-operator/scripts/run_demo.sh`

The script creates a temporary database (`demo_problem_intelligence.db`), inserts sample records, prints a cluster report, and exports JSON (`demo_problem_intelligence_export.json`).

## Notes

- Prefer passing `--db <path>` when you do not want to modify the default `problem_intelligence.db`.
- Keep user-provided examples intact when reproducing issues; only use the demo script when synthetic data is acceptable.
