import {
	calcFrameKeyPoint,
	isCenterPoint,
	isTransformedFrame,
	type Point,
} from "@workspace/geometry";

import type { EndpointRef } from "../../../../../schemas/objects/types/EndpointRef";
import type { ObjectState } from "../../../../../states/objects/base/ObjectState";

/**
 * EndpointRef を Point 座標へ解決する。objects マップ全体ではなく対象オブジェクト 1 つ
 * だけを受け取るため、その図形だけを依存に持つメモ化が効く。
 *
 * 対応するアンカー種別:
 * - free: 指定された点をそのまま返す
 * - center: 参照図形の中心点 (cx, cy) を返す
 * - connectPoint: 指定された接続点（topCenter / rightCenter など辺の中央）を返す
 *
 * @param endpoint - 解決対象の端点参照。アンカー種別（free / center / connectPoint）を持つ
 * @param obj - endpoint が参照する図形の状態。未参照（free）や未発見なら null/undefined
 * @returns 解決した座標。解決できない場合は null
 */
export const resolveEndpoint = (
	endpoint: EndpointRef,
	obj: ObjectState | null | undefined,
): Point | null => {
	// FreeAnchor: point is directly specified
	if (endpoint.anchor.kind === "free") {
		return endpoint.anchor.point;
	}

	// For owned endpoints, the owner object must be provided
	if (!obj) {
		return null;
	}

	// CenterAnchor: use the object's center point
	if (endpoint.anchor.kind === "center") {
		if (isCenterPoint(obj)) {
			return { x: obj.cx, y: obj.cy };
		}
	}

	// ConnectPointAnchor: use a specific connection point on the object's edge
	if (endpoint.anchor.kind === "connectPoint") {
		const anchorId = endpoint.anchor.id;

		// Check if the object has transform properties (Frame-based)
		if (isTransformedFrame(obj)) {
			// Compute only the requested edge key point (avoids calculating all 8).
			// "center" や不正な id は default で null（center anchor は kind === "center" 経路で扱う）
			switch (anchorId) {
				case "topCenter":
				case "rightCenter":
				case "bottomCenter":
				case "leftCenter":
					return calcFrameKeyPoint(obj, anchorId);
				default:
					return null;
			}
		}
	}

	return null;
};
