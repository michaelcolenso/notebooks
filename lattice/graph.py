"""Dependency graph with topological sorting and cycle detection."""

from __future__ import annotations

from collections import deque


class CycleError(Exception):
    """Raised when a dependency cycle is detected."""

    def __init__(self, cycle: list[str]) -> None:
        self.cycle = cycle
        path = " -> ".join(cycle)
        super().__init__(f"Dependency cycle detected: {path}")


class DependencyGraph:
    """Directed acyclic graph tracking cell dependencies.

    Edges go from dependency to dependent:
      if B depends on A, the edge is A -> B.
    """

    def __init__(self) -> None:
        # node -> set of nodes that depend on it (forward edges)
        self._dependents: dict[str, set[str]] = {}
        # node -> set of nodes it depends on (reverse edges)
        self._dependencies: dict[str, set[str]] = {}

    def add_node(self, name: str) -> None:
        self._dependents.setdefault(name, set())
        self._dependencies.setdefault(name, set())

    def remove_node(self, name: str) -> None:
        # Remove all edges involving this node
        for dep in self._dependencies.get(name, set()).copy():
            self._dependents.get(dep, set()).discard(name)
        for dep in self._dependents.get(name, set()).copy():
            self._dependencies.get(dep, set()).discard(name)
        self._dependents.pop(name, None)
        self._dependencies.pop(name, None)

    def set_dependencies(self, name: str, dependencies: set[str]) -> None:
        """Replace all dependencies for `name` with a new set.

        Raises CycleError if the new dependencies would create a cycle.
        """
        self.add_node(name)

        # Speculatively check for cycles before committing
        old_deps = self._dependencies.get(name, set()).copy()

        # Remove old edges
        for dep in old_deps:
            self._dependents.get(dep, set()).discard(name)

        # Add new edges
        self._dependencies[name] = set(dependencies)
        for dep in dependencies:
            self.add_node(dep)
            self._dependents[dep].add(name)

        # Check for cycles
        cycle = self._find_cycle_from(name)
        if cycle is not None:
            # Rollback
            for dep in dependencies:
                self._dependents[dep].discard(name)
            self._dependencies[name] = old_deps
            for dep in old_deps:
                self._dependents.setdefault(dep, set()).add(name)
            raise CycleError(cycle)

    def get_dependencies(self, name: str) -> set[str]:
        return self._dependencies.get(name, set()).copy()

    def get_dependents(self, name: str) -> set[str]:
        return self._dependents.get(name, set()).copy()

    def get_all_downstream(self, name: str) -> list[str]:
        """Return all transitive dependents of `name` in topological order."""
        visited: set[str] = set()
        order: list[str] = []

        queue = deque(self._dependents.get(name, set()))
        while queue:
            node = queue.popleft()
            if node in visited:
                continue
            visited.add(node)
            order.append(node)
            for dep in self._dependents.get(node, set()):
                if dep not in visited:
                    queue.append(dep)

        # Topological sort the downstream nodes
        return self._topo_sort(order)

    def topological_order(self) -> list[str]:
        """Return all nodes in topological order (dependencies before dependents)."""
        all_nodes = list(self._dependents.keys())
        return self._topo_sort(all_nodes)

    def _topo_sort(self, nodes: list[str]) -> list[str]:
        """Kahn's algorithm on a subgraph."""
        if not nodes:
            return []

        node_set = set(nodes)

        # Compute in-degrees within the subgraph
        in_degree: dict[str, int] = {n: 0 for n in node_set}
        for n in node_set:
            for dep in self._dependencies.get(n, set()):
                if dep in node_set:
                    in_degree[n] += 1

        queue = deque(n for n, d in in_degree.items() if d == 0)
        result: list[str] = []

        while queue:
            node = queue.popleft()
            result.append(node)
            for dependent in self._dependents.get(node, set()):
                if dependent in node_set:
                    in_degree[dependent] -= 1
                    if in_degree[dependent] == 0:
                        queue.append(dependent)

        return result

    def _find_cycle_from(self, start: str) -> list[str] | None:
        """DFS from `start` looking for a path back to itself."""
        path: list[str] = []
        visited: set[str] = set()

        def dfs(node: str) -> bool:
            if node in visited:
                return False
            visited.add(node)
            path.append(node)
            for dep in self._dependencies.get(node, set()):
                if dep == start:
                    path.append(dep)
                    return True
                if dfs(dep):
                    return True
            path.pop()
            return False

        return path if dfs(start) else None

    def __contains__(self, name: str) -> bool:
        return name in self._dependents
