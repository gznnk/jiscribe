import { resolveConnectorPoints } from "../../presentations/layers/content/utils/resolveConnectorPoints";
import type { FreeEndpointRef } from "../../schemas/objects/types/EndpointRef";
import type { ConnectorState } from "../../states/objects/connections/connector/ConnectorState";
import type { CanvasControllerState } from "../CanvasTypes";

/**
 * 図形削除に伴うコネクターの整理を行う。
 *
 * - 両端の接続先が削除対象 → コネクターも削除
 * - 片端のみ削除対象 → 削除される側のエンドポイントを Free に変換して保持（座標解決不能な場合はコネクターも削除）
 *
 * @param state - 削除前のキャンバス状態（エンドポイント座標の解決に使用）
 * @param idsToDelete - 削除対象オブジェクトのIDセット
 */
export function cleanupConnectorsOnDelete(
	state: CanvasControllerState,
	idsToDelete: Set<string>,
): CanvasControllerState {
	const updatedObjects = { ...state.objects };
	const updatedConnectorIds = [...state.connectorIds];
	let hasChanges = false;

	for (let i = updatedConnectorIds.length - 1; i >= 0; i--) {
		const connectorId = updatedConnectorIds[i];

		// 既に削除対象のコネクター自身はスキップ
		if (idsToDelete.has(connectorId)) {
			continue;
		}

		const connector = state.objects[connectorId] as ConnectorState | undefined;
		if (!connector) continue;

		const sourceOwnerId = connector.source.owner?.id;
		const targetOwnerId = connector.target.owner?.id;

		const sourceDeleted = sourceOwnerId != null && idsToDelete.has(sourceOwnerId);
		const targetDeleted = targetOwnerId != null && idsToDelete.has(targetOwnerId);

		if (!sourceDeleted && !targetDeleted) {
			continue;
		}

		hasChanges = true;

		// 削除後に接続先が残らない場合（既に Free だった端 + 削除される端）はコネクターも削除
		const sourceWillBeFree = sourceOwnerId == null || sourceDeleted;
		const targetWillBeFree = targetOwnerId == null || targetDeleted;
		if (sourceWillBeFree && targetWillBeFree) {
			delete updatedObjects[connectorId];
			updatedConnectorIds.splice(i, 1);
			continue;
		}

		// 片端削除 → 削除される側を Free に変換
		// resolveConnectorPoints で center アンカーのアウトライン調整を含む視覚上の座標を取得。
		// 削除前の state.objects を使うため両端のオブジェクトがまだ存在している。
		const sourceObj = sourceOwnerId != null ? state.objects[sourceOwnerId] : null;
		const targetObj = targetOwnerId != null ? state.objects[targetOwnerId] : null;
		const resolved = resolveConnectorPoints(connector, sourceObj, targetObj);

		const updatedConnector = { ...connector };
		let shouldDeleteConnector = false;

		if (sourceDeleted) {
			const point = resolved?.source;
			if (point == null) {
				shouldDeleteConnector = true;
			} else {
				const freeSource: FreeEndpointRef = { anchor: { kind: "free", point } };
				updatedConnector.source = freeSource;
			}
		}

		if (!shouldDeleteConnector && targetDeleted) {
			const point = resolved?.target;
			if (point == null) {
				shouldDeleteConnector = true;
			} else {
				const freeTarget: FreeEndpointRef = { anchor: { kind: "free", point } };
				updatedConnector.target = freeTarget;
			}
		}

		if (shouldDeleteConnector) {
			delete updatedObjects[connectorId];
			updatedConnectorIds.splice(i, 1);
			continue;
		}

		updatedObjects[connectorId] = updatedConnector as ConnectorState;
	}

	if (!hasChanges) {
		return state;
	}

	return {
		...state,
		objects: updatedObjects,
		connectorIds: updatedConnectorIds,
	};
}
