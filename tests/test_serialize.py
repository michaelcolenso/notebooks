"""Tests for serialization."""

import json
import tempfile
from pathlib import Path

from lattice import Notebook
from lattice.serialize import load, load_from_string, save, save_to_string


class TestSerializeRoundTrip:
    def test_value_cells_roundtrip(self):
        nb = Notebook()
        nb["x"] = 10
        nb["y"] = "hello"
        nb["z"] = [1, 2, 3]

        json_str = save_to_string(nb)
        nb2 = load_from_string(json_str)

        assert nb2["x"] == 10
        assert nb2["y"] == "hello"
        assert nb2["z"] == [1, 2, 3]

    def test_formula_cells_preserve_cached_value(self):
        nb = Notebook()
        nb["x"] = 5
        nb.formula("double", lambda ctx: ctx["x"] * 2)
        _ = nb["double"]  # compute and cache

        json_str = save_to_string(nb)
        nb2 = load_from_string(json_str)

        # Cached value should be preserved
        assert nb2["double"] == 10

    def test_file_roundtrip(self):
        nb = Notebook()
        nb["a"] = 1
        nb["b"] = 2

        with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as f:
            path = f.name

        save(nb, path)
        nb2 = load(path)

        assert nb2["a"] == 1
        assert nb2["b"] == 2

        Path(path).unlink()

    def test_serialized_format(self):
        nb = Notebook()
        nb["x"] = 42

        json_str = save_to_string(nb)
        data = json.loads(json_str)

        assert data["version"] == "1"
        assert len(data["cells"]) == 1
        assert data["cells"][0]["name"] == "x"
        assert data["cells"][0]["type"] == "value"
        assert data["cells"][0]["value"] == 42

    def test_empty_notebook(self):
        nb = Notebook()
        json_str = save_to_string(nb)
        nb2 = load_from_string(json_str)
        assert len(nb2) == 0
