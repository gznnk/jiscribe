import type { EndpointRef } from "../../../../schemas/objects/types/EndpointRef";

/**
 * コネクターが自己ループ（両端が同一オブジェクトに接続）かどうかを判定する。
 *
 * 自己ループは直交ルートでしか破綻なく描けないため、routing は orthogonal 専用扱い
 * （RoutingMenu で straight を出さない / SetRoutingStraightCommand を実行不可にする）。
 *
 * @param connector source / target の端点参照を持つコネクター
 * @returns 両端の owner.id が存在し一致すれば true
 */
export const isSelfLoopConnector = (connector: {
	source: EndpointRef;
	target: EndpointRef;
}): boolean => {
	const sourceOwnerId = connector.source.owner?.id;
	const targetOwnerId = connector.target.owner?.id;
	return sourceOwnerId != null && sourceOwnerId === targetOwnerId;
};
