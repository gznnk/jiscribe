// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";

import { useNotifyPinnedCategoriesChange } from "../useNotifyPinnedCategoriesChange";

/**
 * What the hook decides is *when* the host hears about the pins: never on
 * mount, once per real change, and not at all for a re-render that merely hands
 * over a new array holding the same ids.
 */

// Without this React treats every `act` below as unsupported and warns, the
// flushes being correct all the same.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

/**
 * Mounts the hook on a probe whose pins are driven by re-rendering, and reports
 * what reached the callback. A fresh callback is passed on every render so a
 * host that does not memoize its own cannot make the effect re-fire.
 */
const renderHook = (initialPinnedCategoryIds: string[]) => {
	const onPinnedCategoriesChange =
		vi.fn<(pinnedCategoryIds: string[]) => void>();
	const Probe = ({ pinnedCategoryIds }: { pinnedCategoryIds: string[] }) => {
		useNotifyPinnedCategoriesChange(pinnedCategoryIds, (reported) =>
			onPinnedCategoriesChange(reported),
		);
		return null;
	};
	const container = document.createElement("div");
	const root = createRoot(container);
	act(() =>
		root.render(<Probe pinnedCategoryIds={initialPinnedCategoryIds} />),
	);
	return {
		onPinnedCategoriesChange,
		rerender: (nextPinnedCategoryIds: string[]) =>
			act(() =>
				root.render(<Probe pinnedCategoryIds={nextPinnedCategoryIds} />),
			),
		unmount: () => act(() => root.unmount()),
	};
};

describe("useNotifyPinnedCategoriesChange", () => {
	it("stays silent on mount, so the pins the host seeded are not read back to it", () => {
		const probe = renderHook(["flowchart"]);

		expect(probe.onPinnedCategoriesChange).not.toHaveBeenCalled();
		probe.unmount();
	});

	it("delivers the pins once when one is added", () => {
		const probe = renderHook(["flowchart"]);

		probe.rerender(["flowchart", "uml"]);

		expect(probe.onPinnedCategoriesChange).toHaveBeenCalledTimes(1);
		expect(probe.onPinnedCategoriesChange).toHaveBeenCalledWith([
			"flowchart",
			"uml",
		]);
		probe.unmount();
	});

	it("delivers the last pin going, as an empty list", () => {
		const probe = renderHook(["flowchart"]);

		probe.rerender([]);

		expect(probe.onPinnedCategoriesChange).toHaveBeenCalledWith([]);
		probe.unmount();
	});

	it("delivers a reorder, the order being part of the value", () => {
		const probe = renderHook(["flowchart", "uml"]);

		probe.rerender(["uml", "flowchart"]);

		expect(probe.onPinnedCategoriesChange).toHaveBeenCalledTimes(1);
		probe.unmount();
	});

	it("says nothing for a re-render whose pins hold the same ids in a new array", () => {
		const probe = renderHook([]);
		probe.rerender(["flowchart"]);

		probe.rerender(["flowchart"]);

		expect(probe.onPinnedCategoriesChange).toHaveBeenCalledTimes(1);
		probe.unmount();
	});
});
