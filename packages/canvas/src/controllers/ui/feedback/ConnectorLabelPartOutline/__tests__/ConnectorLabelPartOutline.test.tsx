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
import type { CanvasMode } from "../../../../CanvasTypes";
import { connectorLabelPartSelection } from "../../../../selection/__tests__/support/connectorLabelPartSelection";
import { selectionOf } from "../../../../selection/__tests__/support/selectionOf";
import { vertexPartSelection } from "../../../../selection/__tests__/support/vertexPartSelection";
import type { CanvasSelection } from "../../../../selection/CanvasSelection";
import { NORMAL_MODE } from "../../../../utils/normalMode";
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

/** A connector label session open over `c1` with `text` as its draft. */
const labelEditMode = (
	text: string,
	placement?: { position: number; offset: number },
): CanvasMode => ({
	kind: "textEdit",
	draft: { kind: "connectorLabel", text, ...(placement ? { placement } : {}) },
});

/** Renders the connector's controls under `selection` and returns the part outlines drawn. */
const renderPartOutlines = (
	connector: ConnectorState,
	selection: CanvasSelection,
	zoom = 1,
	mode: CanvasMode = NORMAL_MODE,
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
						mode={mode}
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
		expect(Number(outline.getAttribute("x"))).toBeCloseTo(50 - width / 2);
		expect(Number(outline.getAttribute("y"))).toBeCloseTo(10 - height / 2);
		expect(Number(outline.getAttribute("width"))).toBeCloseTo(width);
		expect(Number(outline.getAttribute("height"))).toBeCloseTo(height);
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

	it("follows the draft while the label is open in the editor: its text, at the label's own placement", () => {
		const label = { text: "Yes", position: 0.25, offset: 10 };
		const outlines = renderPartOutlines(
			connectorWith(label),
			selectionOf(["c1"], connectorLabelPartSelection()),
			1,
			labelEditMode("Yes, and more"),
		);
		const { width, height } = resolveConnectorLabelBox({
			...label,
			text: "Yes, and more",
		});

		expect(outlines).toHaveLength(1);
		const [outline] = outlines;
		expect(Number(outline.getAttribute("x"))).toBeCloseTo(50 - width / 2);
		expect(Number(outline.getAttribute("y"))).toBeCloseTo(10 - height / 2);
		expect(Number(outline.getAttribute("width"))).toBeCloseTo(width);
		expect(Number(outline.getAttribute("height"))).toBeCloseTo(height);
		expect(outline.style.fill).toBe("none");
	});

	it("outlines the minimum box of a label being created, at its pending placement", () => {
		const outlines = renderPartOutlines(
			connectorWith(undefined),
			selectionOf(["c1"], connectorLabelPartSelection()),
			1,
			labelEditMode("", { position: 0.75, offset: 0 }),
		);
		const { width, height } = resolveConnectorLabelBox({ text: "" });

		expect(outlines).toHaveLength(1);
		const [outline] = outlines;
		expect(width).toBeGreaterThan(0);
		expect(Number(outline.getAttribute("x"))).toBeCloseTo(150 - width / 2);
		expect(Number(outline.getAttribute("y"))).toBeCloseTo(-height / 2);
		expect(Number(outline.getAttribute("width"))).toBeCloseTo(width);
		expect(Number(outline.getAttribute("height"))).toBeCloseTo(height);
	});

	it("stays drawn in the editor at a zoom too small to read the label, as the editor does", () => {
		expect(
			renderPartOutlines(
				connectorWith({ text: "Yes" }),
				selectionOf(["c1"], connectorLabelPartSelection()),
				0.01,
				labelEditMode("Yes"),
			),
		).toHaveLength(1);
	});
});
