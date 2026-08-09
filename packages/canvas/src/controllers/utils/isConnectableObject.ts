import type { ObjectState } from "../../states/objects/base/ObjectState";
import type { ObjectMapperRegistry } from "../../states/registry/ObjectMapperRegistry";

/**
 * Whether the object may own a connector endpoint.
 *
 * The answer comes from the type's registered `features.connectable`, never from
 * the state, so the type definition stays the single source: a state carries a
 * stamped copy of the descriptor, but synthetic states (the multi-select group)
 * and hand-built ones carry none.
 *
 * The doc-side counterpart is `ObjectDocValidatorRegistry.isConnectable`, which
 * rejects an endpoint pointing at a non-connectable type at parse time — so a
 * connection this predicate lets through must be one that validator accepts too.
 *
 * @param object - The candidate endpoint owner; null/undefined (nothing hovered,
 *   dangling reference) is not connectable
 * @param objectMapperRegistry - Registry the type's feature descriptor is read
 *   from; a type it does not know is not connectable
 * @returns True only when the type declares `connectable: true`
 */
export const isConnectableObject = (
	object: ObjectState | null | undefined,
	objectMapperRegistry: Pick<ObjectMapperRegistry, "getFeatures">,
): boolean =>
	object != null &&
	objectMapperRegistry.getFeatures(object.type)?.connectable === true;
