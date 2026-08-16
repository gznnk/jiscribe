import { calcPolyBoundingBox, type Point } from "@jiscribe/geometry";

import type { CanvasDoc } from "../../schemas/canvas/CanvasDoc";
import type { ObjectDoc } from "../../schemas/objects/base/ObjectDoc";
import { DocOperationError } from "../errors";
import { batchItemError } from "../utils/batchErrors";
import { generateUniqueId } from "../utils/ids";
import type { ObjectRecord } from "../utils/objectAccess";
import type { DocDefinitions } from "../utils/objectGeometry";
import { requirePolyPoints } from "../utils/polyFields";
import { applyStyle, type StyleParams } from "../utils/styleFields";
import {
	applyRotation,
	requireRotationDegrees,
} from "../utils/transformFields";

/**
 * Where and how big the new object is, plus any styling to give it on the spot. The
 * styling is the same set {@link import("./style").setStyle} takes, and a property the
 * type has no place for is ignored the same way.
 */
export type AddObjectParams = StyleParams & {
	/** Left edge in px; the bounding box is top-left based, not center based. */
	x: number;
	/** Top edge in px. */
	y: number;
	/**
	 * Bounding-box width in px; omitted falls back to the type's default dimensions.
	 * Rejected for point-geometry types (`text`), whose box comes from the content.
	 */
	width?: number;
	/**
	 * Bounding-box height in px; omitted falls back to the type's default dimensions.
	 * Rejected for point-geometry types (`text`), whose box comes from the content.
	 */
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

/** One object to create in an {@link addObjects} call. */
export type AddObjectEntry = { type: string } & AddObjectParams;

/**
 * Build the object `addObject` would push, id included, without touching `doc`.
 *
 * @param reservedIds - Ids already handed out to objects staged but not yet pushed
 */
const buildObject = (
	doc: CanvasDoc,
	type: string,
	params: AddObjectParams,
	definitions: DocDefinitions,
	reservedIds?: ReadonlySet<string>,
): ObjectDoc => {
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

	// A point-geometry doc has no width/height field, so honoring one is impossible;
	// silently dropping it would hand the caller an object of a size it never asked for.
	if (
		definition.features.geometry === "point" &&
		(params.width !== undefined || params.height !== undefined)
	) {
		throw new DocOperationError(
			`object type "${type}" sizes itself from its content and takes no width/height`,
		);
	}

	const textOverride = params.text !== undefined ? { text: params.text } : {};

	let created: ObjectDoc;
	if (definition.features.geometry === "point") {
		// The position goes in as the drawn top-left it already is: this geometry
		// reports no dimensions to offset a center by, and stores no box to offset.
		created = factory.createDoc({ x: params.x, y: params.y }, textOverride);
	} else {
		const sizeOverride = {
			...(params.width !== undefined ? { width: params.width } : {}),
			...(params.height !== undefined ? { height: params.height } : {}),
		};
		const dimensions = factory.calcDimensions({
			...sizeOverride,
			...textOverride,
		});
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

		const sized =
			factory.createDocFromBounds !== undefined
				? // minSize 0: programmatic creation has no misdrag to reject the way a drag does.
					factory.createDocFromBounds(
						left,
						top,
						left + width,
						top + height,
						textOverride,
						0,
					)
				: factory.createDoc(
						{ x: left + width / 2, y: top + height / 2 },
						{ width, height, ...textOverride },
					);
		if (sized === null) {
			throw new DocOperationError(
				`object type "${type}" could not be created at size ${width}x${height}`,
			);
		}
		created = sized;
	}

	created.id = generateUniqueId(doc, type, reservedIds);
	if (points !== undefined) {
		(created as ObjectRecord).points = points;
	}
	// After the factory, so an explicit colour wins over the type's own defaults.
	applyStyle(created as ObjectRecord, params, definition);
	if (rotation !== undefined) {
		applyRotation(created as ObjectRecord, rotation, definition);
	}
	return created;
};

/**
 * Add an object of `type` and return the generated id, mutating `doc` in place.
 *
 * Position is the top-left of the bounding box, sized by the effective width/height.
 * A factory with `createDocFromBounds` uses it — the one uniform entry that maps bounds
 * correctly for both rect-like and ellipse-like shapes — otherwise this falls back to the
 * center-based `createDoc`. Point-geometry types skip the sizing entirely: their
 * `createDoc` already takes the drawn top-left. The factory's UUID is replaced by a
 * `${type}-N` sequence.
 *
 * @param doc - Mutated in place: the created object is pushed onto `doc.root`
 * @param type - Object type name, which must be a key of `definitions` and carry a factory
 * @param params - Top-left position and optional size/text/styling/rotation; omitted
 *   width/height fall back to `calcDimensions`' default size, and styling the type cannot hold
 *   is ignored. `points` supersedes the position and size outright
 * @param definitions - Type table the factory is looked up in; its keys bound what `type` accepts
 * @returns The id assigned to the new object, `${type}-N` unique across the root tree
 * @throws {@link DocOperationError} for an unknown type, for one without a factory
 *   (group / connector / svg and the like), when width/height are given for a
 *   point-geometry type that cannot store them, when the factory rejects the given size,
 *   when `points` are given to a type not built from vertices or are too few, or for a
 *   rotation that is not finite
 */
export const addObject = (
	doc: CanvasDoc,
	type: string,
	params: AddObjectParams,
	definitions: DocDefinitions,
): string => {
	const created = buildObject(doc, type, params, definitions);
	doc.root.push(created);
	return created.id;
};

/**
 * Add several objects in one go and return their ids in the order given, mutating `doc`
 * in place.
 *
 * Each object is created exactly as {@link addObject} would create it. Every one is built
 * before any is pushed, so a call that throws leaves the document untouched — no half-added
 * batch to clean up. Ids are handed out across the whole batch, so two objects of the same
 * type never collide.
 *
 * @param doc - Mutated in place: the created objects are pushed onto `doc.root`, in the
 *   order they appear in `entries`
 * @param entries - What to create, each an `addObject` parameter set carrying its own `type`;
 *   an empty array is a no-op returning an empty array. The same type may repeat freely
 * @param definitions - Type table the factories are looked up in; its keys bound what each
 *   `type` accepts
 * @returns The assigned ids, positionally matching `entries`
 * @throws {@link DocOperationError} for anything {@link addObject} rejects, prefixed with
 *   `entries[i] (<type>)` so the offending element can be told apart
 */
export const addObjects = (
	doc: CanvasDoc,
	entries: readonly AddObjectEntry[],
	definitions: DocDefinitions,
): string[] => {
	const reservedIds = new Set<string>();
	const staged: ObjectDoc[] = [];
	entries.forEach(({ type, ...params }, index) => {
		let created: ObjectDoc;
		try {
			created = buildObject(doc, type, params, definitions, reservedIds);
		} catch (error) {
			throw batchItemError("entries", index, type, error);
		}
		reservedIds.add(created.id);
		staged.push(created);
	});

	doc.root.push(...staged);
	return staged.map((created) => created.id);
};
