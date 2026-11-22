// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { resolveConnectorLabelBox } from "../../../../../rendering/objects/connector/geometry/label/connectorLabelLayout";
import { DocumentSurfaceContext } from "../../../../../rendering/objects/DocumentSurfaceContext";
import { LabelBackdropStoreContext } from "../../../../../rendering/objects/LabelBackdropStoreContext";
import { createLabelBackdropStore } from "../../../../hooks/utils/createLabelBackdropStore";
import { ConnectorLabelEditor } from "../ConnectorLabelEditor";

// Without this React treats every `act` below as unsupported and warns, the
// flushes being correct all the same.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const ANCHOR = { x: 100, y: 50 };
const TEXT = "go";

let unmount: (() => void) | null = null;

afterEach(() => {
	unmount?.();
	unmount = null;
});

/**
 * Mounts the editor where a committed label would paint a backdrop and a
 * knockout (a layer stored for the connector, a page color), so a box the
 * editor painted itself would show.
 */
const renderEditor = (strokeWidth?: number): HTMLElement => {
	const store = createLabelBackdropStore();
	store.replaceLayers(
		new Map([["connector-1", [{ fill: "rgb(255, 0, 0)", fillOpacity: 0.5 }]]]),
	);
	const container = document.createElement("div");
	const root = createRoot(container);
	act(() =>
		root.render(
			<LabelBackdropStoreContext value={store}>
				<DocumentSurfaceContext value="rgb(11, 18, 32)">
					<ConnectorLabelEditor
						anchor={ANCHOR}
						text={TEXT}
						strokeWidth={strokeWidth}
						onChange={() => {}}
					/>
				</DocumentSurfaceContext>
			</LabelBackdropStoreContext>,
		),
	);
	unmount = () => act(() => root.unmount());
	return container.querySelector<HTMLElement>('[data-testid="text-editor"]')!;
};

describe("ConnectorLabelEditor box", () => {
	it("paints no box of its own: no background, no backdrop, the text area alone", () => {
		const wrapper = renderEditor(2);
		expect(wrapper.style.background).toBe("");
		expect(wrapper.style.backgroundColor).toBe("");
		expect([...wrapper.children].map((child) => child.tagName)).toEqual([
			"TEXTAREA",
		]);
	});

	it("takes up the label's border width in a transparent border, at the label box's width", () => {
		const wrapper = renderEditor(2);
		expect(wrapper.style.borderWidth).toBe("2px");
		expect(wrapper.style.borderStyle).toBe("solid");
		expect(wrapper.style.borderColor).toBe("transparent");
		expect(wrapper.style.width).toBe(
			`${resolveConnectorLabelBox({ text: TEXT, strokeWidth: 2 }).width}px`,
		);
	});

	it("has no border for a label without one", () => {
		const wrapper = renderEditor();
		expect(wrapper.style.borderStyle).toBe("none");
	});
});
