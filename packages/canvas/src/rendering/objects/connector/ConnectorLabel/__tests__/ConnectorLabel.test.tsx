// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createCanvasZoomStore } from "../../../../../controllers/hooks/utils/createCanvasZoomStore";
import { createLabelBackdropStore } from "../../../../../controllers/hooks/utils/createLabelBackdropStore";
import { buildExportSvg } from "../../../../export/buildExportSvg";
import { CanvasZoomStoreContext } from "../../../CanvasZoomStoreContext";
import { DocumentSurfaceContext } from "../../../DocumentSurfaceContext";
import { FontsLoadedNonceContext } from "../../../FontsLoadedNonceContext";
import type { LabelBackdropLayer } from "../../../LabelBackdropStoreContext";
import { LabelBackdropStoreContext } from "../../../LabelBackdropStoreContext";
import type * as ConnectorLabelLayoutModule from "../../geometry/label/connectorLabelLayout";
import { resolveConnectorLabelBox } from "../../geometry/label/connectorLabelLayout";
import { ConnectorLabel } from "../ConnectorLabel";

/**
 * The label box is measured while the label renders, so nothing in the state
 * changes when a face lands — FontsLoadedNonceContext is the only thing that can
 * invalidate the memo holding that measurement.
 */

// Without this React treats every `act` below as unsupported and warns, the
// flushes being correct all the same.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const boxCalls = vi.hoisted(() => ({ count: 0 }));

vi.mock("../../geometry/label/connectorLabelLayout", async (importOriginal) => {
	const actual = await importOriginal<typeof ConnectorLabelLayoutModule>();
	return {
		...actual,
		resolveConnectorLabelBox: (
			...args: Parameters<typeof actual.resolveConnectorLabelBox>
		) => {
			boxCalls.count += 1;
			return actual.resolveConnectorLabelBox(...args);
		},
	};
});

// Held outside the render so the props are identical between renders: without
// that, the label's own memo never bails out and the second test would pass on a
// re-render rather than on the memo it means to check.
const LABEL_ANCHOR = { x: 10, y: 20 };

/** Mounts one label and lets the test drive the nonce the tree is given. */
const renderConnectorLabel = () => {
	const container = document.createElement("div");
	const root = createRoot(container);
	return {
		render: (nonce: number): void => {
			act(() =>
				root.render(
					<FontsLoadedNonceContext value={nonce}>
						<svg>
							<ConnectorLabel
								id="connector-1"
								anchor={LABEL_ANCHOR}
								text="label"
							/>
						</svg>
					</FontsLoadedNonceContext>,
				),
			);
		},
		unmount: () => act(() => root.unmount()),
	};
};

describe("ConnectorLabel", () => {
	beforeEach(() => {
		boxCalls.count = 0;
	});

	it("re-measures its box when the fonts-loaded nonce moves", () => {
		const label = renderConnectorLabel();
		label.render(0);
		const measuredBefore = boxCalls.count;

		label.render(1);

		expect(boxCalls.count).toBe(measuredBefore + 1);
		label.unmount();
	});

	it("keeps the measured box while the nonce stands still", () => {
		const label = renderConnectorLabel();
		label.render(0);
		const measuredBefore = boxCalls.count;

		label.render(0);
		label.render(0);

		expect(boxCalls.count).toBe(measuredBefore);
		label.unmount();
	});
});

describe("ConnectorLabel document surface", () => {
	it("knocks out in the surface the context carries, through its memo", () => {
		const container = document.createElement("div");
		const root = createRoot(container);
		const renderWithSurface = (documentSurface: string): void => {
			act(() =>
				root.render(
					<DocumentSurfaceContext value={documentSurface}>
						<svg>
							<ConnectorLabel
								id="connector-1"
								anchor={LABEL_ANCHOR}
								text="label"
							/>
						</svg>
					</DocumentSurfaceContext>,
				),
			);
		};
		const readBoxBackground = (): string | undefined =>
			container.querySelector<HTMLElement>("foreignObject > div")?.style
				.background;

		renderWithSurface("rgb(11, 18, 32)");
		expect(readBoxBackground()).toBe("rgb(11, 18, 32)");

		renderWithSurface("rgb(250, 240, 230)");
		expect(readBoxBackground()).toBe("rgb(250, 240, 230)");

		act(() => root.unmount());
	});
});

describe("ConnectorLabel legibility", () => {
	it("hides its box while too small to read, keeping it mounted", () => {
		const zoomStore = createCanvasZoomStore(1);
		const container = document.createElement("div");
		const root = createRoot(container);
		act(() =>
			root.render(
				<CanvasZoomStoreContext value={zoomStore}>
					<svg>
						<ConnectorLabel
							id="connector-1"
							anchor={LABEL_ANCHOR}
							text="label"
							fontSize={12}
						/>
					</svg>
				</CanvasZoomStoreContext>,
			),
		);
		const shownElement = container.querySelector("foreignObject");
		expect(shownElement?.hasAttribute("display")).toBe(false);

		// 12 × 0.3 = 3.6px
		act(() => zoomStore.setZoom(0.3));
		const hiddenElement = container.querySelector("foreignObject");
		expect(hiddenElement).toBe(shownElement);
		expect(hiddenElement?.getAttribute("display")).toBe("none");

		act(() => root.unmount());
	});
});

