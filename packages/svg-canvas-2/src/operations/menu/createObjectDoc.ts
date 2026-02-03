import type { Point } from "@workspace/geometry";

import type { ObjectDoc } from "../../schemas/objects/base/ObjectDoc";
import { ELLIPSE_DOC_DEFAULTS } from "../../schemas/objects/primitives/EllipseDoc";
import { RECT_DOC_DEFAULTS } from "../../schemas/objects/primitives/RectDoc";
import type { ObjectType } from "../../schemas/objects/types/ObjectType";

/**
 * ObjectType と配置位置から ObjectDoc を生成する。
 * position は図形の中央を指す座標を受け取る。
 *
 * @param type - 生成する図形のタイプ
 * @param position - 配置位置（中央基準の座標）
 * @returns 生成された ObjectDoc
 */
export const createObjectDoc = (
	type: ObjectType,
	position: Point,
): ObjectDoc => {
	const id = crypto.randomUUID();

	switch (type) {
		case "rect":
			return {
				...RECT_DOC_DEFAULTS,
				id,
				x: position.x - RECT_DOC_DEFAULTS.width / 2,
				y: position.y - RECT_DOC_DEFAULTS.height / 2,
			} as ObjectDoc;

		case "ellipse":
			return {
				...ELLIPSE_DOC_DEFAULTS,
				id,
				cx: position.x,
				cy: position.y,
			} as ObjectDoc;

		default:
			throw new Error(`Unsupported object type for menu: ${type}`);
	}
};
