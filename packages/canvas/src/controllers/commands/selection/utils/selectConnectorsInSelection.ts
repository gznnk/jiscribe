import { isOwnedEndpointRef } from "../../../../schemas/objects/types/EndpointRef";
import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../../../states/objects/connector/ConnectorState";

/**
 * Extracts the connector IDs that should be included in the selection.
 *
 * Rule: a free endpoint does not block inclusion, but at least one endpoint must be
 * both owned and inside the selection.
 *
 * - Both endpoints owned + in selection → included
 * - One endpoint owned + in selection / other free → included
 * - Both endpoints free (floating connector) → excluded
 * - Has an owned endpoint that is outside the selection → excluded
 *
 * Shared so that Copy and Duplicate use the same criterion.
 *
 * @param connectorIds - List of connector IDs to scan
 * @param objects - Flat object map
 * @param selectedIdsWithDescendants - Set of selected IDs plus all descendants
 * @returns Array of connector IDs to include (preserving input order)
 */
export function selectConnectorsInSelection(
	connectorIds: readonly string[],
	objects: Record<string, ObjectState>,
	selectedIdsWithDescendants: ReadonlySet<string>,
): string[] {
	const result: string[] = [];
	for (const connId of connectorIds) {
		const conn = objects[connId] as ConnectorState | undefined;
		if (!conn) {
			continue;
		}
		const sourceOwned = isOwnedEndpointRef(conn.source);
		const targetOwned = isOwnedEndpointRef(conn.target);
		const sourceSelected =
			isOwnedEndpointRef(conn.source) &&
			selectedIdsWithDescendants.has(conn.source.owner.id);
		const targetSelected =
			isOwnedEndpointRef(conn.target) &&
			selectedIdsWithDescendants.has(conn.target.owner.id);
		// Exclude connectors with an owned endpoint that lies outside the selection
		if ((sourceOwned && !sourceSelected) || (targetOwned && !targetSelected)) {
			continue;
		}
		// Require at least one endpoint that is owned and inside the selection (exclude both-free)
		if (!sourceSelected && !targetSelected) {
			continue;
		}
		result.push(connId);
	}
	return result;
}