describe("ConnectorLabel backdrop", () => {
	const SURFACE = "rgb(11, 18, 32)";
	const renderOnBackdrop = (layers: LabelBackdropLayer[] | null) => {
		const store = createLabelBackdropStore();
		if (layers !== null) {
			store.replaceLayers(new Map([["connector-1", layers]]));
		}
		const zoomStore = createCanvasZoomStore(1);
		const container = document.createElement("div");
		const root = createRoot(container);
		act(() =>
			root.render(
				<CanvasZoomStoreContext value={zoomStore}>
					<LabelBackdropStoreContext value={store}>
						<DocumentSurfaceContext value={SURFACE}>
							<svg>
								<ConnectorLabel
									id="connector-1"
									anchor={LABEL_ANCHOR}
									text="label"
									fontSize={12}
								/>
							</svg>
						</DocumentSurfaceContext>
					</LabelBackdropStoreContext>
				</CanvasZoomStoreContext>,
			),
		);
		return {
			svg: container.querySelector("svg")!,
			zoomStore,
			unmount: () => act(() => root.unmount()),
		};
	};
	const box = resolveConnectorLabelBox({ text: "label", fontSize: 12 });
	const left = LABEL_ANCHOR.x - box.width / 2;
	const top = LABEL_ANCHOR.y - box.height / 2;

	it("draws the knockout and the layers under a transparent box, each layer over the whole box with its corners rounded", () => {
		const label = renderOnBackdrop([
			{ fill: "rgb(255, 0, 0)", fillOpacity: 0.5 },
			{ fill: "rgb(0, 0, 255)", fillOpacity: 1 },
		]);
		const [knockout, layerGroup, foreignObject] = [
			...label.svg.firstElementChild!.children,
		];
		expect(knockout.tagName).toBe("rect");
		expect(knockout.getAttribute("x")).toBe(String(left));
		expect(knockout.getAttribute("rx")).toBe("2");
		expect((knockout as SVGRectElement).style.fill).toBe(SURFACE);
		expect(layerGroup.tagName).toBe("g");
		expect(layerGroup.getAttribute("pointer-events")).toBe("none");
		// Unsmoothed alike, so no rim of the knockout shows around the layers.
		expect(knockout.getAttribute("shape-rendering")).toBe("crispEdges");
		expect(layerGroup.getAttribute("shape-rendering")).toBe("crispEdges");
		const layers = [...layerGroup.children] as SVGElement[];
		expect(
			layers.map((layer) => ({
				tag: layer.tagName,
				x: layer.getAttribute("x"),
				y: layer.getAttribute("y"),
				width: layer.getAttribute("width"),
				height: layer.getAttribute("height"),
				rx: layer.getAttribute("rx"),
				fill: layer.style.fill,
			})),
		).toEqual(
			["rgb(255, 0, 0)", "rgb(0, 0, 255)"].map((fill) => ({
				tag: "rect",
				x: String(left),
				y: String(top),
				width: String(box.width),
				height: String(box.height),
				rx: "2",
				fill,
			})),
		);
		expect(foreignObject.tagName).toBe("foreignObject");
		expect(
			(foreignObject.firstElementChild as HTMLElement).style.background,
		).toBe("transparent");
		label.unmount();
	});

	it("keeps the knockout on the box itself, as before, on no backdrop", () => {
		const label = renderOnBackdrop(null);
		expect(
			[...label.svg.firstElementChild!.children].map((child) => child.tagName),
		).toEqual(["foreignObject"]);
		expect(label.svg.querySelector("[shape-rendering]")).toBeNull();
		expect(
			(label.svg.querySelector("foreignObject > div") as HTMLElement).style
				.background,
		).toBe(SURFACE);
		label.unmount();
	});

	it("hides the knockout and the layers with the box while too small to read", () => {
		const label = renderOnBackdrop([
			{ fill: "rgb(255, 0, 0)", fillOpacity: 0.5 },
		]);
		// 12 × 0.3 = 3.6px
		act(() => label.zoomStore.setZoom(0.3));
		for (const child of label.svg.firstElementChild!.children) {
			expect(child.getAttribute("display")).toBe("none");
		}
		label.unmount();
	});
});

