# Lattice

A reactive computation engine in Python. Define named cells with values or
formulas, and when you update a value, all downstream dependents automatically
recompute.

```python
from lattice import Notebook

nb = Notebook()
nb["price"] = 100
nb["tax_rate"] = 0.08
nb.formula("total", lambda ctx: ctx["price"] * (1 + ctx["tax_rate"]))

print(nb["total"])   # 108.0
nb["tax_rate"] = 0.10
print(nb["total"])   # 110.0
```

## Features

- **Reactive recomputation** — change a value and all formulas that depend on
  it recompute automatically
- **Automatic dependency tracking** — no need to declare deps; they're detected
  at runtime when your formula accesses other cells
- **Cycle detection** — raises `CycleError` if you create circular dependencies,
  with rollback so the graph stays consistent
- **Caching** — formula results are cached and only recomputed when dependencies
  change
- **Topological execution** — formulas evaluate in correct dependency order
- **Bulk updates** — update many values at once with a single recomputation pass
- **Serialization** — save/load notebooks to JSON
- **Zero dependencies** — pure Python, no external packages required

## Running tests

```
pip install pytest
pytest tests/ -v
```
