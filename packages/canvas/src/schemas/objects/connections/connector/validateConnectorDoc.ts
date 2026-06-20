import type { ObjectDocValidateFn } from "../../../registry/ObjectDocValidatorRegistry";
import { isOwnedEndpointRef } from "../../types/EndpointRef";
import {
	validateArrowFields,
	validateEndpointRef,
	validateStrokeStyleFields,
	validateWaypointFields,
} from "../../utils/validateDocUtils";

// points は中間経由点のみ（端点は source/target が持つ）のため空配列を許容する
export const validateConnectorDoc: ObjectDocValidateFn = (o, path) => [
	...validateWaypointFields(o, path),
	...validateStrokeStyleFields(o, path),
	...validateArrowFields(o, path),
	...validateEndpointRef(o.source, `${path}.source`),
	...validateEndpointRef(o.target, `${path}.target`),
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
