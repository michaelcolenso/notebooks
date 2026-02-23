#!/usr/bin/env python3
"""Problem Intelligence System CLI.

A lightweight repeatable opportunity engine for discovering, scoring,
validating, and pre-selling recurring customer problems.
"""

from __future__ import annotations

import argparse
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from textwrap import dedent
from typing import Iterable

DEFAULT_DB = Path("problem_intelligence.db")

THESIS_FILTERS = [
    "Audience can pay",
    "Problem recurs at least monthly",
    "Current solutions are fragmented/confusing",
    'Emotional urgency is high ("I feel stuck/overwhelmed/afraid")',
    "Outcome is measurable",
]

LISTENING_CHANNELS = [
    "Reddit communities (e.g., r/managers, r/startups, r/remotework)",
    "LinkedIn comments on leadership/management posts",
    "Slack/Discord communities for startup operators",
    'Job posts ("must manage distributed teams", "first manager hire")',
    "YouTube/podcast comments in the niche",
]


def get_conn(db_path: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


def init_db(conn: sqlite3.Connection) -> None:
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS thesis_filters (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filter_text TEXT NOT NULL UNIQUE
        );

        CREATE TABLE IF NOT EXISTS channels (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            cadence TEXT NOT NULL DEFAULT 'weekly'
        );

        CREATE TABLE IF NOT EXISTS problems (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            captured_at TEXT NOT NULL,
            source_channel TEXT NOT NULL,
            user_quote TEXT NOT NULL,
            context TEXT NOT NULL,
            workaround TEXT NOT NULL,
            consequence TEXT NOT NULL,
            frequency TEXT NOT NULL,
            willingness_to_pay_clue TEXT NOT NULL,
            cluster TEXT,
            severity INTEGER,
            urgency INTEGER,
            tags TEXT
        );

        CREATE TABLE IF NOT EXISTS interviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            interview_at TEXT NOT NULL,
            persona TEXT NOT NULL,
            trigger TEXT NOT NULL,
            reaction TEXT NOT NULL,
            workaround TEXT NOT NULL,
            outcome TEXT NOT NULL,
            failed_alternatives TEXT NOT NULL,
            willingness_to_pay TEXT NOT NULL,
            notes TEXT
        );
        """
    )

    conn.executemany(
        "INSERT OR IGNORE INTO thesis_filters(filter_text) VALUES(?)",
        [(f,) for f in THESIS_FILTERS],
    )
    conn.executemany(
        "INSERT OR IGNORE INTO channels(name) VALUES(?)",
        [(c,) for c in LISTENING_CHANNELS],
    )
    conn.commit()


def add_problem(conn: sqlite3.Connection, args: argparse.Namespace) -> None:
    conn.execute(
        """
        INSERT INTO problems(
            captured_at, source_channel, user_quote, context, workaround,
            consequence, frequency, willingness_to_pay_clue,
            cluster, severity, urgency, tags
        ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)
        """,
        (
            args.captured_at or datetime.now(timezone.utc).isoformat(timespec="seconds"),
            args.source_channel,
            args.user_quote,
            args.context,
            args.workaround,
            args.consequence,
            args.frequency,
            args.willingness_to_pay_clue,
            args.cluster,
            args.severity,
            args.urgency,
            ",".join(args.tags or []),
        ),
    )
    conn.commit()


def add_interview(conn: sqlite3.Connection, args: argparse.Namespace) -> None:
    conn.execute(
        """
        INSERT INTO interviews(
            interview_at, persona, trigger, reaction, workaround,
            outcome, failed_alternatives, willingness_to_pay, notes
        ) VALUES(?,?,?,?,?,?,?,?,?)
        """,
        (
            args.interview_at or datetime.now(timezone.utc).isoformat(timespec="seconds"),
            args.persona,
            args.trigger,
            args.reaction,
            args.workaround,
            args.outcome,
            args.failed_alternatives,
            args.willingness_to_pay,
            args.notes or "",
        ),
    )
    conn.commit()


def list_filters(conn: sqlite3.Connection) -> None:
    print("Problem thesis filters:")
    for row in conn.execute("SELECT filter_text FROM thesis_filters ORDER BY id"):
        print(f"- {row['filter_text']}")


def list_channels(conn: sqlite3.Connection) -> None:
    print("Listening channels:")
    for row in conn.execute("SELECT name, cadence FROM channels ORDER BY id"):
        print(f"- {row['name']} [{row['cadence']}]")


def weekly_cluster_report(conn: sqlite3.Connection, min_volume: int) -> None:
    query = """
        SELECT
            COALESCE(NULLIF(cluster, ''), '[unclustered]') AS problem_cluster,
            COUNT(*) AS volume,
            ROUND(AVG(COALESCE(severity, 0)), 2) AS avg_severity,
            ROUND(AVG(COALESCE(urgency, 0)), 2) AS avg_urgency
        FROM problems
        GROUP BY problem_cluster
        HAVING COUNT(*) >= ?
        ORDER BY volume DESC, avg_urgency DESC, avg_severity DESC
    """
    rows = list(conn.execute(query, (min_volume,)))
    if not rows:
        print("No clusters found. Capture more problems first.")
        return

    print("Weekly problem clusters")
    print("=" * 80)
    for i, row in enumerate(rows, start=1):
        score = row["avg_severity"] + row["avg_urgency"]
        print(
            f"{i}. {row['problem_cluster']} | volume={row['volume']} "
            f"severity={row['avg_severity']} urgency={row['avg_urgency']} priority_score={score}"
        )

    top = rows[:2]
    print("\nPrioritize next:")
    for row in top:
        print(f"- {row['problem_cluster']}")


def export_json(conn: sqlite3.Connection, out_file: Path) -> None:
    payload: dict[str, Iterable[dict]] = {}
    payload["thesis_filters"] = [dict(r) for r in conn.execute("SELECT * FROM thesis_filters")]
    payload["channels"] = [dict(r) for r in conn.execute("SELECT * FROM channels")]
    payload["problems"] = [dict(r) for r in conn.execute("SELECT * FROM problems ORDER BY captured_at DESC")]
    payload["interviews"] = [dict(r) for r in conn.execute("SELECT * FROM interviews ORDER BY interview_at DESC")]
    out_file.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Exported data to {out_file}")


def print_assets() -> None:
    print(
        dedent(
            """
            Smallest useful version starter pack
            ===================================
            Deliver first:
            - 5 core scripts
            - 3 agenda templates
            - 1 decision tree
            - 4-week email guide

            Instrument feedback loops:
            - Which sections people use most
            - Where they get stuck
            - New scenarios they request
            - Before/after confidence score
            """
        ).strip()
    )


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Problem Intelligence System")
    parser.add_argument("--db", type=Path, default=DEFAULT_DB, help="Path to sqlite database")

    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("init", help="Initialize database with thesis filters and listening channels")
    sub.add_parser("list-filters", help="List problem thesis filters")
    sub.add_parser("list-channels", help="List listening channels")

    add_problem_cmd = sub.add_parser("add-problem", help="Capture a problem signal")
    add_problem_cmd.add_argument("--captured-at")
    add_problem_cmd.add_argument("--source-channel", required=True)
    add_problem_cmd.add_argument("--user-quote", required=True)
    add_problem_cmd.add_argument("--context", required=True)
    add_problem_cmd.add_argument("--workaround", required=True)
    add_problem_cmd.add_argument("--consequence", required=True)
    add_problem_cmd.add_argument("--frequency", required=True)
    add_problem_cmd.add_argument("--willingness-to-pay-clue", required=True)
    add_problem_cmd.add_argument("--cluster")
    add_problem_cmd.add_argument("--severity", type=int, choices=[1, 2, 3, 4, 5])
    add_problem_cmd.add_argument("--urgency", type=int, choices=[1, 2, 3, 4, 5])
    add_problem_cmd.add_argument("--tags", nargs="*")

    cluster_cmd = sub.add_parser("cluster-weekly", help="Cluster problems and prioritize top 1-2")
    cluster_cmd.add_argument("--min-volume", type=int, default=1)

    interview_cmd = sub.add_parser("add-interview", help="Capture a 20-minute interview summary")
    interview_cmd.add_argument("--interview-at")
    interview_cmd.add_argument("--persona", required=True)
    interview_cmd.add_argument("--trigger", required=True)
    interview_cmd.add_argument("--reaction", required=True)
    interview_cmd.add_argument("--workaround", required=True)
    interview_cmd.add_argument("--outcome", required=True)
    interview_cmd.add_argument("--failed-alternatives", required=True)
    interview_cmd.add_argument("--willingness-to-pay", required=True)
    interview_cmd.add_argument("--notes")

    export_cmd = sub.add_parser("export-json", help="Export the full dataset to JSON")
    export_cmd.add_argument("--out", type=Path, required=True)

    sub.add_parser("starter-pack", help="Show smallest useful version and feedback loop checklist")

    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    conn = get_conn(args.db)

    if args.command == "init":
        init_db(conn)
        print(f"Initialized database at {args.db}")
    elif args.command == "list-filters":
        init_db(conn)
        list_filters(conn)
    elif args.command == "list-channels":
        init_db(conn)
        list_channels(conn)
    elif args.command == "add-problem":
        init_db(conn)
        add_problem(conn, args)
        print("Captured problem signal.")
    elif args.command == "cluster-weekly":
        init_db(conn)
        weekly_cluster_report(conn, args.min_volume)
    elif args.command == "add-interview":
        init_db(conn)
        add_interview(conn, args)
        print("Captured interview summary.")
    elif args.command == "export-json":
        init_db(conn)
        export_json(conn, args.out)
    elif args.command == "starter-pack":
        print_assets()


if __name__ == "__main__":
    main()
