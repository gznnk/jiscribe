import type { SemanticDiagnostic } from "./types";
import type { ObjectDoc } from "../../objects/base/ObjectDoc";
import type { GroupDoc } from "../../objects/primitives/group/GroupDoc";
import type { EndpointRef } from "../../objects/types/EndpointRef";
import type { ObjectType } from "../../objects/types/ObjectType";
import { objectDocValidatorRegistry } from "../../registry/ObjectDocValidatorRegistry";
import type { CanvasDoc } from "../CanvasDoc";

/**
 * 文書全体を横断しないと判断できない整合性をチェックする。
 * （単体ノードの型・必須フィールドは validateStructure / 各 validateXxxDoc が担当）
 *
 * - A. ID の一意性: root ツリー + connectors を通じて ID が重複しないこと。
 *   CanvasDoc はネストしたツリーなので「親子の循環」は構造的に発生せず、
 *   循環に見えるケースは実質「同一 ID の別オブジェクト」= ID 重複でしかない。
 * - B. connector の参照整合性:
 *   - owned 端点の owner.id が実在すること
 *   - 参照先が connectable な型であること（group/polyline/polygon/connector は不可）
 *   - source と target が同一オブジェクトを指していないこと（自己ループ禁止）
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

	if (doc.connectors) {
		// 先に全 connector の ID を登録（重複検出 + 参照整合性で実型を引けるように）。
		doc.connectors.forEach((connector, index) => {
			const connPath = `connectors[${index}]`;
			if (seenIds.has(connector.id)) {
				errors.push({
					path: connPath,
					message: `Connector ID "${connector.id}" is duplicated.`,
					id: connector.id,
				});
			}
			seenIds.add(connector.id);
			idToType.set(connector.id, connector.type);
		});

		// --- B. connector の参照整合性 ---
		doc.connectors.forEach((connector, index) => {
			const connPath = `connectors[${index}]`;

			errors.push(
				...validateEndpoint(connector.source, `${connPath}.source`, idToType),
			);
			errors.push(
				...validateEndpoint(connector.target, `${connPath}.target`, idToType),
			);

			// 自己ループ禁止: 両端が同一オブジェクトを指す接続は未サポート。
			const sourceOwnerId = connector.source?.owner?.id;
			const targetOwnerId = connector.target?.owner?.id;
			if (sourceOwnerId != null && sourceOwnerId === targetOwnerId) {
				errors.push({
					path: connPath,
					message: `Connector source and target refer to the same object "${sourceOwnerId}".`,
					id: connector.id,
				});
			}
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
