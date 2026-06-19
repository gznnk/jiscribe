import { isOwnedEndpointRef } from "../../../../schemas/objects/types/EndpointRef";
import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../../../states/objects/connections/connector/ConnectorState";

/**
 * 選択範囲に含めるべきコネクター ID を抽出する。
 *
 * 判定ルール: free 端は包含をブロックしないが、
 * 「少なくとも 1 端が owned かつ選択範囲内」であることを要求する。
 *
 * - 両端 owned+選択内 → 含む
 * - 片端 owned+選択内 / 他端 free → 含む
 * - 両端 free（浮遊コネクター）→ 除外
 * - owned だが選択範囲外の端を持つ → 除外
 *
 * Copy / Duplicate の両方で同一判定を使うために共有する。
 *
 * @param connectorIds - 走査対象のコネクター ID 一覧
 * @param objects - フラットなオブジェクトマップ
 * @param selectedIdsWithDescendants - 選択中 ID + 全子孫を含む集合
 * @returns 包含すべきコネクター ID の配列（入力順を維持）
 */
export function selectConnectorsInSelection(
	connectorIds: readonly string[],
	objects: Record<string, ObjectState>,
	selectedIdsWithDescendants: ReadonlySet<string>,
): string[] {
	const result: string[] = [];
	for (const connId of connectorIds) {
		const conn = objects[connId] as ConnectorState | undefined;
		if (!conn) {
			continue;
		}
		const sourceOwned = isOwnedEndpointRef(conn.source);
		const targetOwned = isOwnedEndpointRef(conn.target);
		const sourceSelected =
			isOwnedEndpointRef(conn.source) &&
			selectedIdsWithDescendants.has(conn.source.owner.id);
		const targetSelected =
			isOwnedEndpointRef(conn.target) &&
			selectedIdsWithDescendants.has(conn.target.owner.id);
		// owned だが選択範囲外の端を持つコネクターは除外
		if ((sourceOwned && !sourceSelected) || (targetOwned && !targetSelected)) {
			continue;
		}
		// 少なくとも 1 端が owned かつ選択範囲内であること（両端 free を除外）
		if (!sourceSelected && !targetSelected) {
			continue;
		}
		result.push(connId);
	}
	return result;
}
