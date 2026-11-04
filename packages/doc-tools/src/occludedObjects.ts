import type {
	CanvasDoc,
	ObjectDoc,
	ObjectDocDefinition,
	ObjectShapeStyleDefaults,
	ObjectSummary,
} from "@jiscribe/doc";
import {
	createDocOps,
	extractShapeStyleDefaults,
	isRichText,
	isSingleBodyText,
	richTextToPlain,
} from "@jiscribe/doc";
import {
	BODY_TEXT_SLOT_ID,
	SHAPE_STYLE_FALLBACK,
} from "@jiscribe/doc/unstable";
import type { BoundingBox, Ellipse, Point } from "@jiscribe/geometry";
import { convertRectToBoundingBox } from "@jiscribe/geometry";
import {
	standardDocPlugins,
	standardObjectDocDefinitions,
} from "@jiscribe/standard-shapes/doc";

import type { Diagnostic } from "./Diagnostic";
import { isOpaqueDocColor } from "./isOpaqueDocColor";
import { offerNodeTextMeasurement } from "./measureWrappedText";

/**
 * The shipped types whose fill can hide what is drawn before them: each meets
 * all three of
 *
 * - `features.fill` is true;
 * - its rendering definition declares no `outline`, so the drawn silhouette is
 *   the bounding box itself (an ellipse's, the inscribed ellipse);
 * - its renderer lays that one fill over the whole of the silhouette (a record's
 *   compartments tile the box, a table and an entity paint a body under their
 *   cells, a container's body runs under its header).
 *
 * The silhouette lives on the rendering side (`ObjectTypeDefinition.outline`),
 * which this package cannot see, so the list is kept here by hand; a test holds
 * every entry to the shipped set and to `features.fill`. Package-internal.
 */
export const BOX_FILLING_TYPES: ReadonlySet<string> = new Set([
	"rect",
	"ellipse",
	"container",
	"sticky",
	"markdown",
	"record",
	"umlComponent",
	"table",
	"erEntity",
	"awsGroup",
]);

/**
 * The doc-ops whose `listObjects` supplies the boxes compared here — the same
 * boxes every placement op works off, a height left out included. An instance
 * of its own: `./canvas-tools`' would pull `@jiscribe/ai-tools` into every
 * diagnosis.
 */
const occlusionDocOps = createDocOps({ plugins: standardDocPlugins });

/** A type's own shape-style defaults, read once per definition. */
const shapeStyleDefaultsByDefinition = new Map<
	ObjectDocDefinition,
	ObjectShapeStyleDefaults | undefined
>();

const readShapeStyleDefaults = (
	definition: ObjectDocDefinition,
): ObjectShapeStyleDefaults | undefined => {
	if (!shapeStyleDefaultsByDefinition.has(definition)) {
		shapeStyleDefaultsByDefinition.set(
			definition,
			extractShapeStyleDefaults(definition.features, definition.defaults),
		);
	}
	return shapeStyleDefaultsByDefinition.get(definition);
};

/** The shape-style fields read here, with the type their value has. */
type ShapeStyleNumberField =
	"fillOpacity" | "strokeOpacity" | "strokeWidth" | "rx";
type ShapeStyleStringField = "fill" | "stroke" | "startArrow" | "endArrow";

/**
 * A shape-style field as it is drawn: the object's own, over its type's
 * default, over the shared last resort — the chain the renderers resolve
 * through (`resolveShapeStyle`). A value of the wrong type on the object reads
 * as unset.
 */
const resolveShapeStyleNumber = (
	object: ObjectDoc,
	definition: ObjectDocDefinition,
	field: ShapeStyleNumberField,
): number => {
	const own = (object as Record<string, unknown>)[field];
	return typeof own === "number"
		? own
		: (readShapeStyleDefaults(definition)?.[field] ??
				SHAPE_STYLE_FALLBACK[field]);
};

/** {@link resolveShapeStyleNumber} for the fields holding a string. */
const resolveShapeStyleString = (
	object: ObjectDoc,
	definition: ObjectDocDefinition,
	field: ShapeStyleStringField,
): string => {
	const own = (object as Record<string, unknown>)[field];
	return typeof own === "string"
		? own
		: (readShapeStyleDefaults(definition)?.[field] ??
				SHAPE_STYLE_FALLBACK[field]);
};

