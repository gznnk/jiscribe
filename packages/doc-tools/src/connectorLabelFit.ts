import type { ObjectDoc } from "@jiscribe/doc";
import type { TextMeasureFont } from "@jiscribe/doc/unstable";
import { DEFAULT_FONT_FAMILY } from "@jiscribe/doc/unstable";
import type { Rect } from "@jiscribe/geometry";
import { standardObjectDocDefinitions } from "@jiscribe/standard-shapes/doc";

import { measureWrappedText } from "./measureWrappedText";

/**
 * Label style the canvas draws with where the document sets none, restated from
 * CONNECTOR_LABEL_DEFAULTS (@jiscribe/canvas,
 * rendering/objects/connector/ConnectorLabel/utils/connectorLabelLayout.ts).
 * Restated rather than imported because that module sits in the rendering layer,
 * which this package stays free of; the family alone has a headless home
 * (DEFAULT_FONT_FAMILY) and is taken from there.
 */
const CONNECTOR_LABEL_FALLBACK = {
	fontSize: 16,
	fontWeight: "normal",
} as const;

/** A connector's label as it sits on the doc (see ConnectorDoc's ConnectorLabel). */
type ConnectorLabelDoc = {
	text: string;
	fontSize?: number;
	fontWeight?: string;
	offset?: number;
};

/** The connector fields this check reads, none of which the base ObjectDoc types. */
type ConnectorFitDoc = ObjectDoc & {
	label?: ConnectorLabelDoc;
	points?: unknown[];
	source?: { owner?: { id?: unknown } };
	target?: { owner?: { id?: unknown } };
};

/** Fields a shape's bounding box is read off, whichever geometry it declares. */
type BoxedShapeDoc = ObjectDoc &
	Partial<Rect> & {
		cx?: number;
		cy?: number;
		rx?: number;
		ry?: number;
		rotation?: number;
	};

/** What {@link calcConnectorLabelFit} answers about one labelled connector. */
export type ConnectorLabelFit = {
	/** The label string, as authored (newlines included). */
	text: string;
	/** Type size the label is drawn at, the renderer's fallback already resolved. */
	fontSize: number;
	/**
	 * Width of the label's glyphs in world units: its longest line. The box drawn
	 * around them is wider by the text padding (TEXT_BOX_PADDING_X a side) and by
	 * any border, but those are background rather than ink, and a shape's own
	 * margin has room for them — so the letters are what this measures.
	 */
	textWidth: number;
	/** Free space between the two shapes on the axis they face across; always above 0. */
	gap: number;
	/** Id of the shape the connector starts at. */
	sourceId: string;
	/** Id of the shape the connector ends at. */
	targetId: string;
};

/** Every object of the document, group children included, keyed by id. */
export const indexObjectsById = (
	objects: readonly ObjectDoc[],
): ReadonlyMap<string, ObjectDoc> =>
	new Map(objects.map((object) => [object.id, object]));

/**
 * Bounding box of a shape in world coordinates, or null where nothing here can
 * state one: a geometry other than the two boxed ones (poly, point, group), a
 * type outside the shipped set, a missing coordinate, or a rotation — whose box
 * is no longer the stored one.
 */
const resolveObjectBox = (object: ObjectDoc): Rect | null => {
	const geometry = standardObjectDocDefinitions.get(object.type)?.features
		.geometry;
	const shape = object as BoxedShapeDoc;
	if (shape.rotation !== undefined && shape.rotation % 360 !== 0) {
		return null;
	}
	if (
		geometry === "rect" &&
		typeof shape.x === "number" &&
		typeof shape.y === "number" &&
		typeof shape.width === "number" &&
		typeof shape.height === "number"
	) {
		return {
			x: shape.x,
			y: shape.y,
			width: shape.width,
			height: shape.height,
		};
	}
	if (
		geometry === "ellipse" &&
		typeof shape.cx === "number" &&
		typeof shape.cy === "number" &&
		typeof shape.rx === "number" &&
		typeof shape.ry === "number"
	) {
		return {
			x: shape.cx - shape.rx,
			y: shape.cy - shape.ry,
			width: shape.rx * 2,
			height: shape.ry * 2,
		};
	}
	return null;
};

/** Free space between two ranges on one axis; negative by however much they overlap. */
const calcRangeGap = (
	aStart: number,
	aLength: number,
	bStart: number,
	bLength: number,
): number =>
	Math.max(aStart, bStart) - Math.min(aStart + aLength, bStart + bLength);

