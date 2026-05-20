import { roundToDecimal } from "@workspace/geometry";
import type { Point } from "@workspace/geometry";

import { STICKY_DOC_DEFAULTS } from "../annotations/sticky/StickyDoc";
import type { ObjectDoc } from "../base/ObjectDoc";
import { ELLIPSE_DOC_DEFAULTS } from "../primitives/ellipse/EllipseDoc";
import { RECT_DOC_DEFAULTS } from "../primitives/rect/RectDoc";
import type { ObjectType } from "../types/ObjectType";

const POLY_STROKE = "#374151";
const POLY_STROKE_WIDTH = 2;
// polyline のデフォルト半幅（左右対称の水平2点線）
const POLYLINE_HALF_WIDTH = 80;
// polygon のデフォルト外接円半径
const POLYGON_RADIUS = 60;
const POLYGON_SIDES = 5;

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

		case "polyline":
			return {
				type: "polyline",
				id,
				points: [
					{ x: position.x - POLYLINE_HALF_WIDTH, y: position.y },
					{ x: position.x + POLYLINE_HALF_WIDTH, y: position.y },
				],
				stroke: POLY_STROKE,
				strokeWidth: POLY_STROKE_WIDTH,
				...overrides,
			} as ObjectDoc;

		case "polygon": {
			const points = Array.from({ length: POLYGON_SIDES }, (_, i) => {
				const angle = (2 * Math.PI * i) / POLYGON_SIDES - Math.PI / 2;
				return {
					x: roundToDecimal(position.x + POLYGON_RADIUS * Math.cos(angle), 4),
					y: roundToDecimal(position.y + POLYGON_RADIUS * Math.sin(angle), 4),
				};
			});
			return {
				type: "polygon",
				id,
				points,
				stroke: POLY_STROKE,
				strokeWidth: POLY_STROKE_WIDTH,
				fill: "transparent",
				...overrides,
			} as ObjectDoc;
		}

		default:
			throw new Error(`Unsupported object type for menu: ${type}`);
	}
};
