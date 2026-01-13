import { objectRegistry } from "../../registry/ObjectRegistry";
import type { CanvasDoc } from "../../schemas/canvas/CanvasDoc";
import type { ObjectDoc } from "../../schemas/objects/base/ObjectDoc";
import type { ConnectorDoc } from "../../schemas/objects/connections/ConnectorDoc";
import type { GroupDoc } from "../../schemas/objects/primitives/GroupDoc";
import type { CanvasState } from "../../states/canvas/CanvasState";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import type { GroupState } from "../../states/objects/primitives/GroupState";

/**
 * Converts CanvasDoc (tree structure) to CanvasState (flat structure).
 * This process normalizes the object tree into a flat map for O(1) access.
 */
export const canvasToState = (doc: CanvasDoc): CanvasState => {
	const objects: Record<string, ObjectState> = {};
	const rootIds: string[] = [];
	const connectorIds: string[] = [];

	// Helper to process an object and its children recursively
	const processObject = (objDoc: ObjectDoc, parentId?: string): string => {
		// Returns the ID of the processed object
		// 1. Convert the object itself using the registry
		const objState = objectRegistry.toState(objDoc);

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
		}

		return objState.id;
	};

	// Process root objects
	doc.root.forEach((objDoc) => {
		const id = processObject(objDoc);
		rootIds.push(id);
	});

	// Process connectors (treated as top-level objects in this schema)
	doc.connectors.forEach((connDoc) => {
		// Connectors might have parentId undefined if they are properly top-level
		// or logic might need adjustment if connectors can be in groups (unlikely in this schema)
		const id = processObject(connDoc);
		connectorIds.push(id);
	});

	return {
		objects,
		rootIds,
		connectorIds,
		selectedIds: [],
		hoveredIds: [],
		eventStartState: null,
		viewport: {
			minX: 0,
			minY: 0,
			width: 1000,
			height: 800,
			zoom: 1,
		},
		commitId: 0,
	};
};

/**
 * Converts CanvasState (flat structure) to CanvasDoc (tree structure).
 * This reconstructs the tree for serialization/storage.
 */
export const canvasToDoc = (state: CanvasState): CanvasDoc => {
	// Helper to reconstruct an object tree from an ID
	const reconstructObject = (id: string): ObjectDoc => {
		const objState = state.objects[id];
		if (!objState) {
			throw new Error(`Object with ID ${id} not found in state.`);
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

		const objDoc = objectRegistry.toDoc(objState);

		if (objState.type === "group") {
			const groupState = objState as GroupState;
			const groupDoc = objDoc as GroupDoc;

			// Reconstruct children recursively
			groupDoc.children = groupState.childIds.map((childId) =>
				reconstructObject(childId),
			);
		}

		return objDoc;
	};

	return {
		root: state.rootIds.map((id) => reconstructObject(id)),
		connectors: state.connectorIds.map(
			(id) => reconstructObject(id) as ConnectorDoc,
		),
	};
};
