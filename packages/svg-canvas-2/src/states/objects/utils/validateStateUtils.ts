import {
	isArray,
	isCssSafeValue,
	isNumber,
	isString,
} from "@workspace/basic-validators";

import { isArrowType } from "../../../schemas/objects/types/ArrowType";
import type { ObjectType } from "../../../schemas/objects/types/ObjectType";
import { isPoly } from "../../../schemas/objects/types/Poly";
import { isStrokeDashType } from "../../../schemas/objects/types/StrokeDashType";
import { validateEndpointRef } from "../../../schemas/objects/utils/validateDocUtils";
import { isTextStyleState } from "../base/TextStyleState";
import { isTransformState } from "../base/TransformState";

/**
 * クリップボード由来の `ObjectState`（= 任意の untrusted オブジェクト）を型別に検証する
 * ための共通ヘルパー群。boolean を返す型ガード方式で、state 層の既存ガード
 * （`isTransformState` / `isTextStyleState` / `isGroupState` 等）と整合させている。
 *
 * style 文字列（stroke / fill / fontFamily / fontWeight）には Step 1 の `isCssSafeValue`
 * を適用し、CSS インジェクションを境界で弾く。色の厳密な妥当性（`isCssColor` =
 * `CSS.supports`）はブラウザ専用のため `isTextStyleState` 側に委ねる。
 */
export type StateRecord = Record<string, unknown>;

/** id が非空文字列で、type が期待値に一致するかを検証する。 */
export const hasValidIdAndType = (o: StateRecord, type: ObjectType): boolean =>
	isString(o.id) && o.id.length > 0 && o.type === type;

/** Frame ジオメトリ（cx / cy / width / height が数値）を検証する。 */
export const isValidFrameState = (o: StateRecord): boolean =>
	isNumber(o.cx) && isNumber(o.cy) && isNumber(o.width) && isNumber(o.height);

/** Poly ジオメトリ（points 配列）を検証する。 */
export const isValidPolyState = (o: StateRecord): boolean => isPoly(o);

/** TransformState（rotation / scaleX / scaleY が数値）を検証する。 */
export const isValidTransformState = (o: StateRecord): boolean =>
	isTransformState(o);

/** StrokeStyleState の任意フィールドを、存在すれば型・安全性で検証する。 */
export const isValidStrokeStyleState = (o: StateRecord): boolean => {
	if ("stroke" in o && o.stroke !== undefined && !isCssSafeValue(o.stroke)) {
		return false;
	}
	if (
		"strokeWidth" in o &&
		o.strokeWidth !== undefined &&
		!isNumber(o.strokeWidth)
	) {
		return false;
	}
	if (
		"strokeDashType" in o &&
		o.strokeDashType !== undefined &&
		!isStrokeDashType(o.strokeDashType)
	) {
		return false;
	}
	return true;
};

/** FillStyleState の fill を、存在すれば CSS 安全性で検証する。 */
export const isValidFillStyleState = (o: StateRecord): boolean =>
	!("fill" in o) || o.fill === undefined || isCssSafeValue(o.fill);

/**
 * TextStyleState の妥当性に加え、fontFamily / fontWeight の CSS インジェクション
 * 安全性を検証する（`isTextStyleState` は両者を `isString` でしか見ないため補う）。
 */
export const isValidTextStyleState = (o: StateRecord): boolean => {
	if (!isTextStyleState(o)) {
		return false;
	}
	if (
		"fontFamily" in o &&
		o.fontFamily !== undefined &&
		!isCssSafeValue(o.fontFamily)
	) {
		return false;
	}
	if (
		"fontWeight" in o &&
		o.fontWeight !== undefined &&
		!isCssSafeValue(o.fontWeight)
	) {
		return false;
	}
	return true;
};

/** RadiusStyleState の rx を、存在すれば数値で検証する。 */
export const isValidRadiusStyleState = (o: StateRecord): boolean =>
	!("rx" in o) || o.rx === undefined || isNumber(o.rx);

/** 矢印端（startArrow / endArrow）を、存在すれば ArrowType で検証する。 */
export const isValidArrowFields = (o: StateRecord): boolean => {
	if (
		"startArrow" in o &&
		o.startArrow !== undefined &&
		!isArrowType(o.startArrow)
	) {
		return false;
	}
	if ("endArrow" in o && o.endArrow !== undefined && !isArrowType(o.endArrow)) {
		return false;
	}
	return true;
};

/** childIds が文字列配列かを検証する。 */
export const isValidChildIds = (o: StateRecord): boolean =>
	isArray(o.childIds) && o.childIds.every(isString);

/** connector の端点参照（EndpointRef）が妥当かを検証する。 */
export const isValidEndpointRefState = (ref: unknown): boolean =>
	validateEndpointRef(ref, "").length === 0;
