import type { SemanticDiagnostic } from "./types";
import type { ObjectDoc } from "../../objects/base/ObjectDoc";
import type { ConnectorDoc } from "../../objects/connections/connector/ConnectorDoc";
import type { GroupDoc } from "../../objects/primitives/group/GroupDoc";
import type { EndpointRef } from "../../objects/types/EndpointRef";
import type { ObjectType } from "../../objects/types/ObjectType";
import { objectDocValidatorRegistry } from "../../registry/ObjectDocValidatorRegistry";
import type { CanvasDoc } from "../CanvasDoc";

/**
 * 文書全体を横断しないと判断できない整合性をチェックする。
 * （単体ノードの型・必須フィールドは validateStructure / 各 validateXxxDoc が担当）
 *
 * - A. ID の一意性: root ツリー（connector 含む）を通じて ID が重複しないこと。
 *   CanvasDoc はネストしたツリーなので「親子の循環」は構造的に発生せず、
 *   循環に見えるケースは実質「同一 ID の別オブジェクト」= ID 重複でしかない。
 * - B. connector の参照整合性:
 *   - owned 端点の owner.id が実在すること
 *   - 参照先が connectable な型であること（group/polyline/polygon/connector は不可）
 *
 * 自己ループ（source と target が同一オブジェクト）は許可する。専用の直交ルートで
 * 矩形ループとして描画される（resolveConnectorPoints / routeSelfLoop を参照）。
 */
export function validateSemantics(doc: CanvasDoc): SemanticDiagnostic[] {
	const errors: SemanticDiagnostic[] = [];
	const seenIds = new Set<string>();
	// 参照整合性で参照先の実型を引くための id → type マップ。
	const idToType = new Map<string, ObjectType>();

	// --- A. root ツリーの ID 一意性 + id→type マップ構築 ---
	const traverse = (objects: ObjectDoc[], currentPath: string) => {
		objects.forEach((obj, index) => {
			const objPath = `${currentPath}[${index}]`;

			if (seenIds.has(obj.id)) {
				errors.push({
					path: objPath,
					message: `ID "${obj.id}" is duplicated.`,
					id: obj.id,
				});
			}
			seenIds.add(obj.id);
			idToType.set(obj.id, obj.type);

			if (obj.type === "group") {
				const group = obj as GroupDoc;
				if (group.children) {
					traverse(group.children, `${objPath}.children`);
				}
			}
		});
	};

	if (doc.root) {
		traverse(doc.root, "root");
	}

	// --- B. connector の参照整合性 ---
	// connector は root 直下のみに存在する（group の子にはならない）。
	// ID 一意性・id→type マップ構築は上の traverse(root) が connector も含めて済ませている。
	if (doc.root) {
		doc.root.forEach((obj, index) => {
			if (obj.type !== "connector") {
				return;
			}
			const connector = obj as ConnectorDoc;
			const connPath = `root[${index}]`;

			const sourceErrors = validateEndpoint(
				connector.source,
				`${connPath}.source`,
				idToType,
			);
			const targetErrors = validateEndpoint(
				connector.target,
				`${connPath}.target`,
				idToType,
			);
			errors.push(...sourceErrors, ...targetErrors);
		});
	}

	return errors;
}

/**
 * owned 端点（owner あり）について、参照先の存在と接続可能性を検証する。
 * free 端点（owner なし）は横断的に検証する対象がないため何も返さない。
 */
function validateEndpoint(
	endpoint: EndpointRef | undefined,
	path: string,
	idToType: Map<string, ObjectType>,
): SemanticDiagnostic[] {
	const ownerId = endpoint?.owner?.id;
	if (ownerId == null) {
		return [];
	}

	const refType = idToType.get(ownerId);
	if (refType == null) {
		return [
			{
				path,
				message: `Endpoint owner ID "${ownerId}" does not exist.`,
				id: ownerId,
			},
		];
	}

	if (!objectDocValidatorRegistry.isConnectable(refType)) {
		return [
			{
				path,
				message: `Endpoint owner "${ownerId}" of type "${refType}" is not connectable.`,
				id: ownerId,
			},
		];
	}

	return [];
}
