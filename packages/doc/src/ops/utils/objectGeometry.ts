import { calcPolyBoundingBox, type Point, type Rect } from "@jiscribe/geometry";

import { type ObjectRecord } from "./objectAccess";
import { ConnectorFeatures } from "../../model/objects/connector/ConnectorDoc";
import type { GeometryType } from "../../model/objects/types/GeometryType";
import type { ObjectDocDefinition } from "../../plugin/ObjectDocDefinition";
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
 * @param object - Any doc object; a group is measured from its children, which is where
 *   its frame comes from (see GroupDoc)
 * @param definitions - Type table `features.geometry` is read from
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
				height: readNumber(object.height),
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
			object.x = topLeft.x;
			object.y = topLeft.y;
			object.width = readNumber(object.width) * scaleX;
			object.height = readNumber(object.height) * scaleY;
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
