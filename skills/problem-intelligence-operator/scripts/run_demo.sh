#!/usr/bin/env bash
set -euo pipefail

DB_PATH="demo_problem_intelligence.db"
EXPORT_PATH="demo_problem_intelligence_export.json"

rm -f "$DB_PATH" "$EXPORT_PATH"

python problem_intelligence_tool.py --db "$DB_PATH" init

python problem_intelligence_tool.py --db "$DB_PATH" add-problem \
  --source-channel "Reddit: r/managers" \
  --user-quote "I avoid hard feedback because I don't want to demotivate people." \
  --context "First-time engineering manager during growth" \
  --workaround "Pushes feedback to annual review" \
  --consequence "Standards decline and frustration rises" \
  --frequency "Weekly" \
  --willingness-to-pay-clue "Asked for coaching recommendations" \
  --cluster "difficult feedback" \
  --severity 4 \
  --urgency 5 \
  --tags management feedback

python problem_intelligence_tool.py --db "$DB_PATH" add-problem \
  --source-channel "LinkedIn comments on leadership posts" \
  --user-quote "I spend hours rewriting updates so leadership won't panic." \
  --context "New team lead in fast-moving startup" \
  --workaround "Over-edits status updates late at night" \
  --consequence "Slow communication and burnout" \
  --frequency "Weekly" \
  --willingness-to-pay-clue "Mentioned paying for communication templates" \
  --cluster "stakeholder communication" \
  --severity 4 \
  --urgency 4 \
  --tags communication leadership

python problem_intelligence_tool.py --db "$DB_PATH" add-interview \
  --persona "Seed-stage startup team lead" \
  --trigger "Two underperformers in one sprint" \
  --reaction "Avoided direct conversation" \
  --workaround "Added process docs and extra meetings" \
  --outcome "No behavior change after 3 weeks" \
  --failed-alternatives "Read generic management books" \
  --willingness-to-pay '$200 for scripts/templates that work' \
  --notes "Needs reusable language for difficult conversations"

python problem_intelligence_tool.py --db "$DB_PATH" cluster-weekly --min-volume 1
python problem_intelligence_tool.py --db "$DB_PATH" export-json --out "$EXPORT_PATH"

echo "Demo complete. DB: $DB_PATH | Export: $EXPORT_PATH"
