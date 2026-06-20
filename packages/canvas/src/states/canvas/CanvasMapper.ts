import type { CanvasDoc } from "../../schemas/canvas/CanvasDoc";
import type { ObjectDoc } from "../../schemas/objects/base/ObjectDoc";
import type { ConnectorDoc } from "../../schemas/objects/connections/connector/ConnectorDoc";
import type { GroupDoc } from "../../schemas/objects/primitives/group/GroupDoc";
import type { CanvasState } from "../../states/canvas/CanvasState";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import type { GroupState } from "../objects/primitives/group/GroupState";
import { objectMapperRegistry } from "../registry/ObjectMapperRegistry";
import { calculateGroupOrientedBounds } from "../utils/calculateGroupOrientedBounds";

/**
 * Converts CanvasDoc (tree structure) to CanvasState (flat structure).
 * This process normalizes the object tree into a flat map for O(1) access.
 */
export const canvasToState = (doc: CanvasDoc): CanvasState => {
	const objects: Record<string, ObjectState> = {};
	const rootIds: string[] = [];

	// Helper to process an object and its children recursively.
	// Input is a validated CanvasDoc (a nested tree); since the tree is finite
	// and cannot encode a parent/child cycle, no recursion guard is needed here.
	// ID uniqueness / reference integrity are the validator's responsibility.
	const processObject = (objDoc: ObjectDoc, parentId?: string): string => {
		// Returns the ID of the processed object
		// 1. Convert the object itself using the registry
		const objState = objectMapperRegistry.toState(objDoc);

		// 2. Set the parent ID (normalization)
		objState.parentId = parentId;

		// 3. Register to the flat map
		objects[objState.id] = objState;

		// 4. If it's a group, process its children recursively
		if (objState.type === "group") {
			const groupDoc = objDoc as GroupDoc;
			const groupState = objState as GroupState;

			// Map children Docs to IDs, processing each child
			groupState.childIds = groupDoc.children.map((childDoc) =>
				processObject(childDoc, groupState.id),
			);

			// Calculate and cache the group's bounding frame
			const bounds = calculateGroupOrientedBounds(objects, groupState.id);
			if (bounds) {
				objects[groupState.id] = {
					...groupState,
					cx: bounds.cx,
					cy: bounds.cy,
					width: bounds.width,
					height: bounds.height,
				} as GroupState;
			}
		}

		return objState.id;
	};

	// Process root objects.
	// root はオブジェクトとコネクターの混在配列で、並び順がそのまま z-order になる。
	doc.root.forEach((objDoc) => {
		// コネクターの不変条件: source / target の少なくとも一方が owned であること。
		// 両端 free（owner なし）のコネクターは ink（polyline）相当であり connector としては
		// 不正なので load 時に破棄する。canvasToState は load / init / undo / redo の単一経路
		// なので、ここで担保すれば全経路で free-free が state に入らないことを保証できる。
		if (objDoc.type === "connector") {
			const connDoc = objDoc as ConnectorDoc;
			if (!connDoc.source?.owner && !connDoc.target?.owner) {
				console.warn(
					`[canvasToState] Discarding free-free connector "${connDoc.id}" (both endpoints are free).`,
				);
				return;
			}
		}
		const id = processObject(objDoc);
		rootIds.push(id);
	});

	return {
		objects,
		rootIds,
		viewport: {
			minX: 0,
			minY: 0,
			width: 1000,
			height: 800,
			zoom: 1,
		},
	};
};

/**
 * Converts CanvasState (flat structure) to CanvasDoc (tree structure).
 * This reconstructs the tree for serialization/storage.
 */
export const canvasToDoc = (state: CanvasState): CanvasDoc => {
	// Helper to reconstruct an object tree from an ID.
	// `ancestorIds` tracks the IDs on the current recursion path so a circular
	// `childIds` graph in the flat state cannot cause an infinite recursion.
	// 未発見 ID は throw せず null を返してスキップする。flat state の index
	// （rootIds / connectorIds / childIds）が state.objects と食い違っても、
	// 描画・保存経路を巻き込んでクラッシュさせず、欠落のみ warn で通知する。
	const reconstructObject = (
		id: string,
		ancestorIds: Set<string> = new Set(),
	): ObjectDoc | null => {
		const objState = state.objects[id];
		if (!objState) {
			console.warn(
				`[canvasToDoc] Object with ID "${id}" not found in state; skipping`,
			);
			return null;
		}

		// 1. Convert the state back to doc using the registry
		// Note: The individual mappers (e.g. GroupMapper) currently expect
		// to handle children mapping. We need to handle that carefully.
		// Since we modified GroupMapper to interact with children logic,
		// we likely need the GroupMapper to be "dumb" about children content
		// or handle it here.

		// Let's use the registry component. The individual mappers *should*
		// ideally return a Doc with empty children first, which we then populate.
		// However, standard mappers might try to access state.children.
		// Let's look at GroupMapper's `toDoc`.

		/*
		 * Current GroupMapper.toDoc structure assumption:
		 * return { ...base, children: state.children.map(child => ...) }
		 *
		 * But state.children is now string[].
		 * The GroupMapper needs to be updated to NOT map children recursively,
		 * or we need to pass a special context.
		 *
		 * Strategy: Modify GroupMapper (and others) to ONLY map their own properties.
		 * Structure creation happens here (or via a recursive call in mapper if passed context).
		 *
		 * Better Strategy for Perf:
		 * Handle recursion here centrally.
		 */

		const objDoc = objectMapperRegistry.toDoc(objState);

		if (objState.type === "group") {
			const groupState = objState as GroupState;
			const groupDoc = objDoc as GroupDoc;

			const childAncestorIds = new Set(ancestorIds).add(id);

			// Reconstruct children recursively
			groupDoc.children = groupState.childIds.flatMap((childId) => {
				if (ancestorIds.has(childId) || childId === id) {
					console.warn(
						`[canvasToDoc] Circular reference detected at "${childId}"; skipping`,
					);
					return [];
				}
				const childDoc = reconstructObject(childId, childAncestorIds);
				return childDoc ? [childDoc] : [];
			});
		}

		return objDoc;
	};

	return {
		version: 1,
		// root はオブジェクトとコネクターを z-order 順に混在させた単一配列。
		root: state.rootIds.flatMap((id) => {
			const objDoc = reconstructObject(id);
			return objDoc ? [objDoc] : [];
		}),
	};
};
