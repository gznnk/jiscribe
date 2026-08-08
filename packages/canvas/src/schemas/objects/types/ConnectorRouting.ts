import type { AnchorSpec } from "./EndpointRef";

/**
 * How a connector's segments are drawn. This is the **shape** of the line and nothing else — who
 * decides the path is answered by `points` (empty = the engine routes it, non-empty = the author's
 * own vertices, see ConnectorDoc), so the two are independent.
 *
 * - `orthogonal`: every segment is axis-aligned, so the line only ever bends at right angles.
 *   **Default** (used when `routing` is omitted).
 * - `straight`: segments run at any angle, from a single direct line to a polyline through the
 *   points. Specify explicitly only when right angles are not wanted.
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

/**
 * Derive the default line shape from the anchor kinds, at creation and when re-anchoring a
 * connector that has no explicit routing.
 *
 * A connectPoint carries an exit direction (its edge normal), so a right-angled path reads as
 * intended; a center has none, and a right-angled path from it falls into an arbitrary
 * orientation. This only derives a default and never constrains a routing the user set.
 *
 * @returns "straight" when either endpoint is a center, undefined when both are connectPoints
 *   so the omitted-value default of orthogonal applies
 */
export const defaultRoutingForAnchors = (
	a: AnchorSpec,
	b: AnchorSpec,
): ConnectorRouting | undefined =>
	a.kind === "center" || b.kind === "center" ? "straight" : undefined;
