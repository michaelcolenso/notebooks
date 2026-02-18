"""Serialization support — save and load notebooks to/from JSON."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from lattice.cell import FormulaCell, ValueCell
from lattice.notebook import Notebook


def save(notebook: Notebook, path: str | Path) -> None:
    """Save a notebook's value cells to a JSON file.

    Formula cells are stored as metadata (dependencies and last cached value)
    but their functions cannot be serialized. After loading, formulas must be
    re-registered.
    """
    data = _notebook_to_dict(notebook)
    path = Path(path)
    path.write_text(json.dumps(data, indent=2, default=str))


def save_to_string(notebook: Notebook) -> str:
    """Serialize a notebook to a JSON string."""
    data = _notebook_to_dict(notebook)
    return json.dumps(data, indent=2, default=str)


def load(path: str | Path) -> Notebook:
    """Load a notebook from a JSON file.

    Only value cells are fully restored. Formula cells are recorded as
    placeholders — call `notebook.formula()` to re-register them.
    """
    path = Path(path)
    data = json.loads(path.read_text())
    return _dict_to_notebook(data)


def load_from_string(s: str) -> Notebook:
    """Load a notebook from a JSON string."""
    data = json.loads(s)
    return _dict_to_notebook(data)


def _notebook_to_dict(notebook: Notebook) -> dict[str, Any]:
    cells_data: list[dict[str, Any]] = []

    for name in notebook:
        cell = notebook._cells[name]
        if isinstance(cell, ValueCell):
            cells_data.append({
                "name": name,
                "type": "value",
                "value": cell.value,
            })
        elif isinstance(cell, FormulaCell):
            cells_data.append({
                "name": name,
                "type": "formula",
                "cached_value": cell.cached_value,
                "dependencies": sorted(notebook.dependencies(name)),
            })

    return {
        "version": "1",
        "cells": cells_data,
    }


def _dict_to_notebook(data: dict[str, Any]) -> Notebook:
    nb = Notebook()

    # First pass: create value cells
    for cell_data in data["cells"]:
        if cell_data["type"] == "value":
            nb[cell_data["name"]] = cell_data["value"]

    # Second pass: record formula placeholders with cached values
    for cell_data in data["cells"]:
        if cell_data["type"] == "formula":
            name = cell_data["name"]
            cached = cell_data.get("cached_value")
            deps = set(cell_data.get("dependencies", []))

            # Create a placeholder formula that returns the cached value
            def make_placeholder(val: Any):
                return lambda ctx: val

            nb.formula(name, make_placeholder(cached), deps=deps)
            # Immediately compute to cache the value
            _ = nb[name]

    return nb
