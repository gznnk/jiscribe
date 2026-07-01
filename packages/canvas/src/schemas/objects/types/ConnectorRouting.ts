/**
 * Available connector routing modes.
 *
 * - `orthogonal`: Automatically generates a horizontal/vertical route at render
 *   time from the endpoints and the shapes of the connected objects. `points` is
 *   unused and always empty (the route is a derived value and is not persisted).
 *   **Default** (used when `routing` is omitted).
 * - `straight`: Connects the endpoints with a straight line, or a polyline
 *   passing through `points` (manual waypoints) if present. Specify explicitly
 *   only when a straight line is desired.
 */
export const ConnectorRoutings = ["straight", "orthogonal"] as const;

export type ConnectorRouting = (typeof ConnectorRoutings)[number];

export const isConnectorRouting = (value: unknown): value is ConnectorRouting =>
	ConnectorRoutings.includes(value as ConnectorRouting);

/**
 * Interprets the routing default. When `routing` is omitted (undefined) it is
 * treated as `orthogonal`; routing is straight only when explicitly `"straight"`.
 */
export const isOrthogonalRouting = (
	routing: ConnectorRouting | undefined,
): boolean => routing !== "straight";
