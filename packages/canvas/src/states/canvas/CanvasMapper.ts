import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import type { ObjectDoc } from "@jiscribe/doc/model/objects/base/ObjectDoc";
import type { OpaqueObjectDoc } from "@jiscribe/doc/model/objects/base/OpaqueObjectDoc";
import type { GroupDoc } from "@jiscribe/doc/model/objects/primitives/group/GroupDoc";
import type { Point } from "@jiscribe/geometry";

import type { CanvasState } from "./CanvasState";
import type {
	OpaqueObjectLoadedPlace,
	OpaqueObjectPlacement,
} from "./OpaqueObjectPlacement";
import { collectOpaqueDocs } from "./utils/collectOpaqueDocs";
import {
	isSameJsonFieldsExcept,
	isSameJsonValue,
} from "./utils/isSameJsonValue";
import { restoreOpaqueObjects } from "./utils/restoreOpaqueObjects";
import { MetaMapper } from "../objects/base/MetaMapper";
import type { ObjectState } from "../objects/base/ObjectState";
import type { GroupState } from "../objects/primitives/group/GroupState";
import type { ObjectContentResizerRegistry } from "../registry/ObjectContentResizerRegistry";
import type { ObjectMapperRegistry } from "../registry/ObjectMapperRegistry";
import { calculateGroupOrientedBounds } from "../utils/calculateGroupOrientedBounds";

/**
 * Converts CanvasDoc (tree structure) to CanvasState (flat structure).
 * This process normalizes the object tree into a flat map for O(1) access.
 *
 * **Caller's responsibility**: `doc` must be a valid doc that has passed
 * `createCanvasParser` (two-stage validation). This function assumes—without
 * re-checking—that IDs are unique, references are consistent, and the tree is
 * acyclic (the policy of not carrying defensive cost internally →
 * docs/01-design-philosophy.md principle 4). Validation is guaranteed at the
 * external-input boundary (host / the `SYNC_EXTERNAL` entry point). The parser has to
 * know the same plugin set this canvas maps: a type the parser was not given is passed
 * through opaque and unchecked, and if `mapper` carries it anyway, its mapper meets
 * fields no validator has seen.
 *
 * The registries are passed one by one (not as the full bundle) so the states
 * layer stays decoupled from the controller-layer registries; both of these are
 * states-layer registries (docs/02-architecture.md).
 *
 * An object whose type `mapper` does not carry is not mapped: it is held aside
 * in `opaqueObjects` with where it sat, along with the groups and connectors that
 * cannot stand without it ({@link collectOpaqueDocs}), and {@link canvasToDoc}
 * writes it back unchanged. So nothing that reads `objects` meets it — it is not
 * drawn and cannot be selected — and no save loses it.
 *
 * @param doc - A doc that has passed `createCanvasParser` (see above); its tree order becomes the z-order
 * @param mapper - The per-canvas object mapper registry; an object of a type it does not carry is held
 *   as an opaque object rather than mapped
 * @param contentResizer - The per-canvas content-resizer registry; a type registered there has its
 *   box re-derived here from the content it holds. A registry holding nothing leaves every box
 *   exactly as the doc stored it
 */
export const canvasToState = (
	doc: CanvasDoc,
	mapper: ObjectMapperRegistry,
	contentResizer: ObjectContentResizerRegistry,
): CanvasState => buildCanvasState(doc, mapper, contentResizer, null).state;

/**
 * What {@link canvasToStateReusing} may keep instead of rebuilding: the states
 * the canvas holds now, and the document they correspond to.
 */
export type CanvasStateReuseSource = {
	/**
	 * The document `committedObjects` was built from, or converts to
	 * (`canvasToDoc`). Each incoming object is compared with the node of the same
	 * id here.
	 */
	referenceDoc: CanvasDoc;
	/** The objects `referenceDoc` stands for (the present history entry's `source.objects`). */
	committedObjects: Readonly<Record<string, ObjectState>>;
	/**
	 * The objects on screen. Only a state that is still the committed one is
	 * reused; one that moved on since (a drag preview, a re-measure) is rebuilt.
	 */
	liveObjects: Readonly<Record<string, ObjectState>>;
	/**
	 * True when the committed states were measured under an older text
	 * measurement generation than the current one: each reused state then goes
	 * through its content resizer again, as a rebuilt one does.
	 */
	remeasure: boolean;
};

