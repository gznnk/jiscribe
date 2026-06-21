import { shapeFactoryRegistry } from "../../registry/ShapeFactoryRegistry";
import type { ObjectDoc } from "../base/ObjectDoc";
import type { ObjectType } from "../types/ObjectType";

/**
 * 描画ドラッグの開始点・終点からオブジェクト Doc を生成する。
 * 最小サイズ未満、または bounds 描画に対応しない図形の場合は null を返す。
 *
 * 生成ロジックは図形ごとの `ShapeFactory.createDocFromBounds` に委譲する。
 */
export const createObjectDocFromBounds = (
	type: ObjectType,
	x1: number,
	y1: number,
	x2: number,
	y2: number,
	overrides?: Record<string, unknown>,
	minSize = 5,
): ObjectDoc | null => {
	const factory = shapeFactoryRegistry.get(type);
	if (!factory?.createDocFromBounds) {
		return null;
	}
	return factory.createDocFromBounds(x1, y1, x2, y2, overrides, minSize);
};
