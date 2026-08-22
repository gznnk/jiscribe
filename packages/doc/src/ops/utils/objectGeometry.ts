import { calcPolyBoundingBox, type Point, type Rect } from "@jiscribe/geometry";

import { type ObjectRecord } from "./objectAccess";
import { ConnectorFeatures } from "../../model/objects/connector/ConnectorDoc";
import type { GeometryType } from "../../model/objects/types/GeometryType";
import { isRichText } from "../../model/objects/types/RichText";
import { resolveTextSlotStyle } from "../../model/objects/types/TextSlot";
import type { ObjectDocDefinition } from "../../plugin/ObjectDocDefinition";
import { extractTextSlotStyleDefaults } from "../../plugin/ObjectTextStyleDefaultsRegistry";
import { supportsAutoHeight } from "../../plugin/supportsAutoHeight";
import { calcAutoShapeHeight } from "../../text/block/calcAutoShapeHeight";
import type { TextMeasureFont } from "../../text/measure/TextMeasureFont";
import { readTextWidthBackendGeneration } from "../../text/measure/textWidthMeasurer";
import { DEFAULT_FONT_FAMILY } from "../../text/style/fontFamilies";
import { BODY_TEXT_SLOT_ID } from "../../text/style/textSlotId";
import { TEXT_STYLE_FALLBACK } from "../../text/style/textStyleFallback";
import { DocOperationError } from "../errors";

/** Type table every geometry helper resolves `features.geometry` through. */
export type DocDefinitions = ReadonlyMap<string, ObjectDocDefinition>;

/**
 * True for a connector, whose `points` are the route's waypoints rather than its own
 * shape and whose endpoints follow the objects it joins. Placement ops refuse it.
 */
export const isConnectorObject = (object: ObjectRecord): boolean =>
	object.type === ConnectorFeatures.type;

const geometryOf = (
	object: ObjectRecord,
	definitions: DocDefinitions,
): GeometryType | undefined => definitions.get(object.type)?.features.geometry;

const readNumber = (value: unknown): number =>
	typeof value === "number" && Number.isFinite(value) ? value : 0;

const readPoints = (value: unknown): Point[] =>
	Array.isArray(value) ? (value as Point[]) : [];

/**
 * Font the body of `object` is measured with: the type's own body defaults
 * resolved into whatever the object states itself, and the shared last resort
 * for whatever neither sets. A separate resolution from the canvas's
 * `resolveTextObjectFont` because that one reads a state's slot and this one
 * reads the flat fields a `text: "body"` doc spells its styling out in; the two
 * fill in the same fallbacks and must keep doing so.
 */
const resolveBodyFont = (
	object: ObjectRecord,
	definition: ObjectDocDefinition,
): TextMeasureFont => {
	const style = resolveTextSlotStyle(
		extractTextSlotStyleDefaults(definition.features, definition.defaults)?.[
			BODY_TEXT_SLOT_ID
		],
		{
			fontSize:
				typeof object.fontSize === "number" ? object.fontSize : undefined,
			fontFamily:
				typeof object.fontFamily === "string" ? object.fontFamily : undefined,
			fontWeight:
				typeof object.fontWeight === "string" ? object.fontWeight : undefined,
			fontStyle:
				typeof object.fontStyle === "string" ? object.fontStyle : undefined,
		},
	);
	return {
		fontSize: style.fontSize ?? TEXT_STYLE_FALLBACK.fontSize,
		fontFamily: style.fontFamily ?? DEFAULT_FONT_FAMILY,
		fontWeight: style.fontWeight ?? TEXT_STYLE_FALLBACK.fontWeight,
		fontStyle: style.fontStyle,
	};
};

/**
 * Fields of an object that cannot move its derived height, so that changing one
 * does not throw the derivation away ({@link calcDerivationInputs}). Its position
 * is the whole list: the region a type declares is in the shape's own
 * coordinates, taken from its size and the fields its outline reads, and an op
 * that only moves the object leaves every one of those alone.
 */
const POSITION_FIELDS: ReadonlySet<string> = new Set(["x", "y"]);

/**
 * Everything about `object` the derivation reads, as one string to compare
 * against the string a cached height was derived under. Every field but its
 * position goes in, rather than the handful the shipped types happen to read:
 * `textRegion` takes the whole doc, so a type may read any field it declares,
 * and a field left out here would hand back a height derived before it changed.
 */
const calcDerivationInputs = (object: ObjectRecord): string =>
	JSON.stringify(
		Object.keys(object)
			.filter((field) => !POSITION_FIELDS.has(field))
			.sort()
			.map((field) => [field, object[field]]),
	);

