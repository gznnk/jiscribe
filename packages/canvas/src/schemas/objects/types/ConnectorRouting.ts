import type { AnchorSpec } from "./EndpointRef";

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

/**
 * routing の既定をアンカー種から導く（作成時と、明示 routing の無いコネクターの再アンカー時に
 * 使う）。connectPoint は辺の法線という出口方向を持つので orthogonal 経路が意図通りに見えるが、
 * center は出口方向を持たず orthogonal が恣意的な向きに倒れる。そのためどちらかの端点が center の
 * ときは straight を、両端が connectPoint（向きを持つ）のときは undefined（= 省略時の orthogonal
 * 既定）を返す。あくまで既定の導出で、ユーザーが明示指定した routing を縛る恒久制約ではない。
 */
export const defaultRoutingForAnchors = (
	a: AnchorSpec,
	b: AnchorSpec,
): ConnectorRouting | undefined =>
	a.kind === "center" || b.kind === "center" ? "straight" : undefined;