/** What a box-filling shape paints over, in world coordinates. */
type FilledSilhouette = {
	/** The bounding box the fill is laid in. */
	box: BoundingBox;
	/** Whether the fill takes the box itself or the ellipse inscribed in it. */
	outline: "rect" | "ellipse";
	/** Corner radius as stored, before SVG trims it to half of each side; 0 for square corners and for an ellipse. */
	cornerRadius: number;
	/** The resolved fill color, quoted in the finding. */
	fill: string;
};

/** One object taking part in the comparison. */
type OcclusionCandidate = {
	/** Position in drawing order: a higher one is drawn over a lower one. */
	drawIndex: number;
	object: ObjectDoc;
	/** Union of the two boxes below, which is what the sweep sorts and stops on. */
	extent: BoundingBox;
	/** What its fill hides, or null for one that cannot hide anything. */
	silhouette: FilledSilhouette | null;
	/** Everything it draws, its stroke included, or null for one that cannot be hidden. */
	drawnRange: BoundingBox | null;
};

const isFiniteBox = (box: BoundingBox): boolean =>
	Number.isFinite(box.left) &&
	Number.isFinite(box.top) &&
	Number.isFinite(box.right) &&
	Number.isFinite(box.bottom);

/** The fill an object lays over its whole box, or null where it lays none that hides. */
const resolveFilledSilhouette = (
	object: ObjectDoc,
	definition: ObjectDocDefinition,
	box: BoundingBox,
): FilledSilhouette | null => {
	if (
		!BOX_FILLING_TYPES.has(object.type) ||
		definition.features.fill !== true ||
		box.right - box.left <= 0 ||
		box.bottom - box.top <= 0
	) {
		return null;
	}
	const fill = resolveShapeStyleString(object, definition, "fill");
	if (
		!isOpaqueDocColor(fill) ||
		resolveShapeStyleNumber(object, definition, "fillOpacity") < 1
	) {
		return null;
	}
	const isEllipse = definition.features.geometry === "ellipse";
	return {
		box,
		outline: isEllipse ? "ellipse" : "rect",
		cornerRadius:
			!isEllipse && definition.features.radius === true
				? Math.max(0, resolveShapeStyleNumber(object, definition, "rx"))
				: 0,
		fill,
	};
};

/**
 * Whether the object draws something past its box that a fill over the box
 * leaves showing: a body label its type hangs outside the box (`textRegion`
 * answering null, or a type declaring none), or an arrowhead on a line.
 */
const drawsPastItsBox = (
	object: ObjectDoc,
	definition: ObjectDocDefinition,
	box: BoundingBox,
): boolean => {
	const { features } = definition;
	if (features.geometry === "poly" && features.arrow === true) {
		const hasArrowHead = (["startArrow", "endArrow"] as const).some(
			(field) => resolveShapeStyleString(object, definition, field) !== "None",
		);
		if (hasArrowHead) {
			return true;
		}
	}
	// A slotted type's `text` is a map of its slots, laid out inside the box.
	if (!isSingleBodyText(features.text)) {
		return false;
	}
	const text = (object as { text?: unknown }).text;
	if (!isRichText(text) || richTextToPlain(text) === "") {
		return false;
	}
	const region =
		definition.textRegion?.(
			{
				...object,
				width: box.right - box.left,
				height: box.bottom - box.top,
			},
			BODY_TEXT_SLOT_ID,
		) ?? null;
	return region === null;
};

/**
 * The types that draw nothing but their fill, their stroke and their body text,
 * so that with all three empty nothing is drawn at all. Every other type draws
 * something of its own besides (a sticky's shadow, a container's header band,
 * an icon's art).
 */
const PAINT_ONLY_TYPES: ReadonlySet<string> = new Set([
	"rect",
	"ellipse",
	"polygon",
	"polyline",
]);

/** Whether a paint leaves nothing on the canvas: the `transparent` keyword, or an opacity of 0. */
const isInvisiblePaint = (color: string, opacity: number): boolean =>
	color.trim().toLowerCase() === "transparent" || opacity <= 0;

/**
 * Whether the object draws nothing at all — an invisible anchor or hit area —
 * which leaves nothing for a cover to hide.
 */
const drawsNothing = (
	object: ObjectDoc,
	definition: ObjectDocDefinition,
): boolean => {
	if (!PAINT_ONLY_TYPES.has(object.type)) {
		return false;
	}
	const { features } = definition;
	const text = (object as { text?: unknown }).text;
	if (isRichText(text) && richTextToPlain(text) !== "") {
		return false;
	}
	const isFillInvisible =
		features.fill !== true ||
		isInvisiblePaint(
			resolveShapeStyleString(object, definition, "fill"),
			resolveShapeStyleNumber(object, definition, "fillOpacity"),
		);
	const isStrokeInvisible =
		features.stroke !== true ||
		resolveShapeStyleNumber(object, definition, "strokeWidth") <= 0 ||
		isInvisiblePaint(
			resolveShapeStyleString(object, definition, "stroke"),
			resolveShapeStyleNumber(object, definition, "strokeOpacity"),
		);
	return isFillInvisible && isStrokeInvisible;
};