/**
 * The last height derived for an object, kept against the object itself: the
 * ops mutate the objects they are given in place, so the identity that survives
 * an op is the identity to cache against. Module-level and weak, so an entry
 * lives exactly as long as the document holding the object and no doc has to be
 * closed for it to go.
 *
 * An entry is used only where every input it was derived under still reads the
 * same — the object's own fields, the type's definition, and the measurement
 * backend — since any of them moving moves the answer.
 */
const derivedHeightCache = new WeakMap<
	ObjectRecord,
	{
		definition: ObjectDocDefinition;
		backendGeneration: number;
		inputs: string;
		height: number;
	}
>();

/**
 * Height of a rect-geometry object: the one the document states, or — for an
 * object that states none, which is how the format spells "size this from the
 * text" (`supportsAutoHeight`) — the one its text needs
 * ({@link calcAutoShapeHeight}). The derived height is a function of the text,
 * the width and the styling, any of which the op about to run may just have
 * changed, so it is re-derived whenever any of them reads differently and only
 * then ({@link derivedHeightCache}) — which is what stops a batch op from
 * measuring the same untouched object once per pass.
 *
 * A derivation that cannot answer — an unknown type, a type whose height is not
 * the text's to decide, or a text that fits at no height at all — reads as 0,
 * which is what a missing number read as before auto height existed.
 */
const readObjectHeight = (
	object: ObjectRecord,
	definitions: DocDefinitions,
): number => {
	if (object.height !== undefined) {
		return readNumber(object.height);
	}
	const definition = definitions.get(object.type);
	if (definition?.textRegion === undefined || !supportsAutoHeight(definition)) {
		return 0;
	}
	const backendGeneration = readTextWidthBackendGeneration();
	const inputs = calcDerivationInputs(object);
	const cached = derivedHeightCache.get(object);
	if (
		cached !== undefined &&
		cached.definition === definition &&
		cached.backendGeneration === backendGeneration &&
		cached.inputs === inputs
	) {
		return cached.height;
	}
	const height =
		calcAutoShapeHeight(
			{ ...object, width: readNumber(object.width), height: 0 },
			isRichText(object.text) ? object.text : "",
			resolveBodyFont(object, definition),
			definition.textRegion,
		) ?? 0;
	derivedHeightCache.set(object, {
		definition,
		backendGeneration,
		inputs,
		height,
	});
	return height;
};

export const readChildren = (object: ObjectRecord): ObjectRecord[] =>
	Array.isArray(object.children) ? (object.children as ObjectRecord[]) : [];

/** Smallest box containing all of `boxes`, or null when there are none. */
export const unionBounds = (boxes: readonly Rect[]): Rect | null => {
	if (boxes.length === 0) {
		return null;
	}
	const left = Math.min(...boxes.map((box) => box.x));
	const top = Math.min(...boxes.map((box) => box.y));
	const right = Math.max(...boxes.map((box) => box.x + box.width));
	const bottom = Math.max(...boxes.map((box) => box.y + box.height));
	return { x: left, y: top, width: right - left, height: bottom - top };
};

/**
 * Axis-aligned bounding box of an object in world coordinates, in the same top-left
 * form `addObject` takes. Rotation is ignored: the doc's `rotation` turns the shape
 * around its own centre, and every placement op here works on the untransformed box.
 *
 * A shape that states no `height` is measured at the height its text needs
 * ({@link readObjectHeight}), so it is placed, aligned and distributed by the box it is
 * actually drawn at rather than by a flat one.
 *
 * @param object - Any doc object; a group is measured from its children, which is where
 *   its frame comes from (see GroupDoc)
 * @param definitions - Type table `features.geometry` and, for a stated-no-height shape,
 *   `textRegion` are read from
 * @returns The box, or null for a connector, an empty group, and a type this instance
 *   does not know
 */
export const getObjectBounds = (
	object: ObjectRecord,
	definitions: DocDefinitions,
): Rect | null => {
	if (isConnectorObject(object)) {
		return null;
	}
	switch (geometryOf(object, definitions)) {
		case "rect":
			return {
				x: readNumber(object.x),
				y: readNumber(object.y),
				width: readNumber(object.width),
				height: readObjectHeight(object, definitions),
			};
		case "ellipse": {
			const radiusX = readNumber(object.rx);
			const radiusY = readNumber(object.ry);
			return {
				x: readNumber(object.cx) - radiusX,
				y: readNumber(object.cy) - radiusY,
				width: radiusX * 2,
				height: radiusY * 2,
			};
		}
		case "poly": {
			const box = calcPolyBoundingBox(readPoints(object.points));
			return box === null
				? null
				: {
						x: box.left,
						y: box.top,
						width: box.right - box.left,
						height: box.bottom - box.top,
					};
		}
		case "none":
			return unionBounds(
				readChildren(object).flatMap((child) => {
					const childBounds = getObjectBounds(child, definitions);
					return childBounds === null ? [] : [childBounds];
				}),
			);
		default:
			return null;
	}
};

