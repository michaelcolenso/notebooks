"""Tests for the dependency graph engine."""

import pytest

from lattice.graph import CycleError, DependencyGraph


class TestDependencyGraph:
    def test_add_node(self):
        g = DependencyGraph()
        g.add_node("a")
        assert "a" in g

    def test_node_not_in_graph(self):
        g = DependencyGraph()
        assert "a" not in g

    def test_remove_node(self):
        g = DependencyGraph()
        g.add_node("a")
        g.remove_node("a")
        assert "a" not in g

    def test_set_dependencies(self):
        g = DependencyGraph()
        g.add_node("a")
        g.add_node("b")
        g.set_dependencies("b", {"a"})
        assert g.get_dependencies("b") == {"a"}
        assert g.get_dependents("a") == {"b"}

    def test_replace_dependencies(self):
        g = DependencyGraph()
        g.add_node("a")
        g.add_node("b")
        g.add_node("c")
        g.set_dependencies("c", {"a"})
        g.set_dependencies("c", {"b"})
        assert g.get_dependencies("c") == {"b"}
        assert g.get_dependents("a") == set()
        assert g.get_dependents("b") == {"c"}

    def test_cycle_detection_direct(self):
        g = DependencyGraph()
        g.add_node("a")
        g.add_node("b")
        g.set_dependencies("b", {"a"})
        with pytest.raises(CycleError) as exc_info:
            g.set_dependencies("a", {"b"})
        assert "a" in exc_info.value.cycle
        assert "b" in exc_info.value.cycle

    def test_cycle_detection_indirect(self):
        g = DependencyGraph()
        for name in "abc":
            g.add_node(name)
        g.set_dependencies("b", {"a"})
        g.set_dependencies("c", {"b"})
        with pytest.raises(CycleError):
            g.set_dependencies("a", {"c"})

    def test_cycle_detection_self(self):
        g = DependencyGraph()
        g.add_node("a")
        with pytest.raises(CycleError):
            g.set_dependencies("a", {"a"})

    def test_cycle_rollback(self):
        """After a failed cycle, the graph should be unchanged."""
        g = DependencyGraph()
        g.add_node("a")
        g.add_node("b")
        g.set_dependencies("b", {"a"})

        with pytest.raises(CycleError):
            g.set_dependencies("a", {"b"})

        # Original state should be preserved
        assert g.get_dependencies("a") == set()
        assert g.get_dependencies("b") == {"a"}

    def test_topological_order(self):
        g = DependencyGraph()
        for name in "abcd":
            g.add_node(name)
        g.set_dependencies("b", {"a"})
        g.set_dependencies("c", {"a"})
        g.set_dependencies("d", {"b", "c"})

        order = g.topological_order()
        assert order.index("a") < order.index("b")
        assert order.index("a") < order.index("c")
        assert order.index("b") < order.index("d")
        assert order.index("c") < order.index("d")

    def test_get_all_downstream(self):
        g = DependencyGraph()
        for name in "abcde":
            g.add_node(name)
        g.set_dependencies("b", {"a"})
        g.set_dependencies("c", {"b"})
        g.set_dependencies("d", {"c"})
        # e is independent

        downstream = g.get_all_downstream("a")
        assert "b" in downstream
        assert "c" in downstream
        assert "d" in downstream
        assert "e" not in downstream
        assert "a" not in downstream

        # Order should be topological
        assert downstream.index("b") < downstream.index("c")
        assert downstream.index("c") < downstream.index("d")

    def test_remove_node_clears_edges(self):
        g = DependencyGraph()
        g.add_node("a")
        g.add_node("b")
        g.add_node("c")
        g.set_dependencies("b", {"a"})
        g.set_dependencies("c", {"b"})

        g.remove_node("b")
        assert g.get_dependents("a") == set()
        assert g.get_dependencies("c") == set()

    def test_diamond_dependency(self):
        """a -> b, a -> c, b -> d, c -> d (diamond shape)."""
        g = DependencyGraph()
        for name in "abcd":
            g.add_node(name)
        g.set_dependencies("b", {"a"})
        g.set_dependencies("c", {"a"})
        g.set_dependencies("d", {"b", "c"})

        downstream = g.get_all_downstream("a")
        assert set(downstream) == {"b", "c", "d"}
        assert downstream.index("b") < downstream.index("d")
        assert downstream.index("c") < downstream.index("d")
