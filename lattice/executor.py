"""Execution engine — evaluates cells respecting dependency order."""

from __future__ import annotations

from typing import Any

from lattice.cell import CellContext, FormulaCell, ValueCell
from lattice.graph import DependencyGraph


class Executor:
    """Evaluates formula cells with caching, invalidation, and dependency tracking."""

    def __init__(
        self,
        cells: dict[str, ValueCell | FormulaCell],
        graph: DependencyGraph,
    ) -> None:
        self._cells = cells
        self._graph = graph

    def get_value(self, name: str) -> Any:
        if name not in self._cells:
            raise KeyError(f"Cell '{name}' does not exist")

        cell = self._cells[name]

        if isinstance(cell, ValueCell):
            return cell.value

        if not cell.is_dirty:
            return cell.cached_value

        return self._evaluate(name, cell)

    def _evaluate(self, name: str, cell: FormulaCell) -> Any:
        accessed: list[str] = []

        def track(dep_name: str) -> None:
            accessed.append(dep_name)

        ctx = CellContext(getter=self.get_value, tracker=track)
        result = cell.compute(ctx)

        # Update the dependency graph with actually-accessed dependencies
        self._graph.set_dependencies(name, set(accessed))

        return result

    def invalidate(self, name: str) -> None:
        """Mark a cell and all its downstream dependents as dirty."""
        downstream = self._graph.get_all_downstream(name)
        for dep_name in downstream:
            cell = self._cells.get(dep_name)
            if isinstance(cell, FormulaCell):
                cell.invalidate()

    def evaluate_all_dirty(self) -> dict[str, Any]:
        """Evaluate all dirty formula cells in topological order. Returns computed values."""
        order = self._graph.topological_order()
        results: dict[str, Any] = {}

        for name in order:
            cell = self._cells.get(name)
            if isinstance(cell, FormulaCell) and cell.is_dirty:
                results[name] = self._evaluate(name, cell)

        return results
