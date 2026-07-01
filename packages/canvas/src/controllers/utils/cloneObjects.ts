import type { Point } from "@workspace/geometry";

import type { EndpointRef } from "../../schemas/objects/types/EndpointRef";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../states/objects/connections/connector/ConnectorState";
import type { GroupState } from "../../states/objects/primitives/group/GroupState";
import { moveGroup } from "../gestures/handlers/objects/primitives/GroupController";
import { objectBehaviorRegistry } from "../gestures/registry/ObjectBehaviorRegistry";

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
 * トップレベル要素群を複製して新しい ID を割り当て、指定 offset だけ移動する。
 *
 * - `topLevelIds` はトップレベル要素（オブジェクト + コネクター）を z-order（背面→前面）で
 *   並べたもの。state / clipboard の `rootIds` と同じ表現を受け取る。
 * - 非コネクターにのみ offset を適用する（コネクターは端点が所有図形に追従するため動かさない）。
 * - parentId / childIds / connector endpoint の参照はすべて新 ID にリマップする。
 * - `allObjects` には `topLevelIds` の子孫も含まれている必要がある。
 *
 * 入力が閉じたフォレストでない場合（外部クリップボード経由などで親が
 * allObjects に含まれない子オブジェクトがある場合）でも、必ず自己整合的な
 * フォレストを生成する:
 * - parentId が allObjects 内に解決できないオブジェクトは parentId を破棄し、
 *   トップレベル（newTopLevelIds）へ昇格させる（孤児化を防ぐ）
 * - グループの childIds は allObjects 内に存在する子のみへ絞り込む
 *   （存在しない子へのダングリング参照を残さない）
 *
 * @returns `newTopLevelIds` は `topLevelIds` と同じ順序で新 ID を並べ、昇格した孤児を末尾に足したもの。
 *   呼び出し側で型により図形／コネクターへ振り分けられる。
 */
export function cloneObjects(
	topLevelIds: string[],
	allObjects: Record<string, ObjectState>,
	offset: Point,
): {
	newObjects: Record<string, ObjectState>;
	newTopLevelIds: string[];
	idRemap: Map<string, string>;
} {
	// ── 1. 旧 ID → 新 ID のマッピングを生成 ──────────────────────────────────
	const idRemap = new Map<string, string>();
	for (const srcId of Object.keys(allObjects)) {
		idRemap.set(srcId, crypto.randomUUID());
	}

	// ── 2. 全オブジェクトを複製: ID・parentId・childIds・接続端点を新 ID にリマップ ──
	const clonedObjects: Record<string, ObjectState> = {};
	// 親をリマップできず、トップレベルへ昇格させた新オブジェクト ID 群
	const detachedNewIds: string[] = [];

	for (const [srcId, srcObj] of Object.entries(allObjects)) {
		const clonedId = idRemap.get(srcId)!;

		// 親が allObjects 内に存在しない場合は parentId を破棄し、トップレベルへ昇格させる。
		// （外部クリップボード等で親グループ抜きの子が含まれても孤児化させない）
		// コネクターは topLevelIds で明示的に渡され newTopLevelIds に含まれるため昇格対象外。
		const remappedParentId =
			srcObj.parentId !== undefined ? idRemap.get(srcObj.parentId) : undefined;
		if (
			srcObj.parentId !== undefined &&
			remappedParentId === undefined &&
			srcObj.type !== "connector"
		) {
			detachedNewIds.push(clonedId);
		}

		let clone: ObjectState = {
			...srcObj,
			id: clonedId,
			parentId: remappedParentId,
		};

		// グループ: childIds を新 ID にリマップ（クローン集合に存在する子のみ残す）
		if (srcObj.type === "group") {
			const srcGroup = srcObj as GroupState;
			clone = {
				...clone,
				childIds: srcGroup.childIds
					.filter((id) => idRemap.has(id))
					.map((id) => idRemap.get(id)!),
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

	// ── 3. offset を適用（コネクター以外のトップレベルのみ）──────────────────
	for (const srcId of topLevelIds) {
		const clonedId = idRemap.get(srcId);
		if (!clonedId) {
			continue;
		}
		const clone = clonedObjects[clonedId];
		// コネクターは端点が所有図形に追従するため offset しない。
		if (!clone || clone.type === "connector") {
			continue;
		}

		if (clone.type === "group") {
			moveGroup(clonedId, clonedObjects, clonedObjects, offset);
		} else {
			const moveByDelta = objectBehaviorRegistry.getMoveByDelta(clone.type);
			if (moveByDelta) {
				clonedObjects[clonedId] = moveByDelta(clone, offset);
			}
		}
	}

	// ── 4. newTopLevelIds を構築（topLevelIds の順序を保ち、昇格孤児を末尾に足す）──
	const newTopLevelIds: string[] = [];
	const seen = new Set<string>();
	for (const id of topLevelIds) {
		const clonedId = idRemap.get(id);
		if (clonedId !== undefined && !seen.has(clonedId)) {
			seen.add(clonedId);
			newTopLevelIds.push(clonedId);
		}
	}
	for (const clonedId of detachedNewIds) {
		if (!seen.has(clonedId)) {
			seen.add(clonedId);
			newTopLevelIds.push(clonedId);
		}
	}

	return { newObjects: clonedObjects, newTopLevelIds, idRemap };
}
