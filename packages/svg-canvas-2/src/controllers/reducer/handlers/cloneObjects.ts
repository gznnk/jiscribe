// TODO: move to controllers/utils
import type { Point } from "@workspace/geometry";

import type { EndpointRef } from "../../../schemas/objects/types/EndpointRef";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../../states/objects/connections/connector/ConnectorState";
import type { GroupState } from "../../../states/objects/primitives/group/GroupState";
import { moveGroup } from "../../gestures/handlers/objects/primitives/GroupController";
import { objectBehaviorRegistry } from "../../gestures/registry/ObjectBehaviorRegistry";

const remapEndpointRef = (
	ref: EndpointRef,
	idRemap: Map<string, string>,
): EndpointRef => {
	if (!ref.owner) {
		return ref;
	}
	return {
		...ref,
		owner: { ...ref.owner, id: idRemap.get(ref.owner.id) ?? ref.owner.id },
	};
};

/**
 * オブジェクト群を複製して新しい ID を割り当て、指定 offset だけ移動する。
 *
 * - rootIds に含まれるオブジェクトのみ offset 移動を適用する
 * - parentId / childIds / connector endpoint の参照はすべて新 ID にリマップする
 * - allObjects には rootIds の子孫も含まれている必要がある
 */
export function cloneObjects(
	rootIds: string[],
	allObjects: Record<string, ObjectState>,
	connectorIds: string[],
	offset: Point,
): {
	newObjects: Record<string, ObjectState>;
	newRootIds: string[];
	newConnectorIds: string[];
	idRemap: Map<string, string>;
} {
	// ── 1. 旧 ID → 新 ID のマッピングを生成 ──────────────────────────────────
	const idRemap = new Map<string, string>();
	for (const srcId of Object.keys(allObjects)) {
		idRemap.set(srcId, crypto.randomUUID());
	}

	// ── 2. 全オブジェクトを複製: ID・parentId・childIds・接続端点を新 ID にリマップ ──
	const clonedObjects: Record<string, ObjectState> = {};

	for (const [srcId, srcObj] of Object.entries(allObjects)) {
		const clonedId = idRemap.get(srcId)!;

		let clone: ObjectState = {
			...srcObj,
			id: clonedId,
			parentId:
				srcObj.parentId !== undefined
					? (idRemap.get(srcObj.parentId) ?? undefined)
					: undefined,
		};

		// グループ: childIds を新 ID にリマップ
		if (srcObj.type === "group") {
			const srcGroup = srcObj as GroupState;
			clone = {
				...clone,
				childIds: srcGroup.childIds.map((id) => idRemap.get(id) ?? id),
			} as GroupState;
		}

		// コネクター: 接続端点のオーナー ID を新 ID にリマップ
		if (srcObj.type === "connector") {
			const srcConn = srcObj as ConnectorState;
			clone = {
				...clone,
				source: remapEndpointRef(srcConn.source, idRemap),
				target: remapEndpointRef(srcConn.target, idRemap),
			} as ConnectorState;
		}

		clonedObjects[clonedId] = clone;
	}

	// ── 3. ルートオブジェクトのみ offset を適用 ──────────────────────────────
	for (const srcRootId of rootIds) {
		const clonedRootId = idRemap.get(srcRootId);
		if (!clonedRootId) {
			continue;
		}
		const clone = clonedObjects[clonedRootId];
		if (!clone) {
			continue;
		}

		if (clone.type === "group") {
			moveGroup(clonedRootId, clonedObjects, clonedObjects, offset);
		} else {
			const moveByDelta = objectBehaviorRegistry.getMoveByDelta(clone.type);
			if (moveByDelta) {
				clonedObjects[clonedRootId] = moveByDelta(clone, offset);
			}
		}
	}

	// ── 4. 呼び出し元が必要とする ID 配列を構築 ──────────────────────────────
	const newRootIds = rootIds.map((id) => idRemap.get(id)!).filter(Boolean);
	const newConnectorIds = connectorIds
		.map((id) => idRemap.get(id)!)
		.filter(Boolean);

	return { newObjects: clonedObjects, newRootIds, newConnectorIds, idRemap };
}
