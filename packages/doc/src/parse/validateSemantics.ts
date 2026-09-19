import type { CanvasDoc } from "../model/canvas/CanvasDoc";
import type { ObjectDoc } from "../model/objects/base/ObjectDoc";
import type { ConnectorDoc } from "../model/objects/connector/ConnectorDoc";
import type { GroupDoc } from "../model/objects/primitives/group/GroupDoc";
import type { EndpointRef } from "../model/objects/types/EndpointRef";
import type { ObjectType } from "../model/objects/types/ObjectType";
import type { SemanticDiagnostic } from "../model/types/SemanticDiagnostic";
import type { ObjectDocValidatorRegistry } from "../plugin/ObjectDocValidatorRegistry";

/**
 * Checks consistency that can only be determined by traversing the whole document.
 * (Per-node types and required fields are handled by validateStructure / each validateXxxDoc.)
 *
 * - A. ID uniqueness: IDs must not be duplicated across the root tree (including connectors).
 *   Because CanvasDoc is a nested tree, a parent/child cycle cannot occur structurally;
 *   any case that looks like a cycle is really "a different object with the same ID" = an ID duplicate.
 * - B. Connector referential integrity:
 *   - The owner.id of an owned endpoint must exist (an object of an unknown type, or one
 *     nested inside it, counts: it is kept as an opaque object, see OpaqueObjectDoc)
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
	// Ids found inside opaque objects. Their structure is not ours to read, so they are
	// neither checked for uniqueness nor typed, but a connector may still be attached there.
	const opaqueInnerIds = new Set<string>();

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

			if (registry.getFeatures(obj.type) === undefined) {
				collectOpaqueInnerIds(obj, opaqueInnerIds);
				return;
			}

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
				opaqueInnerIds,
				registry,
			);
			const targetErrors = validateEndpoint(
				connector.target,
				`${connPath}.target`,
				idToType,
				opaqueInnerIds,
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
 * Adds every id nested inside an opaque object, whatever the key holding it. Only
 * `children` arrays are descended, as the old unknown-type cascade did: that is where
 * a container type from elsewhere would put the objects a connector can reach.
 */
function collectOpaqueInnerIds(obj: ObjectDoc, ids: Set<string>): void {
	const children = (obj as { children?: unknown }).children;
	if (!Array.isArray(children)) {
		return;
	}
	for (const child of children as unknown[]) {
		if (typeof child !== "object" || child === null) {
			continue;
		}
		const childId = (child as { id?: unknown }).id;
		if (typeof childId === "string") {
			ids.add(childId);
		}
		collectOpaqueInnerIds(child as ObjectDoc, ids);
	}
}

/**
 * For an owned endpoint (has an owner), validates that the reference target exists and is connectable.
 * A free endpoint (no owner) has nothing to validate across the document, so it returns nothing.
 * A target inside or of an opaque object passes: its type is not one this registry can judge.
 */
function validateEndpoint(
	endpoint: EndpointRef | undefined,
	path: string,
	idToType: Map<string, ObjectType>,
	opaqueInnerIds: ReadonlySet<string>,
	registry: ObjectDocValidatorRegistry,
): SemanticDiagnostic[] {
	const ownerId = endpoint?.owner?.id;
	if (ownerId == null) {
		return [];
	}

	const refType = idToType.get(ownerId);
	if (refType == null) {
		if (opaqueInnerIds.has(ownerId)) {
			return [];
		}
		return [
			{
				path,
				message: `Endpoint owner ID "${ownerId}" does not exist.`,
				id: ownerId,
			},
		];
	}

	if (registry.getFeatures(refType) === undefined) {
		return [];
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
