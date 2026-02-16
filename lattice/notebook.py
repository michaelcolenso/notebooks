"""Notebook — the main user-facing API for the reactive computation engine."""

from __future__ import annotations

from typing import Any, Callable, Iterator

from lattice.cell import FormulaCell, ValueCell
from lattice.executor import Executor
from lattice.graph import CycleError, DependencyGraph


class Notebook:
    """A reactive computation notebook.

    Cells can hold plain values or formulas. Formulas automatically recompute
    when their dependencies change.

    Usage::

        nb = Notebook()
        nb["x"] = 10
        nb["y"] = 20
        nb.formula("sum", lambda ctx: ctx["x"] + ctx["y"])
        print(nb["sum"])  # 30
        nb["x"] = 5
        print(nb["sum"])  # 25
    """

    def __init__(self) -> None:
        self._cells: dict[str, ValueCell | FormulaCell] = {}
        self._graph = DependencyGraph()
        self._executor = Executor(self._cells, self._graph)

    def __setitem__(self, name: str, value: Any) -> None:
        """Set a value cell. If the cell was a formula, it becomes a plain value."""
        existing = self._cells.get(name)

        if isinstance(existing, FormulaCell):
            # Converting formula to value — clear its dependencies
            self._graph.set_dependencies(name, set())

        if isinstance(existing, ValueCell):
            existing.value = value
        else:
            self._cells[name] = ValueCell(value=value)
            self._graph.add_node(name)

        self._executor.invalidate(name)

    def __getitem__(self, name: str) -> Any:
        """Get the current value of a cell, computing if necessary."""
        return self._executor.get_value(name)

    def __delitem__(self, name: str) -> None:
        """Remove a cell from the notebook."""
        if name not in self._cells:
            raise KeyError(f"Cell '{name}' does not exist")

        dependents = self._graph.get_dependents(name)
        if dependents:
            raise ValueError(
                f"Cannot delete '{name}': other cells depend on it: {', '.join(sorted(dependents))}"
            )

        self._graph.remove_node(name)
        del self._cells[name]

    def __contains__(self, name: str) -> bool:
        return name in self._cells

    def __len__(self) -> int:
        return len(self._cells)

    def __iter__(self) -> Iterator[str]:
        return iter(self._cells)

    def formula(
        self,
        name: str,
        func: Callable,
        deps: set[str] | None = None,
    ) -> None:
        """Define a formula cell.

        Args:
            name: The cell name.
            func: A callable taking a CellContext and returning a value.
            deps: Optional explicit dependencies. If not provided, dependencies
                  are tracked at runtime automatically.
        """
        cell = FormulaCell(func=func, _declared_deps=deps)
        self._cells[name] = cell
        self._graph.add_node(name)

        if deps is not None:
            self._graph.set_dependencies(name, deps)

    def rename(self, old_name: str, new_name: str) -> None:
        """Rename a cell, updating all dependency references."""
        if old_name not in self._cells:
            raise KeyError(f"Cell '{old_name}' does not exist")
        if new_name in self._cells:
            raise ValueError(f"Cell '{new_name}' already exists")

        cell = self._cells.pop(old_name)
        self._cells[new_name] = cell

        # Rebuild graph edges
        deps = self._graph.get_dependencies(old_name)
        dependents = self._graph.get_dependents(old_name)
        self._graph.remove_node(old_name)
        self._graph.add_node(new_name)

        # Re-add edges with the new name
        self._graph.set_dependencies(new_name, deps)
        for dep in dependents:
            dep_deps = self._graph.get_dependencies(dep)
            dep_deps.discard(old_name)
            dep_deps.add(new_name)
            self._graph.set_dependencies(dep, dep_deps)

    def cells(self) -> dict[str, str]:
        """Return a dict of cell names to their types ('value' or 'formula')."""
        return {
            name: "formula" if isinstance(cell, FormulaCell) else "value"
            for name, cell in self._cells.items()
        }

    def dependencies(self, name: str) -> set[str]:
        """Return the set of cells that `name` depends on."""
        return self._graph.get_dependencies(name)

    def dependents(self, name: str) -> set[str]:
        """Return the set of cells that depend on `name`."""
        return self._graph.get_dependents(name)

    def bulk_update(self, values: dict[str, Any]) -> None:
        """Update multiple value cells at once, deferring recomputation."""
        for name, value in values.items():
            existing = self._cells.get(name)
            if isinstance(existing, FormulaCell):
                raise TypeError(f"Cannot bulk-update formula cell '{name}'")

            if isinstance(existing, ValueCell):
                existing.value = value
            else:
                self._cells[name] = ValueCell(value=value)
                self._graph.add_node(name)

        # Invalidate all downstream dependents
        for name in values:
            self._executor.invalidate(name)

    def snapshot(self) -> dict[str, Any]:
        """Return the current computed value of every cell."""
        return {name: self[name] for name in self._cells}

    def __repr__(self) -> str:
        cell_info = []
        for name, cell in self._cells.items():
            kind = "formula" if isinstance(cell, FormulaCell) else "value"
            cell_info.append(f"  {name}: {kind}")
        lines = "\n".join(cell_info)
        return f"Notebook({len(self._cells)} cells)\n{lines}"
