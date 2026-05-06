import { objectRegistry } from "../../../registry/ObjectRegistry";
import type { EndpointRef } from "../../../schemas/objects/types/EndpointRef";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../../states/objects/connections/connector/ConnectorState";
import type { GroupState } from "../../../states/objects/primitives/group/GroupState";
import type { CanvasControllerState } from "../../CanvasTypes";
import type { ClipboardData } from "../../commands/selection/ClipboardData";
import { moveGroup } from "../../gestures/handlers/objects/primitives/GroupController";
import { createMultiSelectGroup } from "../../gestures/handlers/objects/utils/createMultiSelectGroup";

const PASTE_OFFSET = { x: 20, y: 20 };

const remapEndpointRef = (ref: EndpointRef, idMap: Map<string, string>): EndpointRef => {
	if (!ref.owner) return ref;
	return { ...ref, owner: { ...ref.owner, id: idMap.get(ref.owner.id) ?? ref.owner.id } };
};

export const handlePaste = (
	state: CanvasControllerState,
	data: ClipboardData,
): CanvasControllerState => {
	const idMap = new Map<string, string>();
	for (const oldId of Object.keys(data.objects)) {
		idMap.set(oldId, crypto.randomUUID());
	}

	const newObjects: Record<string, ObjectState> = {};

	for (const [oldId, obj] of Object.entries(data.objects)) {
		const newId = idMap.get(oldId)!;

		let newObj: ObjectState = {
			...obj,
			id: newId,
			parentId: obj.parentId !== undefined ? (idMap.get(obj.parentId) ?? undefined) : undefined,
		};

		if (obj.type === "group") {
			const group = obj as GroupState;
			newObj = {
				...newObj,
				childIds: group.childIds.map((id) => idMap.get(id) ?? id),
			} as GroupState;
		}

		if (obj.type === "connector") {
			const conn = obj as ConnectorState;
			newObj = {
				...newObj,
				source: remapEndpointRef(conn.source, idMap),
				target: remapEndpointRef(conn.target, idMap),
			} as ConnectorState;
		}

		newObjects[newId] = newObj;
	}

	for (const oldRootId of data.rootIds) {
		const newRootId = idMap.get(oldRootId);
		if (!newRootId) continue;
		const obj = newObjects[newRootId];
		if (!obj) continue;

		if (obj.type === "group") {
			moveGroup(newRootId, newObjects, newObjects, PASTE_OFFSET);
		} else {
			const moveByDeltaFn = objectRegistry.getMoveByDelta(obj.type);
			if (moveByDeltaFn) {
				newObjects[newRootId] = moveByDeltaFn(obj, PASTE_OFFSET);
			}
		}
	}

	const newRootIds = data.rootIds.map((id) => idMap.get(id)!).filter(Boolean);
	const newConnectorIds = data.connectorIds.map((id) => idMap.get(id)!).filter(Boolean);
	const mergedObjects = { ...state.objects, ...newObjects };

	return {
		...state,
		objects: mergedObjects,
		rootIds: [...state.rootIds, ...newRootIds],
		connectorIds: [...state.connectorIds, ...newConnectorIds],
		selectedIds: newRootIds,
		multiSelectGroup: createMultiSelectGroup(newRootIds, mergedObjects, null),
		contextMenuPosition: null,
		lastCommitTime: Date.now(),
	};
};
