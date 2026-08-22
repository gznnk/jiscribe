import { calcPolyBoundingBox, type Point } from "@jiscribe/geometry";

import { DocOperationError } from "./errors";
import { batchItemError } from "./utils/batchErrors";
import { applyExtraProps, declaresExtraKey } from "./utils/extraFields";
import { generateUniqueId } from "./utils/ids";
import type { ObjectRecord } from "./utils/objectAccess";
import type { DocDefinitions } from "./utils/objectGeometry";
import { requirePolyPoints } from "./utils/polyFields";
import {
	ALL_STYLE_KEYS,
	applyStyle,
	type StyleParams,
} from "./utils/styleFields";
import { applyRotation, requireRotationDegrees } from "./utils/transformFields";
import type { CanvasDoc } from "../model/canvas/CanvasDoc";
import type { ObjectDoc } from "../model/objects/base/ObjectDoc";
import type { TextLayout } from "../model/objects/types/TextLayout";
import type { ObjectDocDefinition } from "../plugin/ObjectDocDefinition";
import { supportsAutoHeight } from "../plugin/supportsAutoHeight";

/**
 * Where and how big the new object is, plus any styling to give it on the spot and any
 * property belonging to the type itself. The styling is the same set
 * {@link import("./style").setStyle} takes, and a property the type has no place for is
 * ignored the same way.
 */
export type AddObjectParams = StyleParams & {
	/** Left edge in px; the bounding box is top-left based, not center based. */
	x: number;
	/** Top edge in px. */
	y: number;
	/**
	 * Bounding-box width in px; omitted falls back to the type's default dimensions.
	 * A point-geometry type (`text`) has no box to size and rejects it, the one exception
	 * being the width a `textLayout: "block"` creation wraps in, which such a type stores.
	 */
	width?: number;
	/**
	 * Bounding-box height in px; omitted falls back to the type's default dimensions, which
	 * is written into the document just the same — `autoHeight` is what leaves a height out.
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
	/**
	 * Create the shape with no `height` in the document, so that its height follows the text
	 * it holds — the state {@link import("./place").setHeightMode} switches an existing shape
	 * into with `"auto"`. Accepted only by a type whose box holds its text
	 * (`supportsAutoHeight`), and never together with `height`, which is the opposite request.
	 * Omitted or false writes a height as ever: the one given, or the type's default.
	 */
	autoHeight?: boolean;
	/**
	 * How the text lays itself out, for a type that offers the choice (`text`): `"block"`
	 * wraps inside `width` and therefore needs one, `"label"` breaks at authored newlines
	 * only. Omitted leaves the type's own default, which is `"label"` for text. Rejected by a
	 * type that declares no layout of its own.
	 */
	textLayout?: TextLayout;
	/**
	 * Properties belonging to the type itself, which no parameter above covers — the
	 * lucide icon's `icon`, the callout's `tail`, the container's `headerHeight`. Only
	 * the names the type declares (`ObjectDocDefinition.extraKeys`) are accepted, and
	 * the value is then checked by the type's own `validateDoc` — so a name the type
	 * does not have and a malformed value are both refused rather than stored. A name
	 * this call already takes as a parameter is refused outright.
	 */
	extraProps?: Readonly<Record<string, unknown>>;
};

/**
 * The names a creation call spells out itself, which {@link AddObjectParams.extraProps} must
 * not shadow. `satisfies` ties the list to the type, so a parameter added above without
 * a line here fails to compile; `id` and `type` are not parameters but decide what the
 * object *is*, and letting `extraProps` write them would corrupt it.
 */
const RESERVED_PROP_KEYS: ReadonlySet<string> = new Set<string>([
	"id",
	"type",
	...([
		"x",
		"y",
		"width",
		"height",
		"text",
		"points",
		"rotation",
		"autoHeight",
		"textLayout",
	] as const satisfies readonly (keyof AddObjectParams)[]),
	...ALL_STYLE_KEYS,
]);

/** One object to create in an {@link addObjects} call. */
export type AddObjectEntry = { type: string } & AddObjectParams;

/**
 * Check the size parameters against what the type can actually store, writing nothing.
 *
 * A point-geometry doc has no width/height field, so honoring one is impossible; silently
 * dropping it would hand the caller an object of a size it never asked for. The block
 * layout is the one configuration such a type does keep a width for — the width its text
 * wraps in ({@link AddObjectParams.textLayout}) — and it stores no height even then.
 */
