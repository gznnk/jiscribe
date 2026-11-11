// @vitest-environment jsdom

import type { TextSlot } from "@jiscribe/doc/model/objects/types/text/TextSlot";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { createCanvasZoomStore } from "../../../../controllers/hooks/utils/createCanvasZoomStore";
import { createLabelBackdropStore } from "../../../../controllers/hooks/utils/createLabelBackdropStore";
import { CanvasZoomStoreContext } from "../../CanvasZoomStoreContext";
import { DocumentSurfaceContext } from "../../DocumentSurfaceContext";
import { LabelBackdropStoreContext } from "../../LabelBackdropStoreContext";
import { LabelTextFill } from "../LabelTextFill";

// Without this React treats every `act` below as unsupported and warns, the
// flushes being correct all the same.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const REGION = { x: -20, y: 25, width: 40, height: 20 };
const TEXT_SLOT: TextSlot = { text: "Caption", fontSize: 12 };
const SURFACE = "rgb(1, 2, 3)";

/** A store holding two layers under "shape": its frame's body, and a band over the box's left half. */
const createStoreWithLayers = () => {
	const store = createLabelBackdropStore();
	store.replaceLayers(
		new Map([
			[
				"shape",
				[
					{
						rect: { x: 0, y: 0, width: 40, height: 20 },
						fill: "rgb(255, 0, 0)",
						fillOpacity: 0.5,
					},
					{
						rect: { x: 0, y: 0, width: 20, height: 20 },
						fill: "rgb(0, 0, 255)",
						fillOpacity: 1,
					},
				],
			],
		]),
	);
	return store;
};

let unmount: (() => void) | null = null;

afterEach(() => {
	unmount?.();
	unmount = null;
});

const mount = (element: React.ReactElement): HTMLElement => {
	const container = document.createElement("div");
	const root = createRoot(container);
	act(() => root.render(element));
	unmount = () => act(() => root.unmount());
	return container;
};

const renderFill = ({
	ownerId,
	labelFill,
	zoom = 1,
}: {
	ownerId?: string;
	labelFill?: string;
	zoom?: number;
}) => {
	const zoomStore = createCanvasZoomStore(zoom);
	const container = mount(
		<CanvasZoomStoreContext value={zoomStore}>
			<LabelBackdropStoreContext value={createStoreWithLayers()}>
				<DocumentSurfaceContext value={SURFACE}>
					<svg>
						<g data-canvas-export="flatten">
							<LabelTextFill
								objectType="captioned"
								textSlot={TEXT_SLOT}
								labelFill={labelFill}
								region={REGION}
								ownerId={ownerId}
							/>
						</g>
					</svg>
				</DocumentSurfaceContext>
			</LabelBackdropStoreContext>
		</CanvasZoomStoreContext>,
	);
	return { container, zoomStore };
};

describe("LabelTextFill backdrop", () => {
	it("paints the layers over the page's color, offset to the caption's box, in one group", () => {
		const { container } = renderFill({ ownerId: "shape" });
		const group = container.querySelector('g[data-canvas-export="flatten"]')!;
		const knockout = group.querySelector(":scope > rect") as SVGRectElement;
		expect(knockout.style.fill).toBe(SURFACE);
		expect(group.querySelectorAll(":scope > rect")).toHaveLength(1);

		const layerGroup = group.querySelector(":scope > g")!;
		expect(layerGroup.getAttribute("pointer-events")).toBe("none");
		expect(layerGroup.hasAttribute("data-kind")).toBe(false);
		const layers = [...layerGroup.querySelectorAll("rect")] as SVGRectElement[];
		expect(
			layers.map((layer) => ({
				x: layer.getAttribute("x"),
				width: layer.getAttribute("width"),
				fill: layer.style.fill,
				fillOpacity: layer.style.fillOpacity,
			})),
		).toEqual([
			{ x: "-20", width: "40", fill: "rgb(255, 0, 0)", fillOpacity: "0.5" },
			{ x: "-20", width: "20", fill: "rgb(0, 0, 255)", fillOpacity: "1" },
		]);
		expect(layers[0].getAttribute("y")).toBe("25");
	});

	it("paints the page's color alone without an ownerId, as before", () => {
		const { container } = renderFill({});
		const group = container.querySelector('g[data-canvas-export="flatten"]')!;
		expect(group.children).toHaveLength(1);
		expect((group.children[0] as SVGRectElement).style.fill).toBe(SURFACE);
	});

	it("paints no layers under a caption with a background of its own", () => {
		const { container } = renderFill({
			ownerId: "shape",
			labelFill: "#00ff00",
		});
		const group = container.querySelector('g[data-canvas-export="flatten"]')!;
		expect(group.children).toHaveLength(1);
		expect((group.children[0] as SVGRectElement).style.fill).toBe(
			"rgb(0, 255, 0)",
		);
	});

	it("hides the page's color and the layers alike while the caption is too small to read", () => {
		const { container, zoomStore } = renderFill({ ownerId: "shape" });
		const group = container.querySelector('g[data-canvas-export="flatten"]')!;
		// 12 × 0.3 = 3.6px
		act(() => zoomStore.setZoom(0.3));
		expect(group.querySelector(":scope > rect")?.getAttribute("display")).toBe(
			"none",
		);
		expect(group.querySelector(":scope > g")?.getAttribute("display")).toBe(
			"none",
		);
	});
});
