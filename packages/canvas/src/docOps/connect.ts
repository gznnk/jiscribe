import { DocOperationError } from "./errors";
import { generateUniqueId } from "./ids";
import type { CanvasDoc } from "../schemas/canvas/CanvasDoc";
import type { ObjectDoc } from "../schemas/objects/base/ObjectDoc";
import type { ArrowType } from "../schemas/objects/types/ArrowType";
import { defaultRoutingForAnchors } from "../schemas/objects/types/ConnectorRouting";
import type {
	ConnectPointId,
	OwnedEndpointRef,
} from "../schemas/objects/types/EndpointRef";
import type { ObjectDocDefinition } from "../schemas/plugin/ObjectDocDefinition";

/**
 * Selectable anchor position. "center" becomes a CenterAnchorSpec and an edge midpoint
 * becomes a connectPoint; "center" is never a connectPoint id.
 */
export type AnchorHandleId = "center" | ConnectPointId;

export type ConnectParams = {
	/** Id of the object the connector leaves; must exist in the root tree and be connectable. */
	sourceId: string;
	/** Id of the object the connector enters; must exist in the root tree and be connectable. */
	targetId: string;
	/** Where the connector leaves the source; omitted means "center". */
	sourceAnchor?: AnchorHandleId;
	/** Where the connector enters the target; omitted means "center". */
	targetAnchor?: AnchorHandleId;
	/** Arrowhead at the source end; omitted leaves the property off the doc entirely. */
	startArrow?: ArrowType;
	/** Arrowhead at the target end; omitted leaves the property off the doc entirely. */
	endArrow?: ArrowType;
};

/**
 * Connect two objects with a connector and return the generated id.
 *
 * @param doc - Mutated in place: the created connector is pushed onto `doc.root`
 * @param params - Both endpoints, plus optional anchors and arrowheads; the anchor kinds decide
 *   the default routing, so a center endpoint yields a straight line
 * @param definitions - Type table whose `features.connectable` decides which endpoints are legal
 * @returns The id assigned to the new connector, `connector-N` unique across the root tree
 * @throws {@link DocOperationError} with a user-facing message when either endpoint is missing
 *   from the root tree or is not connectable
 */
export function connect(
	doc: CanvasDoc,
	params: ConnectParams,
	definitions: ReadonlyMap<string, ObjectDocDefinition>,
): string {
	const sourceId = requireConnectable(doc, params.sourceId, definitions);
	const targetId = requireConnectable(doc, params.targetId, definitions);

	const id = generateUniqueId(doc, "connector");
	const source = buildEndpoint(sourceId, params.sourceAnchor);
	const target = buildEndpoint(targetId, params.targetAnchor);
	// A center endpoint defaults to straight; only two connectPoints leave routing omitted.
	const routing = defaultRoutingForAnchors(source.anchor, target.anchor);
	const connector = {
		id,
		type: "connector",
		source,
		target,
		points: [],
		...(routing !== undefined ? { routing } : {}),
		...(params.startArrow !== undefined
			? { startArrow: params.startArrow }
			: {}),
		...(params.endArrow !== undefined ? { endArrow: params.endArrow } : {}),
	};
	doc.root.push(connector as unknown as ObjectDoc);
	return id;
}

/** Return `id` when the object exists in the root tree and is connectable, else throw. */
function requireConnectable(
	doc: CanvasDoc,
	id: string,
	definitions: ReadonlyMap<string, ObjectDocDefinition>,
): string {
	// ids.ts guarantees uniqueness by recursing into group children, so this lookup must
	// recurse too — otherwise objects inside a group could not be connected (#115).
	const found = findObjectById(doc.root, id);
	if (found === undefined) {
		throw new DocOperationError(`object not found: ${id}`);
	}
	const definition = definitions.get(found.type);
	if (definition === undefined || definition.features.connectable !== true) {
		const connectableTypes = [...definitions]
			.filter(([, candidate]) => candidate.features.connectable === true)
			.map(([candidateType]) => candidateType);
		throw new DocOperationError(
			`object ${id} is "${found.type}" which is not connectable (connectable: ${connectableTypes.join(" / ")}).`,
		);
	}
	return id;
}

/** First object matching `id`, searching the root tree recursively through group children. */
function findObjectById(
	objects: ObjectDoc[],
	id: string,
): ObjectDoc | undefined {
	for (const object of objects) {
		if (object.id === id) {
			return object;
		}
		const children = (object as { children?: unknown }).children;
		if (Array.isArray(children)) {
			const found = findObjectById(children as ObjectDoc[], id);
			if (found !== undefined) {
				return found;
			}
		}
	}
	return undefined;
}

function buildEndpoint(
	ownerId: string,
	anchorId: AnchorHandleId | undefined,
): OwnedEndpointRef {
	const anchor: OwnedEndpointRef["anchor"] =
		anchorId === undefined || anchorId === "center"
			? { kind: "center" }
			: { kind: "connectPoint", id: anchorId };
	return { owner: { id: ownerId }, anchor };
}