/** What {@link canvasToStateReusing} returns. */
export type ReusingCanvasStateResult = {
	/** The state of the incoming document; equal to what {@link canvasToState} builds. */
	state: CanvasState;
	/**
	 * Whether the incoming document holds the same JSON as `referenceDoc`, key
	 * order aside: nothing to adopt.
	 */
	isSameAsReference: boolean;
};

/**
 * {@link canvasToState} for a new version of the document already on the
 * canvas, keeping every object state the change leaves alone: the per-object
 * caches downstream (memoized renders, connector routes, text layout) hit for
 * those, as they do after an undo.
 *
 * An object keeps its live state when its node equals the reference node of
 * the same id ({@link isSameJsonValue}), it sits under the same parent, and the
 * live state is still the committed one. A group keeps its state only when its
 * own fields match and it keeps every child, in the same order; otherwise it is
 * rebuilt around its children, each judged on its own. Opaque objects are
 * placed afresh, as {@link canvasToState} does. A reused state is never written
 * to.
 *
 * The result equals a rebuild because an equal reference node maps to the
 * state the canvas holds: exactly so when `referenceDoc` is the document the
 * states were built from, and by the mapper round trip
 * (`toState(toDoc(state))` equals `state`) when it was converted from them.
 *
 * @param doc - A doc that has passed `createCanvasParser` (see {@link canvasToState})
 * @param mapper - The per-canvas object mapper registry, the one the reused states were built with
 * @param contentResizer - The per-canvas content-resizer registry
 * @param reuse - The states the canvas holds and the document they stand for
 */
export const canvasToStateReusing = (
	doc: CanvasDoc,
	mapper: ObjectMapperRegistry,
	contentResizer: ObjectContentResizerRegistry,
	reuse: CanvasStateReuseSource,
): ReusingCanvasStateResult =>
	buildCanvasState(doc, mapper, contentResizer, reuse);

/** Ids of a container's members in order, compared with another container's. */
const hasSameIds = (
	leftDocs: readonly ObjectDoc[],
	rightDocs: readonly ObjectDoc[],
): boolean =>
	leftDocs.length === rightDocs.length &&
	leftDocs.every((leftDoc, index) => leftDoc.id === rightDocs[index].id);

const hasSameChildIds = (
	leftIds: readonly string[],
	rightIds: readonly string[],
): boolean =>
	leftIds.length === rightIds.length &&
	leftIds.every((leftId, index) => leftId === rightIds[index]);

/** Every node of the document by id, at every depth, opaque ones included. */
const indexDocNodes = (root: readonly ObjectDoc[]): Map<string, ObjectDoc> => {
	const nodes = new Map<string, ObjectDoc>();
	const visit = (objectDoc: ObjectDoc): void => {
		nodes.set(objectDoc.id, objectDoc);
		if (objectDoc.type === "group") {
			(objectDoc as GroupDoc).children.forEach(visit);
		}
	};
	root.forEach(visit);
	return nodes;
};

/**
 * The one pass behind {@link canvasToState} and {@link canvasToStateReusing}:
 * with `reuse` null every object is mapped, and `isSameAsReference` is false.
 */
