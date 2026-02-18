"""Cell types for the reactive computation engine."""

from __future__ import annotations

import inspect
from dataclasses import dataclass, field
from typing import Any, Callable


@dataclass
class ValueCell:
    """A cell holding a plain value."""

    value: Any

    @property
    def is_formula(self) -> bool:
        return False


@dataclass
class FormulaCell:
    """A cell holding a formula (callable) and its cached result."""

    func: Callable
    cached_value: Any = field(default=None, repr=False)
    is_dirty: bool = field(default=True)
    _declared_deps: set[str] | None = field(default=None, repr=False)

    @property
    def is_formula(self) -> bool:
        return True

    @property
    def value(self) -> Any:
        return self.cached_value

    def invalidate(self) -> None:
        self.is_dirty = True

    def compute(self, ctx: CellContext) -> Any:
        result = self.func(ctx)
        self.cached_value = result
        self.is_dirty = False
        return result


class CellContext:
    """Read-only view passed to formula functions for accessing other cells."""

    def __init__(self, getter: Callable[[str], Any], tracker: Callable[[str], None]) -> None:
        self._getter = getter
        self._tracker = tracker

    def __getitem__(self, name: str) -> Any:
        self._tracker(name)
        return self._getter(name)

    def get(self, name: str, default: Any = None) -> Any:
        try:
            return self[name]
        except KeyError:
            return default


def extract_static_deps(func: Callable) -> set[str] | None:
    """Try to extract dependency names from a formula's source.

    Returns None if static analysis isn't possible.
    This is a best-effort optimization — runtime tracking is always the fallback.
    """
    try:
        source = inspect.getsource(func)
    except (OSError, TypeError):
        return None

    # Simple heuristic: find ctx["name"] patterns
    import re
    matches = re.findall(r'ctx\[["\'](\w+)["\']\]', source)
    return set(matches) if matches else None
