// @vitest-environment jsdom

import type { ConnectorLabel } from "@jiscribe/doc/model/objects/connector/ConnectorDoc";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import {
	CanvasZoomStoreContext,
	type CanvasZoomStore,
} from "../../../../../rendering/objects/CanvasZoomStoreContext";
import { resolveConnectorLabelBox } from "../../../../../rendering/objects/connector/geometry/label/connectorLabelLayout";
import type { ConnectorState } from "../../../../../states/objects/connector/ConnectorState";
import { connectorLabelPartSelection } from "../../../../selection/__tests__/support/connectorLabelPartSelection";
import { selectionOf } from "../../../../selection/__tests__/support/selectionOf";
import { vertexPartSelection } from "../../../../selection/__tests__/support/vertexPartSelection";
import type { CanvasSelection } from "../../../../selection/CanvasSelection";
import { ConnectorControls } from "../../../controls/ConnectorControls";
import { SELECTION_OUTLINE_WIDTH } from "../../utils/selectionOutline";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const unmounts: (() => void)[] = [];

afterEach(() => {
	unmounts.splice(0).forEach((unmount) => unmount());
});

/** A straight connector over (0,0)-(200,0) between free ends, so no owner geometry is involved. */
const connectorWith = (label: ConnectorLabel | undefined): ConnectorState =>
	({
		id: "c1",
		type: "connector",
		points: [],
		source: { anchor: { kind: "free", point: { x: 0, y: 0 } } },
		target: { anchor: { kind: "free", point: { x: 200, y: 0 } } },
		routing: "straight",
		...(label ? { label } : {}),
	}) as unknown as ConnectorState;

/** A canvas drawn at `zoom`, for the legibility check. */
const zoomStoreAt = (zoom: number): CanvasZoomStore => ({
	subscribe: () => () => {},
	getZoom: () => zoom,
	isSnapshotRendering: () => false,
});

/** Renders the connector's controls under `selection` and returns the part outlines drawn. */
const renderPartOutlines = (
	connector: ConnectorState,
	selection: CanvasSelection,
	zoom = 1,
	labelDraft: ConnectorLabel | null = null,
): SVGRectElement[] => {
	const container = document.createElement("div");
	const root = createRoot(container);
	act(() => {
		root.render(
			<CanvasZoomStoreContext.Provider value={zoomStoreAt(zoom)}>
				<svg>
					<ConnectorControls
						connectorState={connector}
						objects={{ c1: connector }}
						selection={selection}
						zoom={zoom}
						labelDraft={labelDraft}
					/>
				</svg>
			</CanvasZoomStoreContext.Provider>,
		);
	});
	unmounts.push(() => act(() => root.unmount()));
	return Array.from(
		container.querySelectorAll<SVGRectElement>('[data-testid="part-outline"]'),
	);
};

/** The outline's box in world coordinates, as its rect states it. */
const worldBoxOf = (outline: SVGRectElement) => ({
	x: Number(outline.getAttribute("x")),
	y: Number(outline.getAttribute("y")),
	width: Number(outline.getAttribute("width")),
	height: Number(outline.getAttribute("height")),
});

describe("ConnectorLabelPartOutline (through ConnectorControls)", () => {
	it("outlines the picked label's box, centred where the renderer anchors it", () => {
		const label = { text: "Yes", position: 0.25, offset: 10 };
		const outlines = renderPartOutlines(
			connectorWith(label),
			selectionOf(["c1"], connectorLabelPartSelection()),
		);
		const { width, height } = resolveConnectorLabelBox(label);

		expect(outlines).toHaveLength(1);
		const [outline] = outlines;
		// 0.25 of 200 along, 10 to the left of travel (+y).
		const box = worldBoxOf(outline);
		expect(box.x).toBeCloseTo(50 - width / 2);
		expect(box.y).toBeCloseTo(10 - height / 2);
		expect(box.width).toBeCloseTo(width);
		expect(box.height).toBeCloseTo(height);
		expect(outline.getAttribute("stroke-width")).toBe(
			String(SELECTION_OUTLINE_WIDTH),
		);
		expect(outline.getAttribute("pointer-events")).toBe("none");
		expect(outline.style.fill).toBe("none");
	});

	it("draws nothing while the connector is selected with nothing, or a waypoint, picked", () => {
		const connector = {
			...connectorWith({ text: "Yes" }),
			points: [{ x: 100, y: 50 }],
		} as ConnectorState;
		expect(renderPartOutlines(connector, selectionOf(["c1"]))).toEqual([]);
		expect(
			renderPartOutlines(
				connector,
				selectionOf(["c1"], vertexPartSelection(0)),
			),
		).toEqual([]);
	});

	it("draws nothing while the label is too small to read, as the label itself is hidden", () => {
		expect(
			renderPartOutlines(
				connectorWith({ text: "Yes" }),
				selectionOf(["c1"], connectorLabelPartSelection()),
				0.01,
			),
		).toEqual([]);
	});

	it("follows the draft while the label is open in the editor, not the committed label", () => {
		const label = { text: "Yes", position: 0.25, offset: 10 };
		const labelDraft = { ...label, text: "Yes, and more" };
		const outlines = renderPartOutlines(
			connectorWith(label),
			selectionOf(["c1"], connectorLabelPartSelection()),
			1,
			labelDraft,
		);
		const { width, height } = resolveConnectorLabelBox(labelDraft);
		expect(width).toBeGreaterThan(resolveConnectorLabelBox(label).width);

		expect(outlines).toHaveLength(1);
		const [outline] = outlines;
		const box = worldBoxOf(outline);
		expect(box.x).toBeCloseTo(50 - width / 2);
		expect(box.y).toBeCloseTo(10 - height / 2);
		expect(box.width).toBeCloseTo(width);
		expect(box.height).toBeCloseTo(height);
		expect(outline.style.fill).toBe("none");
	});

	it("outlines the minimum box of a label being created, at the draft's placement", () => {
		const outlines = renderPartOutlines(
			connectorWith(undefined),
			selectionOf(["c1"], connectorLabelPartSelection()),
			1,
			{ text: "", position: 0.75, offset: 0 },
		);
		const { width, height } = resolveConnectorLabelBox({ text: "" });

		expect(outlines).toHaveLength(1);
		const [outline] = outlines;
		expect(width).toBeGreaterThan(0);
		const box = worldBoxOf(outline);
		expect(box.x).toBeCloseTo(150 - width / 2);
		expect(box.y).toBeCloseTo(-height / 2);
		expect(box.width).toBeCloseTo(width);
		expect(box.height).toBeCloseTo(height);
	});

	it("stays drawn in the editor at a zoom too small to read the label, as the editor does", () => {
		expect(
			renderPartOutlines(
				connectorWith({ text: "Yes" }),
				selectionOf(["c1"], connectorLabelPartSelection()),
				0.01,
				{ text: "Yes" },
			),
		).toHaveLength(1);
	});
});