const buildCanvasState = (
	doc: CanvasDoc,
	mapper: ObjectMapperRegistry,
	contentResizer: ObjectContentResizerRegistry,
	reuse: CanvasStateReuseSource | null,
): ReusingCanvasStateResult => {
	const objects: Record<string, ObjectState> = {};

	// Memo shared across this single bottom-up pass: group ID → collected child
	// points. Lets a parent group reuse a nested group's points instead of
	// re-traversing its subtree, keeping the whole pass O(N) instead of
	// O(N × nesting depth). See calculateGroupOrientedBounds.
	const groupPointCache = new Map<string, Point[]>();

	const opaqueDocs = collectOpaqueDocs(doc.root, (type) =>
		mapper.hasType(type),
	);
	const opaqueObjects: OpaqueObjectPlacement[] = [];

	const referenceNodes = reuse ? indexDocNodes(reuse.referenceDoc.root) : null;
	// Cleared by the first difference the pass meets. Every node is compared with
	// the reference node of its id, and each container's member ids in order, so
	// a pass that clears nothing has walked two equal trees.
	let isSameAsReference =
		reuse !== null &&
		reuse.referenceDoc.version === doc.version &&
		isSameJsonValue(reuse.referenceDoc.meta, doc.meta) &&
		isSameJsonValue(reuse.referenceDoc.background, doc.background) &&
		isSameJsonValue(reuse.referenceDoc.view, doc.view) &&
		hasSameIds(reuse.referenceDoc.root, doc.root);

	const resizeToContent = (objState: ObjectState): ObjectState => {
		// The registration wraps each resizer with its type's own text-style
		// defaults, so the context this hands over carries nothing of its own.
		const resizer = contentResizer.get(objState.type);
		return resizer ? resizer(objState, {}) : objState;
	};

	// Freshly mapped, so this pass owns it and may write its parent.
	const mapObject = (
		objDoc: ObjectDoc,
		parentId: string | undefined,
	): ObjectState => {
		const objState = resizeToContent(mapper.toState(objDoc));
		objState.parentId = parentId;
		return objState;
	};

	// The live state of `objDoc` when it may stand for the node (see
	// canvasToStateReusing), after the re-measure a stale one needs; undefined
	// when it has to be mapped. Also records whether the node matched.
	const findReusableState = (
		objDoc: ObjectDoc,
		parentId: string | undefined,
	): ObjectState | undefined => {
		if (reuse === null || referenceNodes === null) {
			return undefined;
		}
		const referenceNode = referenceNodes.get(objDoc.id);
		const isGroup = objDoc.type === "group";
		const isSameNode =
			referenceNode !== undefined &&
			(isGroup
				? referenceNode.type === "group" &&
					hasSameIds(
						(referenceNode as GroupDoc).children,
						(objDoc as GroupDoc).children,
					) &&
					isSameJsonFieldsExcept(referenceNode, objDoc, "children")
				: isSameJsonValue(referenceNode, objDoc));
		if (!isSameNode) {
			isSameAsReference = false;
			return undefined;
		}
		const liveState = reuse.liveObjects[objDoc.id];
		if (
			liveState === undefined ||
			liveState !== reuse.committedObjects[objDoc.id] ||
			liveState.parentId !== parentId
		) {
			return undefined;
		}
		return reuse.remeasure ? resizeToContent(liveState) : liveState;
	};

	// Maps one container's children in order, holding the opaque ones aside, and
	// returns the ids of the mapped ones. Places are recorded only where something
	// can use them — an opaque object, or a group that may hold one — and share the
	// container's id list, which is complete by the time anything reads it.
	const processSiblings = (
		siblingDocs: readonly ObjectDoc[],
		parentId: string | undefined,
		outerPlaces: readonly OpaqueObjectLoadedPlace[],
	): string[] => {
		const knownSiblingIds: string[] = [];
		siblingDocs.forEach((siblingDoc) => {
			const isOpaque = opaqueDocs.has(siblingDoc);
			const loadedPlaces =
				opaqueDocs.size > 0 && (isOpaque || siblingDoc.type === "group")
					? [
							{
								parentId,
								knownSiblingIds,
								precedingSiblingCount: knownSiblingIds.length,
							},
							...outerPlaces,
						]
					: outerPlaces;
			if (isOpaque) {
				if (
					isSameAsReference &&
					!isSameJsonValue(referenceNodes?.get(siblingDoc.id), siblingDoc)
				) {
					isSameAsReference = false;
				}
				opaqueObjects.push({
					doc: siblingDoc as OpaqueObjectDoc,
					loadedPlaces,
				});
				return;
			}
			knownSiblingIds.push(processObject(siblingDoc, parentId, loadedPlaces));
		});
		return knownSiblingIds;
	};

	// Recurse over the validated tree. It is finite and cannot encode a
	// parent/child cycle, so no recursion guard is needed; ID uniqueness and
	// reference integrity are the validator's responsibility. Returns the ID.
	const processObject = (
		objDoc: ObjectDoc,
		parentId: string | undefined,
		loadedPlaces: readonly OpaqueObjectLoadedPlace[],
	): string => {
		const reusableState = findReusableState(objDoc, parentId);
		// For a group the slot is taken ahead of its children, so the map lists a
		// group before its members whichever way the group is settled below.
		objects[objDoc.id] = reusableState ?? mapObject(objDoc, parentId);
		if (objDoc.type !== "group") {
			return objDoc.id;
		}

		// State holds children as a flat ID list; the nested Docs are recursed.
		const childIds = processSiblings(
			(objDoc as GroupDoc).children,
			objDoc.id,
			loadedPlaces,
		);

		// Kept whole only while every member is the live one, in the live order:
		// its stored bounds were derived from exactly those.
		const liveGroupState = reusableState as GroupState | undefined;
		if (
			liveGroupState !== undefined &&
			liveGroupState === reuse?.liveObjects[objDoc.id] &&
			hasSameChildIds(liveGroupState.childIds, childIds) &&
			childIds.every(
				(childId) => objects[childId] === reuse.liveObjects[childId],
			)
		) {
			return objDoc.id;
		}

		const groupState = (
			reusableState === undefined
				? objects[objDoc.id]
				: mapObject(objDoc, parentId)
		) as GroupState;
		groupState.childIds = childIds;
		objects[objDoc.id] = groupState;

		const bounds = calculateGroupOrientedBounds(
			objects,
			groupState.id,
			groupPointCache,
		);
		if (bounds) {
			objects[groupState.id] = {
				...groupState,
				cx: bounds.cx,
				cy: bounds.cy,
				width: bounds.width,
				height: bounds.height,
			} as GroupState;
		}

		return objDoc.id;
	};

	// root is a mixed array of objects and connectors, and its order is the
	// z-order as-is. The connector invariant (at least one endpoint is owned)
	// is already guaranteed by checkSemantics at the boundary, so it is not
	// re-checked here.
	const rootIds = processSiblings(doc.root, undefined, []);

	return {
		state: {
			objects,
			rootIds,
			// Set even when absent, so adopting a document without one clears the
			// previous document's (adoptDocumentState spreads this over the old state).
			meta: doc.meta === undefined ? undefined : MetaMapper.toState(doc.meta),
			background: doc.background,
			view: doc.view,
			...(opaqueObjects.length > 0 ? { opaqueObjects } : {}),
		},
		isSameAsReference,
	};
};

