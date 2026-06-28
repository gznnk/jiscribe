import type { Ellipse, Frame, Rect } from "@workspace/geometry";
import {
	convertEllipseToFrame,
	convertFrameToEllipse,
	convertFrameToRect,
	convertRectToFrame,
} from "@workspace/geometry";

import type { ObjectMapperType } from "./MapperTypes";
import { ObjectMapper } from "./ObjectMapper";
import type { ObjectState } from "./ObjectState";
import {
	mapTransformDocToState,
	mapTransformStateToDoc,
} from "./TransformMapper";
import type { TransformState } from "./TransformState";
import type { ObjectDoc } from "../../../schemas/objects/base/ObjectDoc";
import type { TransformDoc } from "../../../schemas/objects/base/TransformDoc";
import type { ObjectFeatures } from "../../../schemas/objects/types/ObjectFeatures";

const STROKE_KEYS = ["stroke", "strokeWidth", "strokeDashType"] as const;
const FILL_KEYS = ["fill"] as const;
const RADIUS_KEYS = ["rx"] as const;
const TEXT_KEYS = [
	"text",
	"textType",
	"textAlign",
	"verticalAlign",
	"fontColor",
	"fontSize",
	"fontFamily",
	"fontWeight",
] as const;

/**
 * features に応じて素通しコピーすべきスタイルフィールド名を集める。
 * Doc と State でフィールド名・型は同一なので、両方向で同じキー集合を使える。
 */
const collectStyleKeys = (features: ObjectFeatures): string[] => [
	...(features.stroke ? STROKE_KEYS : []),
	...(features.fill ? FILL_KEYS : []),
	...(features.radius ? RADIUS_KEYS : []),
	...(features.text ? TEXT_KEYS : []),
];

const pick = (
	src: Record<string, unknown>,
	keys: readonly string[],
): Record<string, unknown> => {
	const picked: Record<string, unknown> = {};
	for (const key of keys) {
		picked[key] = src[key];
	}
	return picked;
};

/**
 * Frame 系オブジェクト（geometry: "rect" | "ellipse" + transform を持つ図形）の
 * Doc↔State マッパーを features から生成する。
 *
 * - geometry 変換は `features.geometry` で rect / ellipse を切り替える
 * - コピーするスタイル項目は features（stroke / fill / radius / text）から決まる
 * - svg の `svgText` のような図形固有の素通しフィールドは `extraKeys` で渡す
 *
 * これにより rect / diamond / ellipse / sticky / svg などの変換ロジックを
 * 1 か所に集約でき、図形ごとには features と追加キーを宣言するだけで済む。
 */
export const createFrameMapper = <
	TDoc extends ObjectDoc,
	TState extends ObjectState,
>(
	features: ObjectFeatures,
	extraKeys: readonly string[] = [],
): ObjectMapperType<TDoc, TState> => {
	const copyKeys = [...collectStyleKeys(features), ...extraKeys];
	const isEllipse = features.geometry === "ellipse";

	return {
		toState: (doc) => {
			const frame: Frame = isEllipse
				? convertEllipseToFrame(doc as unknown as Ellipse)
				: convertRectToFrame(doc as unknown as Rect);
			const transform: Partial<TransformState> = features.transform
				? mapTransformDocToState(doc as unknown as TransformDoc)
				: {};
			return {
				...ObjectMapper.toState(doc),
				...frame,
				...transform,
				...pick(doc as unknown as Record<string, unknown>, copyKeys),
			} as unknown as TState;
		},

		toDoc: (state) => {
			const geometry: Rect | Ellipse = isEllipse
				? convertFrameToEllipse(state as unknown as Frame)
				: convertFrameToRect(state as unknown as Frame);
			const transform: Partial<TransformDoc> = features.transform
				? mapTransformStateToDoc(state as unknown as TransformState)
				: {};
			return {
				...ObjectMapper.toDoc(state),
				...geometry,
				...transform,
				...pick(state as unknown as Record<string, unknown>, copyKeys),
			} as unknown as TDoc;
		},
	};
};