const requireStorableSize = (
	type: string,
	params: AddObjectParams,
	definition: ObjectDocDefinition,
): void => {
	if (definition.features.geometry !== "point") {
		return;
	}
	const blockWidth =
		params.textLayout === "block" && declaresExtraKey(definition, "width");
	if (
		params.height !== undefined ||
		(params.width !== undefined && !blockWidth)
	) {
		throw new DocOperationError(
			`object type "${type}" sizes itself from its content and takes no width/height`,
		);
	}
};

/** Check that the type can be created with the layout and height mode asked for. */
const requireLayoutSupport = (
	type: string,
	params: AddObjectParams,
	definition: ObjectDocDefinition,
): void => {
	if (
		params.textLayout !== undefined &&
		!declaresExtraKey(definition, "textLayout")
	) {
		throw new DocOperationError(
			`object type "${type}" lays its text out one way only and takes no textLayout`,
		);
	}
	if (params.autoHeight !== true) {
		return;
	}
	if (params.height !== undefined) {
		throw new DocOperationError(
			`object type "${type}" cannot take autoHeight together with a height: a height that follows the text is one the document does not state`,
		);
	}
	if (!supportsAutoHeight(definition)) {
		throw new DocOperationError(
			`object type "${type}" does not lay its text out inside its box, so its height cannot follow the text`,
		);
	}
};

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

	requireStorableSize(type, params, definition);
	requireLayoutSupport(type, params, definition);

	const textOverride = {
		...(params.text !== undefined ? { text: params.text } : {}),
		...(params.textLayout !== undefined
			? { textLayout: params.textLayout }
			: {}),
	};

	let created: ObjectDoc;
	if (definition.features.geometry === "point") {
		// The position goes in as the drawn top-left it already is: this geometry
		// reports no dimensions to offset a center by, and stores no box to offset.
		// A width reaches the factory as one more content field, the geometry having
		// no box parameter to pass it as; the type keeps it only in the layout that
		// wraps in it, and drops it otherwise.
		created = factory.createDoc(
			{ x: params.x, y: params.y },
			{
				...textOverride,
				...(params.width !== undefined ? { width: params.width } : {}),
			},
		);
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

	if (params.autoHeight === true) {
		// A height following the text is spelled as no height at all (setHeightMode
		// "auto"), and the factory has to be given a box to build one, so the field is
		// dropped rather than never written.
		delete (created as ObjectRecord).height;
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
	if (params.extraProps !== undefined) {
		applyExtraProps(
			created as ObjectRecord,
			params.extraProps,
			definition,
			RESERVED_PROP_KEYS,
			type,
		);
	}

	// Last, so it sees the finished object. The parameters above are each checked as
	// they are applied, but `extraProps` is an open door: only the type knows which names it
	// has and what they may hold, and this is where it gets to say so.
	const diagnostics = definition.validateDoc(created as ObjectRecord, type);
	if (diagnostics.length > 0) {
		throw new DocOperationError(
			`cannot create "${type}": ${diagnostics
				.map((diagnostic) => `${diagnostic.path} ${diagnostic.message}`)
				.join("; ")}`,
		);
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
 * @param params - Top-left position and optional size/text/styling/rotation, plus
 *   `extraProps` for the type's own properties; omitted width/height fall back to `calcDimensions`'
 *   default size, which is written into the document unless `autoHeight` asks for a height
 *   that follows the text, and styling the type cannot hold is ignored. `points` supersedes
 *   the position and size outright
 * @param definitions - Type table the factory is looked up in; its keys bound what `type` accepts
 * @returns The id assigned to the new object, `${type}-N` unique across the root tree
 * @throws {@link DocOperationError} for an unknown type, for one without a factory
 *   (group / connector / svg and the like), when width/height are given for a
 *   point-geometry type that cannot store them, when the factory rejects the given size,
 *   when `points` are given to a type not built from vertices or are too few, for a
 *   rotation that is not finite, for a `textLayout` on a type that declares none, for
 *   `autoHeight` on a type whose height cannot follow its text or alongside a `height`,
 *   when `extraProps` carries a name this call already takes as a
 *   parameter or one the type does not declare, or when the finished object fails the
 *   type's own `validateDoc`
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
