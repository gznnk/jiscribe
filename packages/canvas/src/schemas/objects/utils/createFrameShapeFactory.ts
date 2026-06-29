import type { ObjectDoc } from "../base/ObjectDoc";
import type { ShapeFactory } from "../types/ShapeFactory";
import { numberOverride } from "../types/ShapeFactory";

/** Frame 系（geometry: "rect" / 左上原点）図形の DOC_DEFAULTS が満たす最小形。 */
type FrameDefaults = { width: number; height: number } & Record<
	string,
	unknown
>;

type FrameShapeFactoryOptions = {
	/**
	 * 2 点 bounds からのドラッグ描画に対応するか（既定 true）。
	 * false の図形（sticky など）は createDocFromBounds を持たず、クリックで中央配置になる。
	 */
	supportsBounds?: boolean;
};

/**
 * Frame 系（geometry: "rect"、左上原点の x/y/width/height）図形の `ShapeFactory` を
 * DEFAULTS から生成する。rect / diamond / sticky など、生成ロジックが defaults と
 * bounds 対応の有無しか違わない図形を 1 か所に集約する。
 *
 * 中心基準の ellipse（cx/cy/rx/ry）は配置計算が異なるため対象外。
 */
export const createFrameShapeFactory = (
	defaults: FrameDefaults,
	options: FrameShapeFactoryOptions = {},
): ShapeFactory => {
	const { supportsBounds = true } = options;

	const factory: ShapeFactory = {
		createDoc(position, overrides) {
			const width = numberOverride(overrides?.width, defaults.width);
			const height = numberOverride(overrides?.height, defaults.height);
			return {
				...defaults,
				...overrides,
				id: crypto.randomUUID(),
				x: position.x - width / 2,
				y: position.y - height / 2,
			} as unknown as ObjectDoc;
		},

		calcDimensions(overrides) {
			return {
				halfWidth: numberOverride(overrides?.width, defaults.width) / 2,
				halfHeight: numberOverride(overrides?.height, defaults.height) / 2,
			};
		},
	};

	if (supportsBounds) {
		factory.createDocFromBounds = (x1, y1, x2, y2, overrides, minSize = 5) => {
			const width = Math.abs(x2 - x1);
			const height = Math.abs(y2 - y1);
			if (width < minSize || height < minSize) {
				return null;
			}
			return {
				...defaults,
				...overrides,
				id: crypto.randomUUID(),
				x: Math.min(x1, x2),
				y: Math.min(y1, y2),
				width,
				height,
			} as unknown as ObjectDoc;
		};
	}

	return factory;
};
