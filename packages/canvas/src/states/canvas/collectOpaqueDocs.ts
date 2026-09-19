import type { ObjectDoc } from "@jiscribe/doc/model/objects/base/ObjectDoc";
import { ConnectorFeatures } from "@jiscribe/doc/model/objects/connector/ConnectorDoc";
import type { GroupDoc } from "@jiscribe/doc/model/objects/primitives/group/GroupDoc";
import { GroupFeatures } from "@jiscribe/doc/model/objects/primitives/group/GroupDoc";
import type { ObjectType } from "@jiscribe/doc/model/objects/types/ObjectType";

import { readEndpointOwnerId } from "../utils/readEndpointOwnerId";

/**
 * The docs a canvas holds aside as opaque objects rather than mapping them into
 * state. Three kinds, each needing the ones before it:
 *   - an object whose type the canvas has no mapper for
 *   - a group every child of which is opaque: it would be a group with nothing
 *     to draw, so it is held whole, children included
 *   - a connector with an end on an object the state will not hold, since
 *     nothing could resolve where that end is
 *
 * Nothing inside an opaque doc is visited, so a doc nested in one is not in the
 * set on its own: it goes wherever its opaque ancestor goes.
 *
 * @param root - The document's root, as the parser accepted it
 * @param isKnownType - Whether the canvas maps objects of a type into state
 * @returns The opaque docs by identity; empty for a document of known types only
 */
export const collectOpaqueDocs = (
	root: readonly ObjectDoc[],
	isKnownType: (type: ObjectType) => boolean,
): ReadonlySet<ObjectDoc> => {
	const opaqueDocs = new Set<ObjectDoc>();

	// Every child is classified, not just the first known one, so a group left
	// holding something still has its opaque children marked.
	const classify = (objectDoc: ObjectDoc): boolean => {
		if (!isKnownType(objectDoc.type)) {
			opaqueDocs.add(objectDoc);
			return true;
		}
		if (objectDoc.type === GroupFeatures.type) {
			const childResults = (objectDoc as GroupDoc).children.map(classify);
			if (childResults.every((isOpaque) => isOpaque)) {
				opaqueDocs.add(objectDoc);
				return true;
			}
		}
		return false;
	};
	root.forEach(classify);

	const connectors = root.filter(
		(objectDoc) =>
			objectDoc.type === ConnectorFeatures.type && !opaqueDocs.has(objectDoc),
	);
	if (opaqueDocs.size === 0 || connectors.length === 0) {
		return opaqueDocs;
	}

	const heldIds = new Set<string>();
	const collectHeldIds = (siblings: readonly ObjectDoc[]): void => {
		siblings.forEach((objectDoc) => {
			if (opaqueDocs.has(objectDoc)) {
				return;
			}
			heldIds.add(objectDoc.id);
			if (objectDoc.type === GroupFeatures.type) {
				collectHeldIds((objectDoc as GroupDoc).children);
			}
		});
	};
	collectHeldIds(root);

	connectors.forEach((connectorDoc) => {
		const endpoints = connectorDoc as ObjectDoc & {
			source?: unknown;
			target?: unknown;
		};
		const isHeldEnd = (endpoint: unknown): boolean => {
			const ownerId = readEndpointOwnerId(endpoint);
			return ownerId === undefined || heldIds.has(ownerId);
		};
		if (!isHeldEnd(endpoints.source) || !isHeldEnd(endpoints.target)) {
			opaqueDocs.add(connectorDoc);
		}
	});
	return opaqueDocs;
};
