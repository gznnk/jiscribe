import type { SemanticDiagnostic } from "./types";
import type { ObjectDoc } from "../../objects/base/ObjectDoc";
import type { ConnectorDoc } from "../../objects/connections/connector/ConnectorDoc";
import type { GroupDoc } from "../../objects/primitives/group/GroupDoc";
import type { EndpointRef } from "../../objects/types/EndpointRef";
import type { ObjectType } from "../../objects/types/ObjectType";
import type { createObjectDocValidatorRegistry } from "../../registry/ObjectDocValidatorRegistry";
import type { CanvasDoc } from "../CanvasDoc";

type ObjectDocValidatorRegistry = ReturnType<
	typeof createObjectDocValidatorRegistry
>;

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
 *   - A self-loop must not use a `center` anchor on either end
 *
 * Self-loops (source and target are the same object) are allowed and drawn as a rectangular loop
 * using a dedicated orthogonal route (see resolveConnectorPoints / routeSelfLoop). That route only
 * works when both ends are pinned to a connectPoint: a `center` anchor resolves to the outline point
 * toward the opposite end, which for a self-loop collapses to null (adjustToOutline fails), leaving
 * the connector silently undrawn. So a self-loop with a center anchor is rejected here.
 */
export function validateSemantics(
	doc: CanvasDoc,
	registry: ObjectDocValidatorRegistry,
): SemanticDiagnostic[] {
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
				registry,
			);
			const targetErrors = validateEndpoint(
				connector.target,
				`${connPath}.target`,
				idToType,
				registry,
			);
			errors.push(...sourceErrors, ...targetErrors);

			// A self-loop drawn via routeSelfLoop needs both ends pinned to a connectPoint; a center
			// anchor collapses to null and the connector goes silently undrawn. Reject it here.
			// Only judge when both ends are otherwise valid: a broken/non-connectable reference is the
			// real cause and we avoid a misleading "same object" message when an id does not exist.
			if (sourceErrors.length === 0 && targetErrors.length === 0) {
				const sourceOwnerId = connector.source?.owner?.id;
				const targetOwnerId = connector.target?.owner?.id;
				const isSelfLoop =
					sourceOwnerId != null && sourceOwnerId === targetOwnerId;
				const usesCenterAnchor =
					connector.source?.anchor?.kind === "center" ||
					connector.target?.anchor?.kind === "center";
				if (isSelfLoop && usesCenterAnchor) {
					errors.push({
						path: connPath,
						message: `Self-loop connector on object "${sourceOwnerId}" cannot use a center anchor; pin both ends to a connectPoint.`,
						id: connector.id,
					});
				}
			}
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
	registry: ObjectDocValidatorRegistry,
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

	if (!registry.isConnectable(refType)) {
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
