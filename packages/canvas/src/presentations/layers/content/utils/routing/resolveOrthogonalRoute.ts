import {
	calcFrameBoxFeatures,
	isTransformedFrame,
	snapToDirection,
	type OrthogonalDirection,
	type Point,
} from "@workspace/geometry";

import { routeOrthogonalConnector } from "./routeOrthogonalConnector";
import { routeSelfLoop } from "./selfLoop";
import type { OrthogonalConnectorEndpoint } from "./types";
import type { AnchorSpec } from "../../../../../schemas/objects/types/EndpointRef";
import type { ObjectState } from "../../../../../states/objects/base/ObjectState";

/**
 * 端点の外向き方向を決める。
 *
 * connectPoint（辺の中央）は「図形中心 → 解決済み端点」が外向き法線になる。
 * この端点座標は回転・反転込みで解決されているため、中心からのベクトルをスナップ
 * するだけで**図形の回転に自動追従**する（固定の up/right マップは使わない）。
 * center / free など中心情報が無いケースは相手端点へ向かう向きにフォールバックする。
 */
const endpointDirection = (
	anchor: AnchorSpec,
	point: Point,
	other: Point,
	obj: ObjectState | null | undefined,
): OrthogonalDirection => {
	if (anchor.kind === "connectPoint" && obj && isTransformedFrame(obj)) {
		const dx = point.x - obj.cx;
		const dy = point.y - obj.cy;
		if (dx !== 0 || dy !== 0) {
			return snapToDirection(dx, dy);
		}
	}
	return snapToDirection(other.x - point.x, other.y - point.y);
};

const buildEndpoint = (
	anchor: AnchorSpec,
	point: Point,
	other: Point,
	obj: ObjectState | null | undefined,
): OrthogonalConnectorEndpoint => ({
	point,
	direction: endpointDirection(anchor, point, other, obj),
	// owned かつ frame 形状なら回避用の AABB を渡す。free 端点は null。
	box: obj && isTransformedFrame(obj) ? calcFrameBoxFeatures(obj) : null,
});

/**
 * routing === "orthogonal" のコネクターの描画パスを生成する。
 *
 * 解決済みの端点座標（center アンカーはアウトライン調整済み）と接続図形の形状から、
 * 水平/垂直セグメントだけの経路を返す（端点込みフルパス）。両端の図形のみ回避する。
 */
export const resolveOrthogonalRoute = (
	sourceAnchor: AnchorSpec,
	targetAnchor: AnchorSpec,
	sourcePoint: Point,
	targetPoint: Point,
	sourceObj: ObjectState | null | undefined,
	targetObj: ObjectState | null | undefined,
): Point[] => {
	const source = buildEndpoint(
		sourceAnchor,
		sourcePoint,
		targetPoint,
		sourceObj,
	);
	const target = buildEndpoint(
		targetAnchor,
		targetPoint,
		sourcePoint,
		targetObj,
	);

	// 自己ループ（両端が同一図形）は専用の矩形ループルートを使う。
	// 通常の直交ルータは両端を別々の障害物として扱うため、同一図形では退化しうる。
	if (
		sourceObj &&
		targetObj &&
		sourceObj.id === targetObj.id &&
		source.box &&
		target.box
	) {
		return routeSelfLoop(source, target);
	}

	return routeOrthogonalConnector(source, target);
};
