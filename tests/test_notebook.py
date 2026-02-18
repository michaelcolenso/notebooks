"""Tests for the Notebook — the main user-facing API."""

import pytest

from lattice import Notebook
from lattice.graph import CycleError


class TestNotebookBasics:
    def test_set_and_get_value(self):
        nb = Notebook()
        nb["x"] = 42
        assert nb["x"] == 42

    def test_update_value(self):
        nb = Notebook()
        nb["x"] = 1
        nb["x"] = 2
        assert nb["x"] == 2

    def test_contains(self):
        nb = Notebook()
        nb["x"] = 1
        assert "x" in nb
        assert "y" not in nb

    def test_len(self):
        nb = Notebook()
        assert len(nb) == 0
        nb["x"] = 1
        nb["y"] = 2
        assert len(nb) == 2

    def test_iter(self):
        nb = Notebook()
        nb["a"] = 1
        nb["b"] = 2
        assert set(nb) == {"a", "b"}

    def test_delete_cell(self):
        nb = Notebook()
        nb["x"] = 1
        del nb["x"]
        assert "x" not in nb

    def test_delete_nonexistent(self):
        nb = Notebook()
        with pytest.raises(KeyError):
            del nb["x"]

    def test_get_nonexistent(self):
        nb = Notebook()
        with pytest.raises(KeyError):
            _ = nb["x"]

    def test_repr(self):
        nb = Notebook()
        nb["x"] = 1
        r = repr(nb)
        assert "1 cells" in r
        assert "x" in r


class TestFormulas:
    def test_simple_formula(self):
        nb = Notebook()
        nb["x"] = 10
        nb["y"] = 20
        nb.formula("sum", lambda ctx: ctx["x"] + ctx["y"])
        assert nb["sum"] == 30

    def test_formula_recomputes_on_change(self):
        nb = Notebook()
        nb["x"] = 10
        nb.formula("double", lambda ctx: ctx["x"] * 2)
        assert nb["double"] == 20
        nb["x"] = 5
        assert nb["double"] == 10

    def test_chained_formulas(self):
        nb = Notebook()
        nb["x"] = 2
        nb.formula("y", lambda ctx: ctx["x"] + 1)
        nb.formula("z", lambda ctx: ctx["y"] * 3)
        assert nb["z"] == 9  # (2 + 1) * 3
        nb["x"] = 10
        assert nb["z"] == 33  # (10 + 1) * 3

    def test_formula_caching(self):
        call_count = 0

        nb = Notebook()
        nb["x"] = 1

        def tracked_formula(ctx):
            nonlocal call_count
            call_count += 1
            return ctx["x"] * 2

        nb.formula("y", tracked_formula)
        assert nb["y"] == 2
        assert call_count == 1

        # Access again without changing x — should use cache
        assert nb["y"] == 2
        assert call_count == 1

        # Change x — should recompute
        nb["x"] = 5
        assert nb["y"] == 10
        assert call_count == 2

    def test_multi_dependency(self):
        nb = Notebook()
        nb["a"] = 1
        nb["b"] = 2
        nb["c"] = 3
        nb.formula("sum", lambda ctx: ctx["a"] + ctx["b"] + ctx["c"])
        assert nb["sum"] == 6

        nb["b"] = 10
        assert nb["sum"] == 14

    def test_formula_with_conditionals(self):
        """Formulas that access different deps based on values."""
        nb = Notebook()
        nb["use_a"] = True
        nb["a"] = 10
        nb["b"] = 20
        nb.formula("result", lambda ctx: ctx["a"] if ctx["use_a"] else ctx["b"])

        assert nb["result"] == 10
        nb["use_a"] = False
        assert nb["result"] == 20

    def test_diamond_dependency(self):
        nb = Notebook()
        nb["x"] = 1
        nb.formula("a", lambda ctx: ctx["x"] + 1)
        nb.formula("b", lambda ctx: ctx["x"] * 2)
        nb.formula("c", lambda ctx: ctx["a"] + ctx["b"])

        assert nb["c"] == 4  # (1+1) + (1*2) = 4
        nb["x"] = 5
        assert nb["c"] == 16  # (5+1) + (5*2) = 16

    def test_overwrite_formula_with_value(self):
        nb = Notebook()
        nb["x"] = 1
        nb.formula("y", lambda ctx: ctx["x"] * 2)
        assert nb["y"] == 2

        nb["y"] = 99
        assert nb["y"] == 99

        # Changing x should no longer affect y
        nb["x"] = 100
        assert nb["y"] == 99


class TestCycleDetection:
    def test_direct_cycle(self):
        nb = Notebook()
        nb["a"] = 1
        nb.formula("b", lambda ctx: ctx["a"])
        _ = nb["b"]  # establish deps

        with pytest.raises(CycleError):
            nb.formula("a_cycle", lambda ctx: ctx["b"], deps={"b"})
            nb._graph.set_dependencies("a", {"a_cycle"})

    def test_self_referential(self):
        nb = Notebook()
        with pytest.raises(CycleError):
            nb.formula("x", lambda ctx: ctx["x"], deps={"x"})


class TestBulkUpdate:
    def test_bulk_update(self):
        nb = Notebook()
        nb["a"] = 0
        nb["b"] = 0
        nb.formula("sum", lambda ctx: ctx["a"] + ctx["b"])
        assert nb["sum"] == 0

        nb.bulk_update({"a": 10, "b": 20})
        assert nb["sum"] == 30

    def test_bulk_update_formula_raises(self):
        nb = Notebook()
        nb["x"] = 1
        nb.formula("y", lambda ctx: ctx["x"])
        with pytest.raises(TypeError):
            nb.bulk_update({"y": 99})


class TestDeleteWithDependents:
    def test_cannot_delete_cell_with_dependents(self):
        nb = Notebook()
        nb["x"] = 1
        nb.formula("y", lambda ctx: ctx["x"])
        _ = nb["y"]  # establish deps

        with pytest.raises(ValueError, match="depend on it"):
            del nb["x"]


class TestSnapshot:
    def test_snapshot(self):
        nb = Notebook()
        nb["x"] = 10
        nb["y"] = 20
        nb.formula("sum", lambda ctx: ctx["x"] + ctx["y"])

        snap = nb.snapshot()
        assert snap == {"x": 10, "y": 20, "sum": 30}


class TestCellInfo:
    def test_cells_method(self):
        nb = Notebook()
        nb["x"] = 1
        nb.formula("y", lambda ctx: ctx["x"])

        info = nb.cells()
        assert info == {"x": "value", "y": "formula"}

    def test_dependencies(self):
        nb = Notebook()
        nb["x"] = 1
        nb.formula("y", lambda ctx: ctx["x"])
        _ = nb["y"]  # trigger to establish deps

        assert nb.dependencies("y") == {"x"}
        assert nb.dependencies("x") == set()

    def test_dependents(self):
        nb = Notebook()
        nb["x"] = 1
        nb.formula("y", lambda ctx: ctx["x"])
        _ = nb["y"]

        assert nb.dependents("x") == {"y"}


class TestRename:
    def test_rename_value_cell(self):
        nb = Notebook()
        nb["old"] = 42
        nb.rename("old", "new")
        assert "old" not in nb
        assert nb["new"] == 42

    def test_rename_nonexistent(self):
        nb = Notebook()
        with pytest.raises(KeyError):
            nb.rename("nope", "new")

    def test_rename_to_existing(self):
        nb = Notebook()
        nb["a"] = 1
        nb["b"] = 2
        with pytest.raises(ValueError):
            nb.rename("a", "b")
