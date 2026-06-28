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
	TRANSFORM_DOC_KEYS,
	TRANSFORM_STATE_KEYS,
} from "./TransformMapper";
import type { TransformState } from "./TransformState";
import type { ObjectDoc } from "../../../schemas/objects/base/ObjectDoc";
import type { TransformDoc } from "../../../schemas/objects/base/TransformDoc";
import type { ObjectFeatures } from "../../../schemas/objects/types/ObjectFeatures";

/** ObjectMapper.toState/toDoc が生成する基底フィールド（meta は変換が必要）。 */
const BASE_KEYS = ["id", "type", "meta"] as const;

/** geometry の Doc 表現（rect: x/y/w/h, ellipse: cx/cy/rx/ry）が占有するキー。 */
const GEOMETRY_DOC_KEYS = [
	"x",
	"y",
	"cx",
	"cy",
	"rx",
	"ry",
	"width",
	"height",
] as const;

/** geometry の State 表現（Frame: cx/cy/w/h）が占有するキー。 */
const GEOMETRY_STATE_KEYS = ["cx", "cy", "width", "height"] as const;

/**
 * Doc → State 変換で「geometry/transform マッパーが作り直す」ため
 * そのまま素通ししてはいけない Doc 側フィールド。これ以外はすべて透過する。
 */
const DOC_DERIVED_KEYS: ReadonlySet<string> = new Set([
	...BASE_KEYS,
	...GEOMETRY_DOC_KEYS,
	...TRANSFORM_DOC_KEYS,
]);

/** 同上の State 側フィールド。 */
const STATE_DERIVED_KEYS: ReadonlySet<string> = new Set([
	...BASE_KEYS,
	...GEOMETRY_STATE_KEYS,
	...TRANSFORM_STATE_KEYS,
]);

/** derived（geometry/transform/base）以外のフィールドを素通しで取り出す。 */
const passthrough = (
	src: Record<string, unknown>,
	derivedKeys: ReadonlySet<string>,
): Record<string, unknown> => {
	const rest: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(src)) {
		if (!derivedKeys.has(key)) {
			rest[key] = value;
		}
	}
	return rest;
};

/**
 * Frame 系オブジェクト（geometry: "rect" | "ellipse" + transform を持つ図形）の
 * Doc↔State マッパーを features から生成する。
 *
 * Doc と State の違いは geometry 表現と transform 表現だけで、それ以外
 * （stroke / fill / text / radius / svgText …）は名前・型が同一の素通しフィールド。
 * そのため本マッパーは geometry/transform の変換だけを担い、残りは透過する。
 * スタイル項目のカタログを持たないので、フィールドや features を増やしても無改修。
 */
export const createFrameMapper = <
	TDoc extends ObjectDoc,
	TState extends ObjectState,
>(
	features: ObjectFeatures,
): ObjectMapperType<TDoc, TState> => {
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
				...passthrough(
					doc as unknown as Record<string, unknown>,
					DOC_DERIVED_KEYS,
				),
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
				...passthrough(
					state as unknown as Record<string, unknown>,
					STATE_DERIVED_KEYS,
				),
				...geometry,
				...transform,
			} as unknown as TDoc;
		},
	};
};