/**
 * Converts CanvasState (flat structure) to CanvasDoc (tree structure).
 * This reconstructs the tree for serialization/storage.
 * Only the object map, root order, document meta, surface background, display
 * declaration and opaque objects are read, so any state carrying those fields (e.g. a DocSnapshot
 * source) can be converted. The opaque objects go back where they sat
 * ({@link restoreOpaqueObjects}).
 */
export const canvasToDoc = (
	state: Pick<
		CanvasState,
		"objects" | "rootIds" | "meta" | "background" | "view" | "opaqueObjects"
	>,
	mapper: ObjectMapperRegistry,
): CanvasDoc => {
	// Helper to reconstruct an object tree from an ID.
	// The flat state is always internally consistent (index matches objects,
	// childIds are acyclic), so it carries no defense against missing IDs or
	// cycles.
	const reconstructObject = (id: string): ObjectDoc => {
		const objState = state.objects[id];

		// Each mapper converts only its own properties; child recursion is
		// managed centrally here (docs/02-architecture.md).
		const objDoc = mapper.toDoc(objState);

		if (objState.type === "group") {
			const groupState = objState as GroupState;
			const groupDoc = objDoc as GroupDoc;

			groupDoc.children = groupState.childIds.map((childId) =>
				reconstructObject(childId),
			);
		}

		return objDoc;
	};

	const rootDocs = state.rootIds.map((id) => reconstructObject(id));

	return {
		version: 1,
		// Same rule as background below. Written ahead of `root` so a reader that
		// cuts a long document off still sees what it is called.
		...(state.meta !== undefined ? { meta: MetaMapper.toDoc(state.meta) } : {}),
		// Only emitted when set, so a doc that never had a background round-trips
		// byte-identically (absent = follow theme).
		...(state.background !== undefined ? { background: state.background } : {}),
		// Same rule as background: a doc that never declared a view round-trips
		// byte-identically.
		...(state.view !== undefined ? { view: state.view } : {}),
		// root is a single array mixing objects and connectors in z-order.
		root:
			state.opaqueObjects !== undefined && state.opaqueObjects.length > 0
				? restoreOpaqueObjects(rootDocs, state.opaqueObjects)
				: rootDocs,
	};
};
