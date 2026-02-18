"""Tests for cell types."""

from lattice.cell import CellContext, FormulaCell, ValueCell


class TestValueCell:
    def test_create(self):
        cell = ValueCell(value=42)
        assert cell.value == 42
        assert not cell.is_formula

    def test_update(self):
        cell = ValueCell(value=1)
        cell.value = 2
        assert cell.value == 2

    def test_various_types(self):
        assert ValueCell(value="hello").value == "hello"
        assert ValueCell(value=[1, 2, 3]).value == [1, 2, 3]
        assert ValueCell(value=None).value is None
        assert ValueCell(value={"a": 1}).value == {"a": 1}


class TestFormulaCell:
    def test_create(self):
        cell = FormulaCell(func=lambda ctx: 42)
        assert cell.is_formula
        assert cell.is_dirty

    def test_compute(self):
        values = {"x": 10}
        cell = FormulaCell(func=lambda ctx: ctx["x"] * 2)
        ctx = CellContext(
            getter=lambda name: values[name],
            tracker=lambda name: None,
        )
        result = cell.compute(ctx)
        assert result == 20
        assert cell.cached_value == 20
        assert not cell.is_dirty

    def test_invalidate(self):
        cell = FormulaCell(func=lambda ctx: 42)
        ctx = CellContext(getter=lambda n: None, tracker=lambda n: None)
        cell.compute(ctx)
        assert not cell.is_dirty
        cell.invalidate()
        assert cell.is_dirty


class TestCellContext:
    def test_getitem_tracks_dependency(self):
        tracked = []
        ctx = CellContext(
            getter=lambda name: {"x": 10, "y": 20}[name],
            tracker=lambda name: tracked.append(name),
        )
        assert ctx["x"] == 10
        assert ctx["y"] == 20
        assert tracked == ["x", "y"]

    def test_get_with_default(self):
        ctx = CellContext(
            getter=lambda name: (_ for _ in ()).throw(KeyError(name)),
            tracker=lambda name: None,
        )
        assert ctx.get("missing", 99) == 99

    def test_get_existing(self):
        tracked = []
        ctx = CellContext(
            getter=lambda name: 42,
            tracker=lambda name: tracked.append(name),
        )
        assert ctx.get("x") == 42
        assert tracked == ["x"]
