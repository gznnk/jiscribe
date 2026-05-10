import type { Point } from "@workspace/geometry";

import { STICKY_DOC_DEFAULTS } from "../annotations/StickyDoc";
import type { ObjectDoc } from "../base/ObjectDoc";
import { ELLIPSE_DOC_DEFAULTS } from "../primitives/EllipseDoc";
import { RECT_DOC_DEFAULTS } from "../primitives/RectDoc";
import type { ObjectType } from "../types/ObjectType";

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
	overrides?: Record<string, unknown>,
): ObjectDoc => {
	const id = crypto.randomUUID();

	switch (type) {
		case "rect": {
			const width =
				typeof overrides?.width === "number"
					? overrides.width
					: RECT_DOC_DEFAULTS.width;
			const height =
				typeof overrides?.height === "number"
					? overrides.height
					: RECT_DOC_DEFAULTS.height;
			return {
				...RECT_DOC_DEFAULTS,
				...overrides,
				id,
				x: position.x - width / 2,
				y: position.y - height / 2,
			} as ObjectDoc;
		}

		case "ellipse":
			return {
				...ELLIPSE_DOC_DEFAULTS,
				...overrides,
				id,
				cx: position.x,
				cy: position.y,
			} as ObjectDoc;

		case "sticky": {
			const width =
				typeof overrides?.width === "number"
					? overrides.width
					: STICKY_DOC_DEFAULTS.width;
			const height =
				typeof overrides?.height === "number"
					? overrides.height
					: STICKY_DOC_DEFAULTS.height;
			return {
				...STICKY_DOC_DEFAULTS,
				...overrides,
				id,
				x: position.x - width / 2,
				y: position.y - height / 2,
			} as ObjectDoc;
		}

		default:
			throw new Error(`Unsupported object type for menu: ${type}`);
	}
};