describe("ConnectorLabel while open in the editor", () => {
	/** Mounts one label being edited on a store holding `layers` for it, at zoom 1. */
	const renderEditedLabel = (
		text: string,
		layers: LabelBackdropLayer[] | null = null,
	) => {
		const store = createLabelBackdropStore();
		if (layers !== null) {
			store.replaceLayers(new Map([["connector-1", layers]]));
		}
		const zoomStore = createCanvasZoomStore(1);
		const container = document.createElement("div");
		const root = createRoot(container);
		act(() =>
			root.render(
				<CanvasZoomStoreContext value={zoomStore}>
					<LabelBackdropStoreContext value={store}>
						<svg>
							<ConnectorLabel
								id="connector-1"
								anchor={LABEL_ANCHOR}
								text={text}
								fontSize={12}
								strokeWidth={2}
								stroke="#00ff00"
								isEditing
							/>
						</svg>
					</LabelBackdropStoreContext>
				</CanvasZoomStoreContext>,
			),
		);
		return {
			svg: container.querySelector("svg")!,
			zoomStore,
			unmount: () => act(() => root.unmount()),
		};
	};

	it("draws the minimum box for empty text, its border kept, with no text in it", () => {
		const label = renderEditedLabel("");
		const box = resolveConnectorLabelBox({
			text: "",
			fontSize: 12,
			strokeWidth: 2,
		});
		const foreignObject = label.svg.querySelector("foreignObject")!;
		expect(foreignObject.getAttribute("width")).toBe(String(box.width));
		expect(foreignObject.getAttribute("height")).toBe(String(box.height));
		expect(foreignObject.getAttribute("x")).toBe(
			String(LABEL_ANCHOR.x - box.width / 2),
		);
		const labelBox = foreignObject.firstElementChild as HTMLElement;
		expect(labelBox.style.border).toBe("2px solid rgb(0, 255, 0)");
		expect(labelBox.textContent).toBe("");
		label.unmount();
	});

	it("leaves the text to the editor, sizing the box from it", () => {
		const label = renderEditedLabel("typed");
		const foreignObject = label.svg.querySelector("foreignObject")!;
		expect(foreignObject.textContent).toBe("");
		expect(foreignObject.getAttribute("width")).toBe(
			String(
				resolveConnectorLabelBox({
					text: "typed",
					fontSize: 12,
					strokeWidth: 2,
				}).width,
			),
		);
		// One element in the foreignObject, as export and hit testing read it.
		expect(foreignObject.children).toHaveLength(1);
		label.unmount();
	});

	it("takes no pointer, so neither a drag nor a double click lands on it under the editor", () => {
		const label = renderEditedLabel("typed");
		expect(
			label.svg.querySelector("foreignObject")?.getAttribute("pointer-events"),
		).toBe("none");
		label.unmount();
	});

	it("stays shown at a zoom too small to read, the backdrop with it", () => {
		const label = renderEditedLabel("typed", [
			{ fill: "rgb(255, 0, 0)", fillOpacity: 0.5 },
		]);
		// 12 × 0.3 = 3.6px
		act(() => label.zoomStore.setZoom(0.3));
		const drawn = label.svg.querySelectorAll("foreignObject, rect, g");
		expect(drawn.length).toBeGreaterThan(0);
		for (const element of drawn) {
			expect(element.getAttribute("display")).toBeNull();
		}
		label.unmount();
	});

	it("wraps the backdrop and the box in one group image export drops", () => {
		const label = renderEditedLabel("typed", [
			{ fill: "rgb(255, 0, 0)", fillOpacity: 0.5 },
		]);
		const [group] = [...label.svg.children];
		expect(label.svg.children).toHaveLength(1);
		expect(group.tagName).toBe("g");
		expect(group.getAttribute("data-canvas-export")).toBe("exclude");
		expect([...group.children].map((child) => child.tagName)).toEqual([
			"rect",
			"g",
			"foreignObject",
		]);
		label.unmount();
	});

	it("leaves nothing of itself in an image export, backdrop included", () => {
		// jsdom has no 2D context, which the export acquires to measure text.
		vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
			measureText: () => ({ width: 0 }),
		} as unknown as CanvasRenderingContext2D);
		const label = renderEditedLabel("typed", [
			{ fill: "rgb(255, 0, 0)", fillOpacity: 0.5 },
		]);
		// Computed styles are read off the live tree, so it has to be attached.
		const container = label.svg.parentElement!;
		document.body.append(container);
		try {
			const exported = buildExportSvg(label.svg, { background: "transparent" });
			expect(exported.querySelector("rect, foreignObject, g")).toBeNull();
		} finally {
			vi.restoreAllMocks();
			label.unmount();
			container.remove();
		}
	});

	it("is not marked for export to drop while not edited, and keeps its box mounted as the editor opens", () => {
		const container = document.createElement("div");
		const root = createRoot(container);
		const renderLabel = (isEditing: boolean) =>
			act(() =>
				root.render(
					<svg>
						<ConnectorLabel
							id="connector-1"
							anchor={LABEL_ANCHOR}
							text="go"
							isEditing={isEditing}
						/>
					</svg>,
				),
			);
		renderLabel(false);
		const committedBox = container.querySelector("foreignObject");
		expect(
			container.querySelector('[data-canvas-export="exclude"]'),
		).toBeNull();
		expect(committedBox?.getAttribute("pointer-events")).toBe("auto");

		renderLabel(true);
		expect(container.querySelector("foreignObject")).toBe(committedBox);
		expect(
			committedBox?.closest('[data-canvas-export="exclude"]'),
		).not.toBeNull();
		act(() => root.unmount());
	});
});
