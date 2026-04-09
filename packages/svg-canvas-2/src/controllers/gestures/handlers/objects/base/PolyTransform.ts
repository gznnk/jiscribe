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

/**
 * Poly系（Polygon, Polyline）のグループ回転処理
 * TODO: 各頂点を回転する実装が必要
 * 現状は未実装なので、そのまま返す
 *
 * @param poly - 回転対象のPoly
 * @param _rotationRootGroup - 回転の基準となるグループの状態（未使用）
 * @param _endGroupRotation - グループの最終的な回転角度（未使用）
 * @returns 回転後のPoly（現状は未変更）
 */
export function rotatePolyByGroup<T extends PolygonState | PolylineState>(
	poly: T,
	_rotationRootGroup: GroupState,
	_endGroupRotation: number,
): T {
	// TODO: Poly系の回転ロジック（各頂点を回転）
	// 現状は未実装なので、そのまま返す
	return poly;
}
