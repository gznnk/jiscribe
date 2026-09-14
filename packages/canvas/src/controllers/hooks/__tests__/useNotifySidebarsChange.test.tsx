// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";

import type {
	CanvasSidebarsState,
	PropertyPanelState,
	StencilLibraryPanelState,
} from "../../CanvasTypes";
import { useNotifySidebarsChange } from "../useNotifySidebarsChange";

/**
 * What the hook decides is *when* the host hears about the sidebars: never on
 * mount, once per real change, and not at all for a re-render that merely hands
 * over new objects holding the same panel state.
 */

// Without this React treats every `act` below as unsupported and warns, the
// flushes being correct all the same.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

/** The two reducer panel states a render of the probe is driven by. */
type ProbePanels = {
	stencilLibraryPanel: StencilLibraryPanelState;
	propertyPanel: PropertyPanelState;
};

const bothClosed = (): ProbePanels => ({
	stencilLibraryPanel: { isOpen: false, collapsedSectionIds: [] },
	propertyPanel: { isOpen: false, collapsedSectionIds: [] },
});

/**
 * Mounts the hook on a probe whose panel states are driven by re-rendering, and
 * reports what reached the callback. A fresh callback is passed on every render
 * so a host that does not memoize its own cannot make the effect re-fire.
 */
const renderHook = (initialPanels: ProbePanels) => {
	const onSidebarsChange = vi.fn<(sidebars: CanvasSidebarsState) => void>();
	const Probe = ({ panels }: { panels: ProbePanels }) => {
		useNotifySidebarsChange(
			panels.stencilLibraryPanel,
			panels.propertyPanel,
			(reported) => onSidebarsChange(reported),
		);
		return null;
	};
	const container = document.createElement("div");
	const root = createRoot(container);
	act(() => root.render(<Probe panels={initialPanels} />));
	return {
		onSidebarsChange,
		rerender: (nextPanels: ProbePanels) =>
			act(() => root.render(<Probe panels={nextPanels} />)),
		unmount: () => act(() => root.unmount()),
	};
};

describe("useNotifySidebarsChange", () => {
	it("stays silent on mount, so the state the host seeded is not read back to it", () => {
		const probe = renderHook({
			stencilLibraryPanel: { isOpen: true, collapsedSectionIds: ["basic"] },
			propertyPanel: { isOpen: false, collapsedSectionIds: [] },
		});

		expect(probe.onSidebarsChange).not.toHaveBeenCalled();
		probe.unmount();
	});

	it("delivers both sidebars once when one edge opens", () => {
		const probe = renderHook(bothClosed());

		probe.rerender({
			stencilLibraryPanel: { isOpen: true, collapsedSectionIds: [] },
			propertyPanel: { isOpen: false, collapsedSectionIds: [] },
		});

		expect(probe.onSidebarsChange).toHaveBeenCalledTimes(1);
		expect(probe.onSidebarsChange).toHaveBeenCalledWith({
			left: { isOpen: true },
			right: { isOpen: false },
			panels: {
				stencilLibrary: { collapsedSectionIds: [] },
				properties: { collapsedSectionIds: [] },
			},
		});
		probe.unmount();
	});

	it("delivers a section being collapsed", () => {
		const probe = renderHook(bothClosed());

		probe.rerender({
			stencilLibraryPanel: { isOpen: false, collapsedSectionIds: [] },
			propertyPanel: { isOpen: false, collapsedSectionIds: ["text"] },
		});

		expect(probe.onSidebarsChange).toHaveBeenCalledTimes(1);
		expect(probe.onSidebarsChange).toHaveBeenCalledWith({
			left: { isOpen: false },
			right: { isOpen: false },
			panels: {
				stencilLibrary: { collapsedSectionIds: [] },
				properties: { collapsedSectionIds: ["text"] },
			},
		});
		probe.unmount();
	});

	it("says nothing for a re-render whose panels hold the same values in new objects", () => {
		const probe = renderHook(bothClosed());
		probe.rerender({
			stencilLibraryPanel: { isOpen: true, collapsedSectionIds: ["basic"] },
			propertyPanel: { isOpen: false, collapsedSectionIds: [] },
		});

		probe.rerender({
			stencilLibraryPanel: { isOpen: true, collapsedSectionIds: ["basic"] },
			propertyPanel: { isOpen: false, collapsedSectionIds: [] },
		});

		expect(probe.onSidebarsChange).toHaveBeenCalledTimes(1);
		probe.unmount();
	});
});
