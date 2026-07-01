import type { SemanticDiagnostic } from "./types";
import type { ObjectDoc } from "../../objects/base/ObjectDoc";
import type { ConnectorDoc } from "../../objects/connections/connector/ConnectorDoc";
import type { GroupDoc } from "../../objects/primitives/group/GroupDoc";
import type { EndpointRef } from "../../objects/types/EndpointRef";
import type { ObjectType } from "../../objects/types/ObjectType";
import { objectDocValidatorRegistry } from "../../registry/ObjectDocValidatorRegistry";
import type { CanvasDoc } from "../CanvasDoc";

/**
 * Checks consistency that can only be determined by traversing the whole document.
 * (Per-node types and required fields are handled by validateStructure / each validateXxxDoc.)
 *
 * - A. ID uniqueness: IDs must not be duplicated across the root tree (including connectors).
 *   Because CanvasDoc is a nested tree, a parent/child cycle cannot occur structurally;
 *   any case that looks like a cycle is really "a different object with the same ID" = an ID duplicate.
 * - B. Connector referential integrity:
 *   - The owner.id of an owned endpoint must exist
 *   - The referenced object must be a connectable type (group/polyline/polygon/connector are not allowed)
 *
 * Self-loops (source and target are the same object) are allowed. They are drawn as a
 * rectangular loop using a dedicated orthogonal route (see resolveConnectorPoints / routeSelfLoop).
 */
export function validateSemantics(doc: CanvasDoc): SemanticDiagnostic[] {
	const errors: SemanticDiagnostic[] = [];
	const seenIds = new Set<string>();
	// id → type map, used to look up the actual type of a reference target during referential-integrity checks.
	const idToType = new Map<string, ObjectType>();

	// --- A. ID uniqueness across the root tree + build the id→type map ---
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

	// --- B. Connector referential integrity ---
	// Connectors exist only directly under root (never as children of a group).
	// ID uniqueness and the id→type map are already handled by traverse(root) above, connectors included.
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
 * For an owned endpoint (has an owner), validates that the reference target exists and is connectable.
 * A free endpoint (no owner) has nothing to validate across the document, so it returns nothing.
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
