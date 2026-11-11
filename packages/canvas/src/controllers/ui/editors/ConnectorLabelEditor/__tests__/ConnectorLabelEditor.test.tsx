// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { DocumentSurfaceContext } from "../../../../../rendering/objects/DocumentSurfaceContext";
import type { LabelBackdropLayer } from "../../../../../rendering/objects/LabelBackdropStoreContext";
import { LabelBackdropStoreContext } from "../../../../../rendering/objects/LabelBackdropStoreContext";
import { createLabelBackdropStore } from "../../../../hooks/utils/createLabelBackdropStore";
import { ConnectorLabelEditor } from "../ConnectorLabelEditor";

// Without this React treats every `act` below as unsupported and warns, the
// flushes being correct all the same.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const SURFACE = "rgb(11, 18, 32)";
const ANCHOR = { x: 100, y: 50 };
const LAYERS: LabelBackdropLayer[] = [
	{
		rect: { x: 0, y: 0, width: 200, height: 100 },
		fill: "rgb(255, 0, 0)",
		fillOpacity: 0.5,
	},
];

let unmount: (() => void) | null = null;

afterEach(() => {
	unmount?.();
	unmount = null;
});

/** Mounts the editor for "connector-1" over a store holding `layers` for it, or none. */
const renderEditor = ({
	layers,
	fill,
	strokeWidth,
}: {
	layers: LabelBackdropLayer[] | null;
	fill?: string;
	strokeWidth?: number;
}): HTMLElement => {
	const store = createLabelBackdropStore();
	if (layers !== null) {
		store.replaceLayers(new Map([["connector-1", layers]]));
	}
	const container = document.createElement("div");
	const root = createRoot(container);
	act(() =>
		root.render(
			<LabelBackdropStoreContext value={store}>
				<DocumentSurfaceContext value={SURFACE}>
					<ConnectorLabelEditor
						id="connector-1"
						anchor={ANCHOR}
						text="go"
						fill={fill}
						stroke="#000000"
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

describe("ConnectorLabelEditor backdrop", () => {
	it("draws the knockout and the layers behind the text, the box itself transparent", () => {
		const wrapper = renderEditor({ layers: LAYERS, strokeWidth: 2 });
		expect(wrapper.style.background).toBe("transparent");
		expect(
			wrapper.style.getPropertyValue("--jiscribe-label-editor-border-width"),
		).toBe("2px");

		const [backdrop, textArea] = [...wrapper.children];
		expect(backdrop.tagName).toBe("svg");
		expect(textArea.tagName).toBe("TEXTAREA");
		const [knockout, layerGroup] = [...backdrop.children];
		expect(knockout.tagName).toBe("rect");
		expect((knockout as SVGRectElement).style.fill).toBe(SURFACE);
		expect(knockout.getAttribute("rx")).toBe("2");
		expect(knockout.getAttribute("shape-rendering")).toBe("crispEdges");
		expect(layerGroup.getAttribute("shape-rendering")).toBe("crispEdges");
		const layer = layerGroup.firstElementChild as SVGElement;
		// It reaches the box's corners, so it is rounded as the box is.
		expect(layer.tagName).toBe("path");
		expect(layer.style.fill).toBe("rgb(255, 0, 0)");
	});

	it("keeps today's box with no layers for its id", () => {
		const wrapper = renderEditor({ layers: null });
		expect(wrapper.style.background).toBe(SURFACE);
		expect([...wrapper.children].map((child) => child.tagName)).toEqual([
			"TEXTAREA",
		]);
		expect(
			wrapper.style.getPropertyValue("--jiscribe-label-editor-border-width"),
		).toBe("");
	});

	it("ignores the backdrop for a label with a background of its own", () => {
		const wrapper = renderEditor({ layers: LAYERS, fill: "#00ff00" });
		expect(wrapper.style.background).toBe("rgb(0, 255, 0)");
		expect(wrapper.querySelector("svg")).toBeNull();
	});
});
