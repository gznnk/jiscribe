// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { Toolbar } from "../Toolbar";
import { ToolbarCommandStateContext } from "../ToolbarCommandStateContext";
import type { ToolbarSection } from "../toolbarSections";

// Without this React treats every `act` below as unsupported and warns.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const roots: { unmount: () => void }[] = [];

afterEach(() => {
	act(() => {
		roots.splice(0).forEach((root) => {
			root.unmount();
		});
	});
});

/**
 * Mounts the collapsed bar over `sections` and returns its
 * container. Slots only, so nothing reaches for a command's state.
 */
const renderCollapsed = (sections: ToolbarSection[]): HTMLElement => {
	const container = document.createElement("div");
	const root = createRoot(container);
	roots.push(root);
	act(() => {
		root.render(
			<ToolbarCommandStateContext value={() => null}>
				<Toolbar
					activePresetId={null}
					openCategoryId={null}
					zoom={1}
					sections={sections}
					isStencilLibraryPanelShown={false}
					isPropertyPanelShown={false}
					isChromeExpanded={false}
				/>
			</ToolbarCommandStateContext>,
		);
	});
	return container;
};

const countPills = (container: HTMLElement, edge: "start" | "end") =>
	container.querySelectorAll(`[data-testid="toolbar-pill:${edge}"]`).length;

describe("Toolbar while the chrome is collapsed", () => {
	it("draws no top-right pill when every section goes to the top-left one", () => {
		const container = renderCollapsed([
			{ id: "file", items: [{ type: "slot", id: "file", node: null }] },
			{
				id: "settings",
				align: "end",
				collapsedAlign: "hidden",
				items: [{ type: "slot", id: "settings", node: null }],
			},
		]);
		expect(countPills(container, "start")).toBe(1);
		expect(countPills(container, "end")).toBe(0);
	});

	it("draws no top-left pill when every section goes to the top-right one", () => {
		const container = renderCollapsed([
			{
				id: "view",
				align: "end",
				items: [{ type: "slot", id: "view", node: null }],
			},
		]);
		expect(countPills(container, "start")).toBe(0);
		expect(countPills(container, "end")).toBe(1);
	});
});
