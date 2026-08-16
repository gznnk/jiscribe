import type { Rect } from "@jiscribe/geometry";

import type { CanvasDoc } from "../../schemas/canvas/CanvasDoc";
import { DocOperationError } from "../errors";
import { type ObjectRecord, requireObjects } from "../utils/objectAccess";
import {
	type DocDefinitions,
	requireObjectBounds,
	translateObject,
} from "../utils/objectGeometry";

/** Which edge (or midline) of the selection every object is brought to. */
export type AlignEdge =
	"left" | "centerX" | "right" | "top" | "centerY" | "bottom";

/** Axis objects are spread along; the other axis is left alone. */
export type DistributeAxis = "horizontal" | "vertical";

type MeasuredObject = { object: ObjectRecord; bounds: Rect };

/** Measure every id up front, so a call that cannot be carried out changes nothing. */
const measureAll = (
	doc: CanvasDoc,
	ids: readonly string[],
	definitions: DocDefinitions,
	minimumCount: number,
	operation: string,
): MeasuredObject[] => {
	if (ids.length < minimumCount) {
		throw new DocOperationError(
			`${operation} needs at least ${minimumCount} objects, got ${ids.length}`,
		);
	}
	return requireObjects(doc, ids).map(({ object }) => ({
		object,
		bounds: requireObjectBounds(object, definitions),
	}));
};

/** The coordinate on `edge` shared by the whole selection. */
const calcAlignTarget = (
	measured: readonly MeasuredObject[],
	edge: AlignEdge,
): number => {
	const boxes = measured.map(({ bounds }) => bounds);
	switch (edge) {
		case "left":
			return Math.min(...boxes.map((box) => box.x));
		case "right":
			return Math.max(...boxes.map((box) => box.x + box.width));
		case "centerX": {
			const left = Math.min(...boxes.map((box) => box.x));
			const right = Math.max(...boxes.map((box) => box.x + box.width));
			return (left + right) / 2;
		}
		case "top":
			return Math.min(...boxes.map((box) => box.y));
		case "bottom":
			return Math.max(...boxes.map((box) => box.y + box.height));
		case "centerY": {
			const top = Math.min(...boxes.map((box) => box.y));
			const bottom = Math.max(...boxes.map((box) => box.y + box.height));
			return (top + bottom) / 2;
		}
	}
};

/** Where `edge` currently sits on one object. */
const readEdge = (bounds: Rect, edge: AlignEdge): number => {
	switch (edge) {
		case "left":
			return bounds.x;
		case "right":
			return bounds.x + bounds.width;
		case "centerX":
			return bounds.x + bounds.width / 2;
		case "top":
			return bounds.y;
		case "bottom":
			return bounds.y + bounds.height;
		case "centerY":
			return bounds.y + bounds.height / 2;
	}
};

const isHorizontalEdge = (edge: AlignEdge): boolean =>
	edge === "left" || edge === "right" || edge === "centerX";

/**
 * Line objects up on one edge of their combined bounding box, mutating `doc` in place.
 *
 * Only the axis the edge belongs to moves: aligning to "left" changes x and leaves y alone.
 * The selection as a whole stays where it is, because the target is taken from its own
 * extent rather than from any one object.
 *
 * @param doc - Mutated in place
 * @param ids - Ids to align; at least 2, all existing and all positionable
 * @param edge - Edge or midline to line up on
 * @param definitions - Type table `features.geometry` is read from
 * @throws {@link DocOperationError} for fewer than 2 ids, an id that is missing, or one
 *   that has no position of its own (a connector) — before anything is moved
 */
export const alignObjects = (
	doc: CanvasDoc,
	ids: readonly string[],
	edge: AlignEdge,
	definitions: DocDefinitions,
): void => {
	const measured = measureAll(doc, ids, definitions, 2, "align");
	const target = calcAlignTarget(measured, edge);
	const horizontal = isHorizontalEdge(edge);
	for (const { object, bounds } of measured) {
		const delta = target - readEdge(bounds, edge);
		translateObject(
			object,
			horizontal ? delta : 0,
			horizontal ? 0 : delta,
			definitions,
		);
	}
};

/**
 * Spread objects along one axis with equal gaps, mutating `doc` in place.
 *
 * The objects keep the order they are already in along that axis, and the first one never
 * moves. With `spacing` omitted the outermost two stay put and everything between them is
 * spaced evenly — the usual "distribute" — which needs at least 3 objects; with `spacing`
 * given the gaps are set to it and the row grows or shrinks to the right (or downwards).
 *
 * @param doc - Mutated in place
 * @param ids - Ids to spread; all existing and all positionable
 * @param axis - "horizontal" spreads along x and leaves y alone; "vertical" the reverse
 * @param spacing - Gap in px between one object's trailing edge and the next one's leading
 *   edge. Omitted divides the space the selection already occupies; 0 butts them together,
 *   and a negative value overlaps them
 * @param definitions - Type table `features.geometry` is read from
 * @throws {@link DocOperationError} for too few ids (2 with `spacing`, 3 without), an id
 *   that is missing, or one that has no position of its own — before anything is moved
 */
export const distributeObjects = (
	doc: CanvasDoc,
	ids: readonly string[],
	axis: DistributeAxis,
	spacing: number | undefined,
	definitions: DocDefinitions,
): void => {
	const measured = measureAll(
		doc,
		ids,
		definitions,
		spacing === undefined ? 3 : 2,
		"distribute",
	);
	const horizontal = axis === "horizontal";
	const startOf = ({ bounds }: MeasuredObject): number =>
		horizontal ? bounds.x : bounds.y;
	const sizeOf = ({ bounds }: MeasuredObject): number =>
		horizontal ? bounds.width : bounds.height;

	const ordered = [...measured].sort(
		(left, right) => startOf(left) - startOf(right),
	);
	const totalSize = ordered.reduce((sum, entry) => sum + sizeOf(entry), 0);
	const last = ordered[ordered.length - 1];
	const span = startOf(last) + sizeOf(last) - startOf(ordered[0]);
	const gap = spacing ?? (span - totalSize) / (ordered.length - 1);

	let cursor = startOf(ordered[0]);
	for (const entry of ordered) {
		const delta = cursor - startOf(entry);
		translateObject(
			entry.object,
			horizontal ? delta : 0,
			horizontal ? 0 : delta,
			definitions,
		);
		cursor += sizeOf(entry) + gap;
	}
};
