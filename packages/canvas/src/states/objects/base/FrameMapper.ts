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
import { FILL_STYLE_KEYS } from "../../../schemas/objects/base/FillStyleDoc";
import type { ObjectDoc } from "../../../schemas/objects/base/ObjectDoc";
import { RADIUS_STYLE_KEYS } from "../../../schemas/objects/base/RadiusStyleDoc";
import { STROKE_STYLE_KEYS } from "../../../schemas/objects/base/StrokeStyleDoc";
import { TEXT_STYLE_KEYS } from "../../../schemas/objects/base/TextStyleDoc";
import type { TransformDoc } from "../../../schemas/objects/base/TransformDoc";
import type { ObjectFeatures } from "../../../schemas/objects/types/ObjectFeatures";

/**
 * features で有効なスタイルグループの pass-through キーを集める。
 * stroke / fill / text / radius は Doc/State でフィールド名が同一なので方向に依存しない。
 * geometry と transform は変換器（convert* / mapTransform*）が作り直すため、ここには含めない。
 */
const collectStyleKeys = (features: ObjectFeatures): readonly string[] => [
	...(features.stroke ? STROKE_STYLE_KEYS : []),
	...(features.fill ? FILL_STYLE_KEYS : []),
	...(features.text ? TEXT_STYLE_KEYS : []),
	...(features.radius ? RADIUS_STYLE_KEYS : []),
];

/** src が自身で持つキーのうち、allow-list `keys` に含まれるものだけを取り出す。 */
const pick = (
	src: Record<string, unknown>,
	keys: readonly string[],
): Record<string, unknown> => {
	const out: Record<string, unknown> = {};
	for (const key of keys) {
		if (Object.prototype.hasOwnProperty.call(src, key)) {
			out[key] = src[key];
		}
	}
	return out;
};

/**
 * Frame 系オブジェクト（geometry: "rect" | "ellipse" + transform を持つ図形）の
 * Doc↔State マッパーを features から生成する。
 *
 * Doc と State の違いは geometry 表現と transform 表現だけ。それ以外
 * （stroke / fill / text / radius / svgText …）は名前・型が同一なので、本マッパーは
 * geometry/transform だけを変換し、残りは **allow-list で明示的に拾って** 素通しする。
 *
 * 拾うキーは features で有効なスタイルグループ（`collectStyleKeys`）＋図形固有の
 * `extraKeys`（svg の svgText など）。allow-list なので id/parentId/minWidth といった
 * runtime 専用フィールドが Doc に漏れることは構造的に起こらない。各キー配列は
 * `AssertExhaustiveKeys` で対応する型に束縛されており、フィールド追加時の取りこぼしは
 * コンパイルエラーになる。
 */
export const createFrameMapper = <
	TDoc extends ObjectDoc,
	TState extends ObjectState,
>(
	features: ObjectFeatures,
	extraKeys: readonly string[] = [],
): ObjectMapperType<TDoc, TState> => {
	const isEllipse = features.geometry === "ellipse";
	const passthroughKeys = [...collectStyleKeys(features), ...extraKeys];

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
				...pick(doc as unknown as Record<string, unknown>, passthroughKeys),
				...frame,
				...transform,
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
				...pick(state as unknown as Record<string, unknown>, passthroughKeys),
				...geometry,
				...transform,
			} as unknown as TDoc;
		},
	};
};
