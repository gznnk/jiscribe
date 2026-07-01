import {
	isCssSafeValue,
	isNumber,
	isString,
} from "@workspace/basic-validators";

import type { SemanticDiagnostic } from "../../../canvas/validators/types";
import type { ObjectDocValidateFn } from "../../../registry/ObjectDocValidatorRegistry";
import { isConnectorRouting } from "../../types/ConnectorRouting";
import { isOwnedEndpointRef } from "../../types/EndpointRef";
import { isStrokeDashType } from "../../types/StrokeDashType";
import {
	validateArrowFields,
	validateEndpointRef,
	validateOptionalNumber,
	validateStrokeStyleFields,
	validateWaypointFields,
} from "../../utils/validateDocUtils";

/**
 * Connector の `label`（ネストした注記）を検証する。
 * 図形本文の TextStyleDoc と異なり、線上の短いタグ用にフィールドを絞る
 * （`text` 必須、配置 `position`/`offset`、スタイルは色・サイズ・太さのみ）。
 * 未指定（キー無し）はラベル無しとして許容する。connector 専用のため呼び出し元に同居させる。
 */
function validateConnectorLabelFields(
	o: Record<string, unknown>,
	path: string,
): SemanticDiagnostic[] {
	// 図形の本文テキストと取り違えてトップレベル `text` を書く誤りを明示的に弾く。
	const errors: SemanticDiagnostic[] = [];
	if ("text" in o) {
		errors.push({
			path: `${path}.text`,
			message:
				"connector has no top-level text; put the label in `label.text` instead.",
		});
	}

	if (!("label" in o) || o.label === undefined) {
		return errors;
	}

	const label = o.label;
	if (typeof label !== "object" || label === null) {
		return [...errors, { path: `${path}.label`, message: "must be an object" }];
	}

	const l = label as Record<string, unknown>;
	const labelPath = `${path}.label`;

	if (!isString(l.text)) {
		errors.push({ path: `${labelPath}.text`, message: "must be a string" });
	}
	if ("position" in l && l.position !== undefined) {
		if (!isNumber(l.position) || l.position < 0 || l.position > 1) {
			errors.push({
				path: `${labelPath}.position`,
				message: "must be a number between 0 and 1",
			});
		}
	}
	errors.push(...validateOptionalNumber(l, labelPath, "offset"));
	if ("fontColor" in l && !isCssSafeValue(l.fontColor)) {
		errors.push({
			path: `${labelPath}.fontColor`,
			message: "must be a safe CSS color value",
			beyondSchema: true,
		});
	}
	errors.push(...validateOptionalNumber(l, labelPath, "fontSize", 1));
	if ("fontWeight" in l && !isCssSafeValue(l.fontWeight)) {
		errors.push({
			path: `${labelPath}.fontWeight`,
			message: "must be a safe CSS font-weight value",
			beyondSchema: true,
		});
	}
	// 背景（fill）・枠線（stroke 色 + strokeWidth 太さ）。図形と同じ語彙。
	if ("fill" in l && !isCssSafeValue(l.fill)) {
		errors.push({
			path: `${labelPath}.fill`,
			message: "must be a safe CSS color value",
			beyondSchema: true,
		});
	}
	if ("stroke" in l && !isCssSafeValue(l.stroke)) {
		errors.push({
			path: `${labelPath}.stroke`,
			message: "must be a safe CSS color value",
			beyondSchema: true,
		});
	}
	errors.push(...validateOptionalNumber(l, labelPath, "strokeWidth", 0));
	if ("strokeDashType" in l && !isStrokeDashType(l.strokeDashType)) {
		errors.push({
			path: `${labelPath}.strokeDashType`,
			message: "must be one of: solid, dashed, dotted",
		});
	}
	return errors;
}

// points は中間経由点のみ（端点は source/target が持つ）のため空配列を許容する
export const validateConnectorDoc: ObjectDocValidateFn = (o, path) => [
	...validateWaypointFields(o, path),
	...validateStrokeStyleFields(o, path),
	...validateArrowFields(o, path),
	...validateConnectorLabelFields(o, path),
	...validateEndpointRef(o.source, `${path}.source`),
	...validateEndpointRef(o.target, `${path}.target`),
	// routing は任意。指定する場合は既知の値のみ許容する。
	...("routing" in o &&
	o.routing !== undefined &&
	!isConnectorRouting(o.routing)
		? [
				{
					path: `${path}.routing`,
					message: `connector.routing must be one of "straight" | "orthogonal".`,
					...(typeof o.id === "string" ? { id: o.id } : {}),
				},
			]
		: []),
	// 不変条件: connector は少なくとも一方の端点が owned であること。
	// 両端 free（owner なし）は ink(polyline) 相当で connector としては不正。
	...(!isOwnedEndpointRef(o.source) && !isOwnedEndpointRef(o.target)
		? [
				{
					path,
					message:
						"connector must have at least one owned endpoint (both endpoints are free).",
					// このルールは JSON スキーマ（ConnectorDoc の not 制約）でも表現済みのため、
					// beyondSchema は付けない（拡張は構造エラーとしてスキーマに委ね二重表示を回避）。
					// validator 側にも残すのは、スキーマを持たない webview / MCP のため。
					...(typeof o.id === "string" ? { id: o.id } : {}),
				},
			]
		: []),
];
