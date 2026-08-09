import { calcPolyBoundingBox, type Point } from "@workspace/geometry";

import { DocOperationError } from "./errors";
import { generateUniqueId } from "./ids";
import type { ObjectRecord } from "./objectAccess";
import type { DocDefinitions } from "./objectGeometry";
import { requirePolyPoints } from "./polyFields";
import { applyStyle, type StyleParams } from "./styleFields";
import { applyRotation, requireRotationDegrees } from "./transformFields";
import type { CanvasDoc } from "../schemas/canvas/CanvasDoc";
import type { ObjectDoc } from "../schemas/objects/base/ObjectDoc";

/**
 * Where and how big the new object is, plus any styling to give it on the spot. The
 * styling is the same set {@link import("./setStyle").setStyle} takes, and a property the
 * type has no place for is ignored the same way.
 */
export type AddObjectParams = StyleParams & {
	/** Left edge in px; the bounding box is top-left based, not center based. */
	x: number;
	/** Top edge in px. */
	y: number;
	/** Bounding-box width in px; omitted falls back to the type's default dimensions. */
	width?: number;
	/** Bounding-box height in px; omitted falls back to the type's default dimensions. */
	height?: number;
	/** Body text; omitted leaves whatever text the factory defaults to. */
	text?: string;
	/**
	 * Vertices in world coordinates, replacing the outline the factory would decide (a regular
	 * pentagon for a polygon, a horizontal segment for a polyline). **`x`, `y`, `width` and
	 * `height` are ignored when this is given** — the shape sits and spans where the vertices
	 * put it. Accepted only by a type built from vertices, and at least 2 of them (3 for a
	 * polygon).
	 */
	points?: readonly Point[];
	/**
	 * Clockwise rotation in degrees about the shape's own centre, normalized to [0, 360).
	 * Ignored by a type that has no rotation of its own, the way styling it cannot hold is.
	 */
	rotation?: number;
};

/**
 * Add an object of `type` and return the generated id, mutating `doc` in place.
 *
 * Position is the top-left of the bounding box, sized by the effective width/height.
 * A factory with `createDocFromBounds` uses it — the one uniform entry that maps bounds
 * correctly for both rect-like and ellipse-like shapes — otherwise this falls back to the
 * center-based `createDoc`. The factory's UUID is replaced by a `${type}-N` sequence.
 *
 * @param doc - Mutated in place: the created object is pushed onto `doc.root`
 * @param type - Object type name, which must be a key of `definitions` and carry a factory
 * @param params - Top-left position and optional size/text/styling/rotation; omitted
 *   width/height fall back to `calcDimensions`' default size, and styling the type cannot hold
 *   is ignored. `points` supersedes the position and size outright
 * @param definitions - Type table the factory is looked up in; its keys bound what `type` accepts
 * @returns The id assigned to the new object, `${type}-N` unique across the root tree
 * @throws {@link DocOperationError} for an unknown type, for one without a factory
 *   (group / connector / svg and the like), when the factory rejects the given size, when
 *   `points` are given to a type not built from vertices or are too few, or for a rotation
 *   that is not finite
 */
export const addObject = (
	doc: CanvasDoc,
	type: string,
	params: AddObjectParams,
	definitions: DocDefinitions,
): string => {
	const definition = definitions.get(type);
	if (definition === undefined) {
		throw new DocOperationError(
			`unknown object type "${type}" (known: ${[...definitions.keys()].join(", ")})`,
		);
	}
	const factory = definition.factory;
	if (factory === undefined) {
		const creatableTypes = [...definitions]
			.filter(([, candidate]) => candidate.factory !== undefined)
			.map(([candidateType]) => candidateType);
		throw new DocOperationError(
			`object type "${type}" cannot be created programmatically (creatable: ${creatableTypes.join(", ")})`,
		);
	}

	const points =
		params.points === undefined
			? undefined
			: requirePolyPoints(type, params.points, definition);
	const rotation =
		params.rotation === undefined
			? undefined
			: requireRotationDegrees(params.rotation);

	const dimensions = factory.calcDimensions();
	// Vertices decide the outline, so they also decide the bounds the factory starts from.
	const outline = points === undefined ? null : calcPolyBoundingBox(points);
	const left = outline?.left ?? params.x;
	const top = outline?.top ?? params.y;
	const width =
		outline === null
			? (params.width ?? dimensions.halfWidth * 2)
			: outline.right - outline.left;
	const height =
		outline === null
			? (params.height ?? dimensions.halfHeight * 2)
			: outline.bottom - outline.top;
	const textOverride = params.text !== undefined ? { text: params.text } : {};

	let created: ObjectDoc | null;
	if (factory.createDocFromBounds !== undefined) {
		// minSize 0: programmatic creation has no misdrag to reject the way a drag does.
		created = factory.createDocFromBounds(
			left,
			top,
			left + width,
			top + height,
			textOverride,
			0,
		);
	} else {
		created = factory.createDoc(
			{ x: left + width / 2, y: top + height / 2 },
			{ width, height, ...textOverride },
		);
	}
	if (created === null) {
		throw new DocOperationError(
			`object type "${type}" could not be created at size ${width}x${height}`,
		);
	}

	created.id = generateUniqueId(doc, type);
	if (points !== undefined) {
		(created as ObjectRecord).points = points;
	}
	// After the factory, so an explicit colour wins over the type's own defaults.
	applyStyle(created as ObjectRecord, params, definition);
	if (rotation !== undefined) {
		applyRotation(created as ObjectRecord, rotation, definition);
	}
	doc.root.push(created);
	return created.id;
};
