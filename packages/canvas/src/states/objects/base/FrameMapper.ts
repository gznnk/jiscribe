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

/**
 * ObjectMapper.toState/toDoc が生成・管理する基底フィールド。素通ししない。
 * - id/type/meta は ObjectMapper が変換して付与する
 * - parentId は CanvasMapper が runtime 正規化として State に付与する flat 階層情報で、
 *   Doc（階層は children のネストで表現）には出してはならない
 */
const BASE_KEYS = ["id", "type", "meta", "parentId"] as const;

/**
 * geometry の Doc 表現が占有するキー。geometry ごとに異なる点に注意:
 * rect 系は x/y/width/height。ellipse は cx/cy/rx/ry。
 *
 * とくに rect 系では `rx` は geometry ではなく角丸の radius スタイルなので、
 * ここに含めてはならない（含めると pass-through で角丸が落ちる）。rx を
 * geometry として扱うのは ellipse（x 半径）だけ。
 */
const RECT_GEOMETRY_DOC_KEYS = ["x", "y", "width", "height"] as const;
const ELLIPSE_GEOMETRY_DOC_KEYS = ["cx", "cy", "rx", "ry"] as const;

/** geometry の State 表現（Frame: cx/cy/w/h）が占有するキー。geometry 非依存。 */
const GEOMETRY_STATE_KEYS = ["cx", "cy", "width", "height"] as const;

/**
 * State → Doc 変換で geometry/transform マッパーが作り直すため素通ししない State 側キー。
 * State の geometry は常に Frame なので geometry に依存しない。
 */
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

	const docDerivedKeys: ReadonlySet<string> = new Set([
		...BASE_KEYS,
		...(isEllipse ? ELLIPSE_GEOMETRY_DOC_KEYS : RECT_GEOMETRY_DOC_KEYS),
		...TRANSFORM_DOC_KEYS,
	]);

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
					docDerivedKeys,
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
