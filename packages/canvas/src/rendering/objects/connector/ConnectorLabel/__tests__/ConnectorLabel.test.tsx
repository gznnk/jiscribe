// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createCanvasZoomStore } from "../../../../../controllers/hooks/utils/createCanvasZoomStore";
import { createLabelBackdropStore } from "../../../../../controllers/hooks/utils/createLabelBackdropStore";
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
	const renderOnBackdrop = (
		layers: LabelBackdropLayer[] | null,
		fill?: string,
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
						<DocumentSurfaceContext value={SURFACE}>
							<svg>
								<ConnectorLabel
									id="connector-1"
									anchor={LABEL_ANCHOR}
									text="label"
									fontSize={12}
									fill={fill}
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

	it("draws the knockout and the layers under a transparent box, rounding the layers at the box's corners", () => {
		const label = renderOnBackdrop([
			{
				rect: { x: 0, y: 0, width: box.width, height: box.height },
				fill: "rgb(255, 0, 0)",
				fillOpacity: 0.5,
			},
			{
				rect: { x: 4, y: 2, width: 2, height: 2 },
				fill: "rgb(0, 0, 255)",
				fillOpacity: 1,
			},
		]);
		const [knockout, layerGroup, foreignObject] = [...label.svg.children];
		expect(knockout.tagName).toBe("rect");
		expect(knockout.getAttribute("x")).toBe(String(left));
		expect(knockout.getAttribute("rx")).toBe("2");
		expect((knockout as SVGRectElement).style.fill).toBe(SURFACE);
		expect(layerGroup.tagName).toBe("g");
		expect(layerGroup.getAttribute("pointer-events")).toBe("none");
		// Unsmoothed alike, so no rim of the knockout shows around the layers.
		expect(knockout.getAttribute("shape-rendering")).toBe("crispEdges");
		expect(layerGroup.getAttribute("shape-rendering")).toBe("crispEdges");
		// The layer reaching the box's corners is a path; the inner one stays a rect.
		const [cornered, inner] = [...layerGroup.children] as SVGElement[];
		expect(cornered.tagName).toBe("path");
		expect(cornered.getAttribute("d")).toContain(" A2 2 0 0 1 ");
		expect(cornered.style.fill).toBe("rgb(255, 0, 0)");
		expect(inner.tagName).toBe("rect");
		expect(inner.getAttribute("x")).toBe(String(left + 4));
		expect(inner.getAttribute("y")).toBe(String(top + 2));
		expect(foreignObject.tagName).toBe("foreignObject");
		expect(
			(foreignObject.firstElementChild as HTMLElement).style.background,
		).toBe("transparent");
		label.unmount();
	});

	it("keeps the knockout on the box itself, as before, on no backdrop", () => {
		const label = renderOnBackdrop(null);
		expect([...label.svg.children].map((child) => child.tagName)).toEqual([
			"foreignObject",
		]);
		expect(label.svg.querySelector("[shape-rendering]")).toBeNull();
		expect(
			(label.svg.querySelector("foreignObject > div") as HTMLElement).style
				.background,
		).toBe(SURFACE);
		label.unmount();
	});

	it("ignores the backdrop for a label with a background of its own", () => {
		const label = renderOnBackdrop(
			[
				{
					rect: { x: 0, y: 0, width: box.width, height: box.height },
					fill: "rgb(255, 0, 0)",
					fillOpacity: 0.5,
				},
			],
			"#00ff00",
		);
		expect(label.svg.children).toHaveLength(1);
		label.unmount();
	});

	it("hides the knockout and the layers with the box while too small to read", () => {
		const label = renderOnBackdrop([
			{
				rect: { x: 0, y: 0, width: box.width, height: box.height },
				fill: "rgb(255, 0, 0)",
				fillOpacity: 0.5,
			},
		]);
		// 12 × 0.3 = 3.6px
		act(() => label.zoomStore.setZoom(0.3));
		for (const child of label.svg.children) {
			expect(child.getAttribute("display")).toBe("none");
		}
		label.unmount();
	});
});
