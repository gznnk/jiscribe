/**
 * Per-connector memory of the last routed topology signature (`calcPathSignature`).
 *
 * The orthogonal router is a pure function of the current geometry, but route selection needs
 * one bit of history for hysteresis: which topology was drawn on the previous frame. That memory
 * lives here, keyed by connector id, so **every** caller of `resolveConnectorPoints` (rendering,
 * bounding-box calculation, editors) sees the same sticky choice and the drawn line never
 * disagrees with the computed bounds.
 *
 * The signature only biases ties/near-ties among candidates (see PREVIOUS_ROUTE_BONUS in
 * `routeCost`), so a stale entry is harmless: it can never force a route that crosses a shape,
 * and it is overwritten on the next routing of that connector.
 */

/** Upper bound on remembered connectors. Beyond this, the oldest entries are evicted (FIFO). */
const ROUTE_MEMORY_LIMIT = 4096;

const lastSignatures = new Map<string, string>();

/**
 * Returns the topology signature last routed for the connector, or null if none is remembered.
 *
 * @param connectorId - The connector's object id
 * @returns The remembered signature, or null
 */
export const getLastRouteSignature = (connectorId: string): string | null =>
	lastSignatures.get(connectorId) ?? null;

/**
 * Remembers the topology signature just routed for the connector.
 *
 * @param connectorId - The connector's object id
 * @param signature - The routed path's topology signature (`calcPathSignature`)
 */
export const setLastRouteSignature = (
	connectorId: string,
	signature: string,
): void => {
	if (
		lastSignatures.size >= ROUTE_MEMORY_LIMIT &&
		!lastSignatures.has(connectorId)
	) {
		const oldestId = lastSignatures.keys().next().value;
		if (oldestId !== undefined) {
			lastSignatures.delete(oldestId);
		}
	}
	lastSignatures.set(connectorId, signature);
};

/**
 * Clears all remembered signatures. For tests (isolate hysteresis between cases).
 */
export const clearRouteMemory = (): void => {
	lastSignatures.clear();
};