/** The box grown by half the object's stroke on every side, for a type that strokes its outline. */
const calcDrawnRange = (
	object: ObjectDoc,
	definition: ObjectDocDefinition,
	box: BoundingBox,
): BoundingBox => {
	if (definition.features.stroke !== true) {
		return box;
	}
	const halfStroke =
		Math.max(0, resolveShapeStyleNumber(object, definition, "strokeWidth")) / 2;
	return {
		left: box.left - halfStroke,
		top: box.top - halfStroke,
		right: box.right + halfStroke,
		bottom: box.bottom + halfStroke,
	};
};

const unionBoxes = (first: BoundingBox, second: BoundingBox): BoundingBox => ({
	left: Math.min(first.left, second.left),
	top: Math.min(first.top, second.top),
	right: Math.max(first.right, second.right),
	bottom: Math.max(first.bottom, second.bottom),
});

/**
 * The object as the comparison sees it, or null for one it leaves out on both
 * sides: a connector, a group (its children take part one by one), a type
 * outside the shipped set, a rotated shape, or one with no box.
 */
const toOcclusionCandidate = (
	object: ObjectDoc,
	summary: ObjectSummary,
	drawIndex: number,
): OcclusionCandidate | null => {
	const definition = standardObjectDocDefinitions.get(object.type);
	if (
		definition === undefined ||
		object.type === "connector" ||
		object.type === "group" ||
		summary.bounds === null
	) {
		return null;
	}
	const rotation = (object as { rotation?: unknown }).rotation;
	if (typeof rotation === "number" && rotation % 360 !== 0) {
		return null;
	}
	const box = convertRectToBoundingBox(summary.bounds);
	if (!isFiniteBox(box)) {
		return null;
	}
	const silhouette = resolveFilledSilhouette(object, definition, box);
	const drawnRange =
		drawsPastItsBox(object, definition, box) || drawsNothing(object, definition)
			? null
			: calcDrawnRange(object, definition, box);
	if (silhouette === null && drawnRange === null) {
		return null;
	}
	return {
		drawIndex,
		object,
		extent: drawnRange === null ? box : unionBoxes(box, drawnRange),
		silhouette,
		drawnRange,
	};
};

/** Whether a point lies in the ellipse, its boundary included. */
const isPointInEllipse = (point: Point, ellipse: Ellipse): boolean =>
	((point.x - ellipse.cx) / ellipse.rx) ** 2 +
		((point.y - ellipse.cy) / ellipse.ry) ** 2 <=
	1;

/**
 * Whether a point inside the box is inside the rounded rectangle SVG draws for
 * it: `rx` alone given, `ry` follows it, and each is trimmed to half its side.
 */
const isPointInRoundedBox = (
	point: Point,
	box: BoundingBox,
	cornerRadius: number,
): boolean => {
	const radiusX = Math.min(cornerRadius, (box.right - box.left) / 2);
	const radiusY = Math.min(cornerRadius, (box.bottom - box.top) / 2);
	if (radiusX <= 0 || radiusY <= 0) {
		return true;
	}
	// The centre of the corner arc nearest the point; the point is past an arc
	// only where it is off the straight part of both sides.
	const arcCenterX = Math.min(
		Math.max(point.x, box.left + radiusX),
		box.right - radiusX,
	);
	const arcCenterY = Math.min(
		Math.max(point.y, box.top + radiusY),
		box.bottom - radiusY,
	);
	if (point.x === arcCenterX || point.y === arcCenterY) {
		return true;
	}
	return isPointInEllipse(point, {
		cx: arcCenterX,
		cy: arcCenterY,
		rx: radiusX,
		ry: radiusY,
	});
};

/**
 * Whether the range lies wholly inside what the fill covers, edges included.
 * Both shapes are convex, so the range's four corners decide it.
 */