/**
 * {@link getObjectBounds} that fails instead of returning null.
 *
 * @param object - Object to measure
 * @param definitions - Type table `features.geometry` is read from
 * @returns The bounding box
 * @throws {@link DocOperationError} for a connector, an empty group, or an unknown type
 */
export const requireObjectBounds = (
	object: ObjectRecord,
	definitions: DocDefinitions,
): Rect => {
	const bounds = getObjectBounds(object, definitions);
	if (bounds === null) {
		throw new DocOperationError(
			isConnectorObject(object)
				? `${object.id} is a connector: it follows the objects it joins, so move or resize those instead`
				: `${object.id} ("${object.type}") has no position that can be changed`,
		);
	}
	return bounds;
};

/**
 * Shift an object by a delta, mutating it in place. A group moves with its children,
 * since the group itself stores no frame.
 *
 * @param object - Mutated in place
 * @param deltaX - Px to add to every x coordinate; positive moves right
 * @param deltaY - Px to add to every y coordinate; positive moves down
 * @param definitions - Type table `features.geometry` is read from
 */
export const translateObject = (
	object: ObjectRecord,
	deltaX: number,
	deltaY: number,
	definitions: DocDefinitions,
): void => {
	switch (geometryOf(object, definitions)) {
		case "rect":
			object.x = readNumber(object.x) + deltaX;
			object.y = readNumber(object.y) + deltaY;
			break;
		case "ellipse":
			object.cx = readNumber(object.cx) + deltaX;
			object.cy = readNumber(object.cy) + deltaY;
			break;
		case "poly":
			object.points = readPoints(object.points).map((point) => ({
				x: point.x + deltaX,
				y: point.y + deltaY,
			}));
			break;
		case "none":
			for (const child of readChildren(object)) {
				translateObject(child, deltaX, deltaY, definitions);
			}
			break;
		default:
			break;
	}
};

/**
 * Scale an object about a fixed point, mutating it in place. Only geometry is scaled —
 * stroke width and font size are styling and stay as they are.
 *
 * A shape that states no `height` keeps stating none when `scaleY` is exactly 1, and
 * has the height it was drawn at written in otherwise: the scale is the caller stating
 * a height, and only a width-only change leaves the height to the text.
 *
 * @param object - Mutated in place
 * @param origin - World point that keeps its coordinates; the bounding box's top-left
 *   for a plain resize
 * @param scaleX - Horizontal factor; 1 leaves the width untouched
 * @param scaleY - Vertical factor; 1 leaves the height untouched
 * @param definitions - Type table `features.geometry` is read from
 */
export const scaleObject = (
	object: ObjectRecord,
	origin: Point,
	scaleX: number,
	scaleY: number,
	definitions: DocDefinitions,
): void => {
	const scalePoint = (point: Point): Point => ({
		x: origin.x + (point.x - origin.x) * scaleX,
		y: origin.y + (point.y - origin.y) * scaleY,
	});
	switch (geometryOf(object, definitions)) {
		case "rect": {
			const topLeft = scalePoint({
				x: readNumber(object.x),
				y: readNumber(object.y),
			});
			// Measured before the width moves, so a derived height is the one the text
			// took at the width being scaled away from rather than at the new one.
			const height = readObjectHeight(object, definitions);
			object.x = topLeft.x;
			object.y = topLeft.y;
			object.width = readNumber(object.width) * scaleX;
			// A change that leaves the vertical extent alone leaves a stated-no-height
			// shape stating none: re-wrapping at the new width is what such a shape is
			// for, so a width-only resize must not settle its height.
			if (object.height !== undefined || scaleY !== 1) {
				object.height = height * scaleY;
			}
			break;
		}
		case "ellipse": {
			const center = scalePoint({
				x: readNumber(object.cx),
				y: readNumber(object.cy),
			});
			object.cx = center.x;
			object.cy = center.y;
			object.rx = readNumber(object.rx) * scaleX;
			object.ry = readNumber(object.ry) * scaleY;
			break;
		}
		case "poly":
			object.points = readPoints(object.points).map(scalePoint);
			break;
		case "none":
			for (const child of readChildren(object)) {
				scaleObject(child, origin, scaleX, scaleY, definitions);
			}
			break;
		default:
			break;
	}
};
