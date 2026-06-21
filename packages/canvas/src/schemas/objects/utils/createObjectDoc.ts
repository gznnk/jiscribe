import type { Point } from "@workspace/geometry";

import { shapeFactoryRegistry } from "../../registry/ShapeFactoryRegistry";
import type { ObjectDoc } from "../base/ObjectDoc";
import type { ObjectType } from "../types/ObjectType";

/**
 * ObjectType と配置位置から ObjectDoc を生成する。
 * position は図形の中央を指す座標を受け取る。
 *
 * 生成ロジックは図形ごとの `ShapeFactory`（`shapeFactoryRegistry`）に委譲する。
 * このファイルは型ごとの switch を持たない薄い facade。
 *
 * @param type - 生成する図形のタイプ
 * @param position - 配置位置（中央基準の座標）
 * @param overrides - 既定値への上書き
 * @returns 生成された ObjectDoc
 */
export const createObjectDoc = (
	type: ObjectType,
	position: Point,
	overrides?: Record<string, unknown>,
): ObjectDoc => {
	const factory = shapeFactoryRegistry.get(type);
	if (!factory) {
		throw new Error(`Unsupported object type for menu: ${type}`);
	}
	return factory.createDoc(position, overrides);
};
