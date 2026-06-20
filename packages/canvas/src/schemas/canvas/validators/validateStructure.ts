import {
	isArray,
	isNumber,
	isObject,
	isString,
} from "@workspace/basic-validators";

import type { SemanticDiagnostic } from "./types";
import { objectDocValidatorRegistry } from "../../registry/ObjectDocValidatorRegistry";

function validateObjectNode(obj: unknown, path: string): SemanticDiagnostic[] {
	if (!isObject(obj)) {
		return [{ path, message: "must be an object" }];
	}

	const o = obj as Record<string, unknown>;
	const errors: SemanticDiagnostic[] = [];

	if (!isString(o.id) || (o.id as string).length === 0) {
		errors.push({ path: `${path}.id`, message: "must be a non-empty string" });
	}

	if (!isString(o.type)) {
		errors.push({ path: `${path}.type`, message: "must be a string" });
		return errors;
	}

	// 型ごとのバリデーションをレジストリへ委譲
	errors.push(
		...objectDocValidatorRegistry.validate(o.type as string, o, path),
	);

	// group の children 再帰は構造的ルールなので validateStructure 側で処理する
	if (o.type === "group") {
		if (!isArray(o.children)) {
			errors.push({ path: `${path}.children`, message: "must be an array" });
		} else {
			(o.children as unknown[]).forEach((child, i) => {
				errors.push(...validateObjectNode(child, `${path}.children[${i}]`));
			});
		}
	}

	return errors;
}

export function validateStructure(doc: unknown): SemanticDiagnostic[] {
	if (!isObject(doc)) {
		return [
			{
				path: "/",
				message: "Document must be an object with a 'root' field",
			},
		];
	}

	const d = doc as Record<string, unknown>;
	const errors: SemanticDiagnostic[] = [];

	if (!isNumber(d.version) || !Number.isInteger(d.version) || d.version < 1) {
		errors.push({ path: "version", message: "must be a positive integer" });
	}

	if (!isArray(d.root)) {
		errors.push({ path: "root", message: "must be an array" });
	} else {
		// root はオブジェクトとコネクターの混在配列。型別検証は validateObjectNode
		// → registry が type ごとに振り分ける（connector は validateConnectorDoc）。
		(d.root as unknown[]).forEach((obj, i) => {
			errors.push(...validateObjectNode(obj, `root[${i}]`));
		});
	}

	return errors;
}
