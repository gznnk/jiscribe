/**
 * Diagram-building DSL for scenario specs.
 *
 * Adds no new primitives: it only composes operations CanvasDriver already
 * provides and that have their own specs (drawShape / setColor / typeTextAt /
 * commitText / selectAt / createConnector), so meaningful artifacts —
 * wireframes, architecture diagrams, screen-flow diagrams — can be assembled
 * out of them.
 */

import type { CanvasDriver } from "../../support/CanvasDriver";
import type {
	AnchorId,
	ColorSectionId,
	ToolTitle,
} from "../../support/selectors";

/** Rectangular region as top-left origin plus size (screen coordinates = document coordinates) */
export type Rect = { x: number; y: number; width: number; height: number };

/**
 * Center of a Rect: the point clicks and text editing are aimed at.
 *
 * @param rect region in content coordinates
 */
export const center = (rect: Rect) => ({
	x: rect.x + rect.width / 2,
	y: rect.y + rect.height / 2,
});

/** Convert to the diagonal pair drawShape takes (from = top-left, to = bottom-right) */
const corners = (rect: Rect) => ({
	from: { x: rect.x, y: rect.y },
	to: { x: rect.x + rect.width, y: rect.y + rect.height },
});

/**
 * Draw a shape, optionally set its fill, then type a label and commit it.
 *
 * @param canvas driver for the canvas under test
 * @param options.tool title of the toolbar tool to draw with
 * @param options.rect region to draw into, in content coordinates
 * @param options.label text typed into the shape and committed
 * @param options.fill background color applied right after drawing; left at the default when omitted
 * @returns data-id of the new shape
 */
export async function placeLabeledShape(
	canvas: CanvasDriver,
	options: { tool: ToolTitle; rect: Rect; label: string; fill?: string },
): Promise<string> {
	const { from, to } = corners(options.rect);
	const shapeId = await canvas.drawShape(options.tool, from, to);

	// Right after drawShape the shape is selected and the ObjectMenu is open, so fill it while it is.
	if (options.fill) {
		await canvas.setColor("bg-color" satisfies ColorSectionId, options.fill);
	}

	// Close the ObjectMenu first so it cannot cover the shape and block text editing
	// (see e2e/README.md, "Gotchas" 3).
	await canvas.deselect();
	await canvas.typeTextAt(center(options.rect), options.label);
	await canvas.commitText();

	return shapeId;
}

/** Midpoint of the target edge directly facing the given source anchor (the connector's drop point) */
const facingEdgePoint = (target: Rect, sourceAnchor: AnchorId) => {
	switch (sourceAnchor) {
		case "rightCenter":
			return { x: target.x, y: target.y + target.height / 2 };
		case "leftCenter":
			return { x: target.x + target.width, y: target.y + target.height / 2 };
		case "bottomCenter":
			return { x: target.x + target.width / 2, y: target.y };
		case "topCenter":
			return { x: target.x + target.width / 2, y: target.y + target.height };
	}
};

/**
 * Draw a connector from an edge anchor of the source shape to the target shape.
 *
 * @param canvas driver for the canvas under test
 * @param source region of the shape the connector starts from; it gets selected first
 * @param sourceAnchor edge anchor on source the creation drag starts from
 * @param target region to drop onto; the drop point is the midpoint of its facing edge
 * @returns data-id of the new connector
 */
export async function connectShapes(
	canvas: CanvasDriver,
	source: Rect,
	sourceAnchor: AnchorId,
	target: Rect,
): Promise<string> {
	await canvas.selectAt(center(source));
	return canvas.createConnector(
		sourceAnchor,
		facingEdgePoint(target, sourceAnchor),
	);
}
