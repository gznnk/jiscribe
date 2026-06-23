import {
	isArray,
	isCssSafeValue,
	isNumber,
	isString,
} from "@workspace/basic-validators";

import { isArrowType } from "../../../schemas/objects/types/ArrowType";
import { isOwnedEndpointRef } from "../../../schemas/objects/types/EndpointRef";
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

/**
 * 必須の数値フィールドを検証する。number であること、`min` 指定時は下限も満たすこと。
 * 下限はスキーマの `minimum` 制約（width/height/半径 ≥ 0 など）に対応する。
 * Doc 側 `validateRequiredNumber`（validateDocUtils）の boolean 版。
 */
const isValidRequiredNumber = (value: unknown, min?: number): boolean =>
	isNumber(value) && (min === undefined || value >= min);

/**
 * 任意の数値フィールドを検証する。未指定（undefined）はエラーにせず、
 * 存在する場合のみ number / 下限を検証する。Doc 側 `validateOptionalNumber` の boolean 版。
 */
const isValidOptionalNumber = (value: unknown, min?: number): boolean =>
	value === undefined || isValidRequiredNumber(value, min);

/** id が非空文字列で、type が期待値に一致するかを検証する。 */
export const hasValidIdAndType = (o: StateRecord, type: ObjectType): boolean =>
	isString(o.id) && o.id.length > 0 && o.type === type;

/**
 * Frame ジオメトリ（cx / cy / width / height が数値）を検証する。
 * width / height はスキーマ上 minimum: 0（位置 cx / cy は下限なし）。
 */
export const isValidFrameState = (o: StateRecord): boolean =>
	isNumber(o.cx) &&
	isNumber(o.cy) &&
	isValidRequiredNumber(o.width, 0) &&
	isValidRequiredNumber(o.height, 0);

/**
 * Poly ジオメトリ（points 配列）を検証する。`minPoints` は最小点数で、
 * Doc 側 `validatePolyFields` の minPoints に対応する（polyline: 2 / polygon: 3）。
 */
export const isValidPolyState = (o: StateRecord, minPoints: number): boolean =>
	isPoly(o) && o.points.length >= minPoints;

/**
 * connector の中間経由点（waypoint）を検証する。端点は source / target が持つため
 * points は経由点のみで、空配列も許容する（Doc 側 `validateWaypointFields` に対応）。
 */
export const isValidWaypointState = (o: StateRecord): boolean => isPoly(o);

/**
 * connector の不変条件: 少なくとも一方の端点が owned であること。
 * 両端 free（owner なし）は ink(polyline) 相当で connector としては不正。
 * Doc 側 `validateConnectorDoc` の同名ルールに対応する。
 */
export const hasOwnedEndpoint = (source: unknown, target: unknown): boolean =>
	isOwnedEndpointRef(source) || isOwnedEndpointRef(target);

/** TransformState（rotation / scaleX / scaleY が数値）を検証する。 */
export const isValidTransformState = (o: StateRecord): boolean =>
	isTransformState(o);

/** StrokeStyleState の任意フィールドを、存在すれば型・安全性で検証する。 */
export const isValidStrokeStyleState = (o: StateRecord): boolean => {
	if ("stroke" in o && o.stroke !== undefined && !isCssSafeValue(o.stroke)) {
		return false;
	}
	// strokeWidth はスキーマ上 minimum: 0
	if (!isValidOptionalNumber(o.strokeWidth, 0)) {
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
	// fontSize はスキーマ上 minimum: 1（isTextStyleState は number までしか見ない）
	if (!isValidOptionalNumber(o.fontSize, 1)) {
		return false;
	}
	return true;
};

/** RadiusStyleState の rx を、存在すれば数値（スキーマ上 minimum: 0）で検証する。 */
export const isValidRadiusStyleState = (o: StateRecord): boolean =>
	isValidOptionalNumber(o.rx, 0);

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

/**
 * childIds が非空の文字列配列かを検証する。
 * 空 group は bounds が定まらない退化状態で、生成経路では必ず子を持つため、
 * 空配列は破損由来とみなして弾く（Doc 側 validateStructure の空 children 拒否に対応）。
 * 子 ID が `objects` に実在するか（自己完結性）は isClipboardData が横断検証する。
 */
export const isValidChildIds = (o: StateRecord): boolean =>
	isArray(o.childIds) && o.childIds.length > 0 && o.childIds.every(isString);

/** connector の端点参照（EndpointRef）が妥当かを検証する。 */
export const isValidEndpointRefState = (ref: unknown): boolean =>
	validateEndpointRef(ref, "").length === 0;
