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

	// 未登録（未知）の type はここで弾く。これを通すと検証は ok を返すが、
	// canvasToState の mapper 解決で例外になりエディタごとクラッシュする。
	// レジストリに features があれば登録済み。
	if (objectDocValidatorRegistry.getFeatures(o.type as string) === undefined) {
		errors.push({
			path: `${path}.type`,
			message: `Unknown object type "${o.type as string}".`,
		});
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
		} else if ((o.children as unknown[]).length === 0) {
			// 空 group は bounds が定まらない退化状態。生成経路では必ず子を持つため、
			// 空の children は破損由来とみなして境界で弾く。
			errors.push({
				path: `${path}.children`,
				message: "group must have at least one child",
			});
		} else {
			(o.children as unknown[]).forEach((child, i) => {
				const childPath = `${path}.children[${i}]`;
				// 不変条件: コネクターは root 直下のみ。group の子には置けない。
				if (
					isObject(child) &&
					(child as Record<string, unknown>).type === "connector"
				) {
					errors.push({
						path: childPath,
						message:
							"connector must be a top-level entry of 'root', not inside a group's children",
					});
				}
				errors.push(...validateObjectNode(child, childPath));
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

	// 旧フォーマット（connectors を別配列で持つ）はサイレントに connector を失うため、
	// マイグレーションはせず fail-fast で明示エラーにする（connectors は root へ統合済み）。
	if (d.connectors !== undefined) {
		errors.push({
			path: "connectors",
			message:
				"'connectors' is no longer a top-level field; place connectors inside 'root' as \"type\": \"connector\" entries (z-order).",
		});
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
