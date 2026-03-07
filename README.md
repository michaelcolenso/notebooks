# NOTEBOOKS

## Problem Intelligence System CLI

This repository now includes a lightweight tool for building a repeatable
"opportunity engine" to surface, cluster, validate, and pre-sell high-urgency,
recurring customer problems.

### File

- `problem_intelligence_tool.py`

### What it supports

1. **Problem thesis filters** (`list-filters`)
2. **5 listening channels** (`list-channels`)
3. **Problem capture template** (`add-problem`)
4. **Weekly clustering and prioritization** (`cluster-weekly`)
5. **Interview capture** (`add-interview`)
6. **Pre-sell + smallest useful version reminders** (`starter-pack`)
7. **Data export** (`export-json`)

### Practical skill for Codex

This repository now includes a reusable local skill at:

- `skills/problem-intelligence-operator/SKILL.md`

Use it when you want a repeatable workflow for initialization, capture, clustering,
and export. It also includes a deterministic demo script:

```bash
bash skills/problem-intelligence-operator/scripts/run_demo.sh
```

### Quick start

```bash
python problem_intelligence_tool.py init
python problem_intelligence_tool.py list-filters
python problem_intelligence_tool.py list-channels
```

### Capture a problem signal

```bash
python problem_intelligence_tool.py add-problem \
  --source-channel "Reddit: r/managers" \
  --user-quote "I avoid hard feedback because I don't want to demotivate people." \
  --context "First-time engineering manager during growth phase" \
  --workaround "Pushes feedback to annual review" \
  --consequence "Team standards decline and frustration rises" \
  --frequency "Weekly" \
  --willingness-to-pay-clue "Asked for paid coaching recommendations" \
  --cluster "difficult feedback" \
  --severity 4 \
  --urgency 5 \
  --tags management feedback
```

### Weekly prioritization

```bash
python problem_intelligence_tool.py cluster-weekly --min-volume 1
```

### Capture interviews

```bash
python problem_intelligence_tool.py add-interview \
  --persona "Seed-stage startup team lead" \
  --trigger "Two underperformers in one sprint" \
  --reaction "Avoided direct conversation" \
  --workaround "Added process docs and extra meetings" \
  --outcome "No behavior change after 3 weeks" \
  --failed-alternatives "Read generic management books" \
  --willingness-to-pay "$200 for scripts/templates that work"
```

### Export data

```bash
python problem_intelligence_tool.py export-json --out problem_intelligence_export.json
```
