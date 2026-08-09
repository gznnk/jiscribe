import { DocOperationError } from "./errors";
import { generateUniqueId } from "./ids";
import type { CanvasDoc } from "../schemas/canvas/CanvasDoc";
import type { ObjectDoc } from "../schemas/objects/base/ObjectDoc";
import type { ObjectDocDefinition } from "../schemas/plugin/ObjectDocDefinition";

export type AddObjectParams = {
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
 * @param params - Top-left position and optional size/text; omitted width/height fall back to
 *   `calcDimensions`' default size
 * @param definitions - Type table the factory is looked up in; its keys bound what `type` accepts
 * @returns The id assigned to the new object, `${type}-N` unique across the root tree
 * @throws {@link DocOperationError} for an unknown type, for one without a factory
 *   (group / connector / svg and the like), when width/height are given for a
 *   point-geometry type that cannot store them, or when the factory rejects the given size
 */
export const addObject = (
	doc: CanvasDoc,
	type: string,
	params: AddObjectParams,
	definitions: ReadonlyMap<string, ObjectDocDefinition>,
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
		const width = params.width ?? dimensions.halfWidth * 2;
		const height = params.height ?? dimensions.halfHeight * 2;

		const sized =
			factory.createDocFromBounds !== undefined
				? // minSize 0: programmatic creation has no misdrag to reject the way a drag does.
					factory.createDocFromBounds(
						params.x,
						params.y,
						params.x + width,
						params.y + height,
						textOverride,
						0,
					)
				: factory.createDoc(
						{ x: params.x + width / 2, y: params.y + height / 2 },
						{ width, height, ...textOverride },
					);
		if (sized === null) {
			throw new DocOperationError(
				`object type "${type}" could not be created at size ${width}x${height}`,
			);
		}
		created = sized;
	}

	created.id = generateUniqueId(doc, type);
	doc.root.push(created);
	return created.id;
};
