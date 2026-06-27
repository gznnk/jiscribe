import {
	calcOutlinePointTowardForRotatedEllipse,
	calcOutlinePointTowardForRotatedFrame,
	isTransformedFrame,
	type Point,
	type TransformedEllipse,
} from "@workspace/geometry";

import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
import { objectMapperRegistry } from "../../../../../states/registry/ObjectMapperRegistry";

/**
 * center アンカーの端点を、rect / ellipse 図形の輪郭（アウトライン）上の点へ寄せる。
 * center アンカーのときだけ呼ぶこと。objects マップ全体ではなく対象図形 1 つを受け取り、
 * その図形だけを依存に持つメモ化を効かせる。
 *
 * @param point - 解決済みの端点（通常は図形の中心）
 * @param toward - 輪郭との交点を求める際に「線が向かう先」として使う点
 * @param obj - 端点が参照する図形の状態。未参照なら null/undefined（その場合は point をそのまま返す）
 * @returns 輪郭上へ寄せた点（rect/ellipse 図形の場合）。toward が図形内部にあるなど交点が無ければ null。rect/ellipse 以外の図形は調整せず元の point
 */
export const adjustToOutline = (
	point: Point,
	toward: Point,
	obj: ObjectState | null | undefined,
): Point | null => {
	if (!obj) {
		return point;
	}

	const features = objectMapperRegistry.getFeatures(obj.type);
	if (!features) {
		return point;
	}

	// Check if object has valid TransformedFrame properties (required for both rect and ellipse)
	if (!isTransformedFrame(obj)) {
		return point;
	}

	// Adjust for objects with rect geometry
	if (features.geometry === "rect") {
		return calcOutlinePointTowardForRotatedFrame(obj, toward);
	}

	// Adjust for objects with ellipse geometry
	// Convert width/height to rx/ry for ellipse calculation
	if (features.geometry === "ellipse") {
		const ellipse: TransformedEllipse = {
			cx: obj.cx,
			cy: obj.cy,
			rx: obj.width / 2,
			ry: obj.height / 2,
			rotation: obj.rotation,
			scaleX: obj.scaleX,
			scaleY: obj.scaleY,
		};
		return calcOutlinePointTowardForRotatedEllipse(ellipse, toward);
	}

	return point;
};