const isRangeUnderSilhouette = (
	range: BoundingBox,
	silhouette: FilledSilhouette,
): boolean => {
	const { box } = silhouette;
	if (
		range.left < box.left ||
		range.top < box.top ||
		range.right > box.right ||
		range.bottom > box.bottom
	) {
		return false;
	}
	const corners: Point[] = [
		{ x: range.left, y: range.top },
		{ x: range.right, y: range.top },
		{ x: range.right, y: range.bottom },
		{ x: range.left, y: range.bottom },
	];
	if (silhouette.outline === "ellipse") {
		const ellipse: Ellipse = {
			cx: (box.left + box.right) / 2,
			cy: (box.top + box.bottom) / 2,
			rx: (box.right - box.left) / 2,
			ry: (box.bottom - box.top) / 2,
		};
		return corners.every((corner) => isPointInEllipse(corner, ellipse));
	}
	return corners.every((corner) =>
		isPointInRoundedBox(corner, box, silhouette.cornerRadius),
	);
};

const describeOcclusion = (
	hidden: ObjectDoc,
	cover: ObjectDoc,
	coverFill: string,
): string =>
	`${hidden.type} ${hidden.id} is hidden: ${cover.type} ${cover.id} is drawn over it and its opaque fill (${coverFill}) covers all of it; bring ${hidden.id} forward with reorder_objects, or make the fill of ${cover.id} transparent with set_style`;

/**
 * The objects nobody can see because a shape drawn after them fills over all of
 * them, each with its finding. Only a whole cover is reported — a partial
 * overlap may well be intended — and only one whose fill can be told opaque
 * from the document alone ({@link isOpaqueDocColor}, `fillOpacity` 1) by a type
 * whose fill takes its whole box ({@link BOX_FILLING_TYPES}).
 *
 * The boxes are the doc-ops' (`listObjects`), rotation ignored, so a rotated
 * shape is left out on both sides. A connector and a group take no part (a
 * group's children do, one by one), and neither does a type outside the shipped
 * set. What a hidden object draws is its box grown by half its stroke; a cover's
 * own stroke is not counted as covering. Left out of the hidden side as well: a
 * shape whose body label hangs outside its box, and a line with an arrowhead,
 * both drawing past what the box says, and a plain shape painting nothing at
 * all, which hiding changes nothing about.
 *
 * Package-internal; {@link import("./diagnoseDoc").diagnoseDoc} interleaves the
 * findings with the rest by object.
 *
 * @param doc - The document, read through the doc-ops for its boxes
 * @param objects - The same document flattened in drawing order (flattenObjects), which `listObjects` matches index for index
 * @returns One warning per hidden object, keyed by the object itself and naming the cover drawn directly over it — the earliest-drawn of those hiding it — when several do
 */
export const diagnoseOccludedObjects = (
	doc: CanvasDoc,
	objects: readonly ObjectDoc[],
): ReadonlyMap<ObjectDoc, Diagnostic> => {
	// A box left to be derived from the text is measured.
	offerNodeTextMeasurement();
	const summaries = occlusionDocOps.listObjects(doc);
	const candidates = objects
		.flatMap((object, drawIndex) => {
			const candidate = toOcclusionCandidate(
				object,
				summaries[drawIndex],
				drawIndex,
			);
			return candidate === null ? [] : [candidate];
		})
		.sort((first, second) => first.extent.left - second.extent.left);

	// The cover found so far for each hidden candidate, with the fill it hides by.
	const coverByHidden = new Map<
		OcclusionCandidate,
		{ cover: OcclusionCandidate; fill: string }
	>();
	const recordIfHidden = (
		over: OcclusionCandidate,
		under: OcclusionCandidate,
	): void => {
		if (
			over.drawIndex <= under.drawIndex ||
			over.silhouette === null ||
			under.drawnRange === null ||
			!isRangeUnderSilhouette(under.drawnRange, over.silhouette)
		) {
			return;
		}
		const known = coverByHidden.get(under);
		if (known === undefined || over.drawIndex < known.cover.drawIndex) {
			coverByHidden.set(under, { cover: over, fill: over.silhouette.fill });
		}
	};
	for (let i = 0; i < candidates.length; i++) {
		const current = candidates[i];
		for (let j = i + 1; j < candidates.length; j++) {
			const other = candidates[j];
			// Sorted by left edge: once one starts strictly past the current one's
			// right edge, so does every one after it. Touching is kept, since a cover
			// may share an edge with what it hides — or be a zero-width line itself.
			if (other.extent.left > current.extent.right) {
				break;
			}
			recordIfHidden(current, other);
			recordIfHidden(other, current);
		}
	}

	return new Map(
		[...coverByHidden].map(([hidden, { cover, fill }]) => [
			hidden.object,
			{
				severity: "warning",
				objectId: hidden.object.id,
				message: describeOcclusion(hidden.object, cover.object, fill),
			},
		]),
	);
};