/**
 * Space between two boxes that stand across from each other on one axis, or null
 * where they do not: one axis must separate them while the other overlaps, which
 * is the arrangement a connector spans with a straight run.
 */
const calcFacingGap = (a: Rect, b: Rect): number | null => {
	const horizontalGap = calcRangeGap(a.x, a.width, b.x, b.width);
	const verticalGap = calcRangeGap(a.y, a.height, b.y, b.height);
	if (horizontalGap > 0 && verticalGap < 0) {
		return horizontalGap;
	}
	if (verticalGap > 0 && horizontalGap < 0) {
		return verticalGap;
	}
	return null;
};

/** A connector's label as it is drawn, which is what any measurement of it needs. */
export type ConnectorLabelText = {
	/** The label string, as authored (newlines included). */
	text: string;
	/** Font the canvas draws it in, the renderer's fallbacks already resolved. */
	font: TextMeasureFont;
};

/**
 * The label a connector is drawn with, or null where there is nothing drawn: an
 * object of another type, no label, or an empty one. The font is resolved here
 * rather than by each caller, so every reading of a label — its width, its line
 * breaks — is taken against the same type the canvas uses.
 *
 * @param connector - The object to look at; anything but a `connector` type answers null
 * @returns The label's text beside the font it is laid out in, the family being the canvas-wide default (a label states no family of its own)
 */
export const resolveConnectorLabel = (
	connector: ObjectDoc,
): ConnectorLabelText | null => {
	if (connector.type !== "connector") {
		return null;
	}
	const { label } = connector as ConnectorFitDoc;
	if (label === undefined || label.text === "") {
		return null;
	}
	return {
		text: label.text,
		font: {
			fontSize: label.fontSize ?? CONNECTOR_LABEL_FALLBACK.fontSize,
			fontFamily: DEFAULT_FONT_FAMILY,
			fontWeight: label.fontWeight ?? CONNECTOR_LABEL_FALLBACK.fontWeight,
		},
	};
};

/**
 * How wide a connector's label is drawn against how much room there is between
 * the two shapes it runs between — the comparison behind the "label drawn over
 * the shapes" diagnosis. The label is laid out as authored (nothing wraps it, so
 * the widest of its lines is its width), which is how the canvas sizes it.
 *
 * Answers null for every arrangement whose drawn path this cannot state, rather
 * than guessing at one: a connector with no label, an endpoint not attached to a
 * shape or attached to one this cannot box, stored waypoints (the route is then
 * the author's), a label pushed off the path by `offset`, and two shapes that do
 * not stand across from each other on an axis — an elbow, a diagonal, a self
 * loop, or one shape overlapping the other.
 *
 * @param connector - The object to look at; anything but a `connector` type answers null
 * @param objectsById - Every object of the document keyed by id, group children included (see {@link indexObjectsById}), which the endpoints are resolved through
 * @returns The measured width beside the free space, both in world units, or null where the arrangement is not one this states an opinion on
 */
export const calcConnectorLabelFit = (
	connector: ObjectDoc,
	objectsById: ReadonlyMap<string, ObjectDoc>,
): ConnectorLabelFit | null => {
	const drawnLabel = resolveConnectorLabel(connector);
	if (drawnLabel === null) {
		return null;
	}
	const { label, points, source, target } = connector as ConnectorFitDoc;
	if (label?.offset !== undefined && label.offset !== 0) {
		return null;
	}
	if (points !== undefined && points.length > 0) {
		return null;
	}
	const sourceId = source?.owner?.id;
	const targetId = target?.owner?.id;
	if (typeof sourceId !== "string" || typeof targetId !== "string") {
		return null;
	}
	const sourceObject = objectsById.get(sourceId);
	const targetObject = objectsById.get(targetId);
	if (sourceObject === undefined || targetObject === undefined) {
		return null;
	}
	const sourceBox = resolveObjectBox(sourceObject);
	const targetBox = resolveObjectBox(targetObject);
	if (sourceBox === null || targetBox === null) {
		return null;
	}
	const gap = calcFacingGap(sourceBox, targetBox);
	if (gap === null) {
		return null;
	}
	return {
		text: drawnLabel.text,
		fontSize: drawnLabel.font.fontSize,
		// Laid out as authored: nothing wraps a label, so its widest line is its width.
		textWidth: measureWrappedText(drawnLabel.text, drawnLabel.font).width,
		gap,
		sourceId,
		targetId,
	};
};
