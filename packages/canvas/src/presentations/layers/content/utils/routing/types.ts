import type {
	BoxFeatures,
	OrthogonalDirection,
	Point,
} from "@workspace/geometry";

/**
 * 直交ルータの端点。
 * - `point`: 解決済みの端点座標（図形の辺上 or free 点）
 * - `direction`: その端点で線が図形から**外向きに出る**方向
 * - `box`: 接続図形の軸並行バウンディングボックス（free 端点は null）
 */
export type OrthogonalConnectorEndpoint = {
	point: Point;
	direction: OrthogonalDirection;
	box: BoxFeatures | null;
};

export type RouteOrthogonalConnectorOptions = {
	/** 図形の面から線を押し出す距離（スタブ長, px）。 */
	margin?: number;
};
