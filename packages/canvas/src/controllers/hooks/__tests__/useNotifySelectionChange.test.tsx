// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";

import { useNotifySelectionChange } from "../useNotifySelectionChange";

/**
 * When the host hears about the selection: never on mount, once per change in
 * content, and not for a new array holding the same ids or a new callback.
 */

// Without this React treats every `act` below as unsupported and warns.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

/**
 * Mounts the hook on a probe driven by re-rendering. A fresh callback is passed
 * on every render, as a host that does not memoize its own would.
 */
const renderHook = (initialSelection: readonly string[]) => {
	const onSelectionChange = vi.fn<(selectedIds: string[]) => void>();
	const Probe = ({ selection }: { selection: readonly string[] }) => {
		useNotifySelectionChange(selection, (selectedIds) =>
			onSelectionChange(selectedIds),
		);
		return null;
	};
	const root = createRoot(document.createElement("div"));
	act(() => root.render(<Probe selection={initialSelection} />));
	return {
		onSelectionChange,
		rerender: (nextSelection: readonly string[]) =>
			act(() => root.render(<Probe selection={nextSelection} />)),
		unmount: () => act(() => root.unmount()),
	};
};

describe("useNotifySelectionChange", () => {
	it("does not report the selection it mounts with", () => {
		const { onSelectionChange, unmount } = renderHook(["a"]);
		expect(onSelectionChange).not.toHaveBeenCalled();
		unmount();
	});

	it("reports each change once, a cleared selection included", () => {
		const { onSelectionChange, rerender, unmount } = renderHook([]);
		rerender(["a"]);
		rerender(["a", "b"]);
		rerender([]);
		expect(onSelectionChange.mock.calls).toEqual([[["a"]], [["a", "b"]], [[]]]);
		unmount();
	});

	it("stays quiet for a new array holding the same ids in the same order", () => {
		const { onSelectionChange, rerender, unmount } = renderHook([]);
		rerender(["a", "b"]);
		rerender(["a", "b"]);
		expect(onSelectionChange).toHaveBeenCalledTimes(1);
		unmount();
	});

	it("treats a reordering of the same ids as a change", () => {
		const { onSelectionChange, rerender, unmount } = renderHook(["a", "b"]);
		rerender(["b", "a"]);
		expect(onSelectionChange.mock.calls).toEqual([[["b", "a"]]]);
		unmount();
	});

	it("hands the host a copy, never the state's own array", () => {
		const { onSelectionChange, rerender, unmount } = renderHook([]);
		const selection = Object.freeze(["a"]);
		rerender(selection);
		const [[reported]] = onSelectionChange.mock.calls;
		expect(reported).toEqual(["a"]);
		expect(reported).not.toBe(selection);
		unmount();
	});
});
