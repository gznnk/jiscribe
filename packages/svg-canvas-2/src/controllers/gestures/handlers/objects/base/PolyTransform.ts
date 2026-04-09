import type { GroupState } from "../../../../../states/objects/primitives/group/GroupState";
import type { PolygonState } from "../../../../../states/objects/primitives/polygon/PolygonState";
import type { PolylineState } from "../../../../../states/objects/primitives/polyline/PolylineState";

/**
 * Poly系（Polygon, Polyline）のグループ変形処理
 * TODO: 各頂点を変換する実装が必要
 * 現状は未実装なので、そのまま返す
 */
export function transformPolyByGroup<T extends PolygonState | PolylineState>(
	poly: T,
	_transformRootGroupStartState: GroupState,
	_transformRootGroupEndState: GroupState,
): T {
	// TODO: Poly系の変形ロジック（各頂点を変換）
	// 現状は未実装なので、そのまま返す
	return poly;
}
