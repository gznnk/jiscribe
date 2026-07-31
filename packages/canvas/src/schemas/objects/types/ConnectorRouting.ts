import type { AnchorSpec } from "./EndpointRef";

/**
 * How a connector's segments are drawn. This is the **shape** of the line and nothing else — who
 * decides the path is answered by `points` (empty = the engine routes it, non-empty = the author's
 * own vertices, ConnectorDoc 参照), so the two are independent.
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
 * 線の形の既定をアンカー種から導く（作成時と、明示 routing の無いコネクターの再アンカー時に
 * 使う）。connectPoint は辺の法線という出口方向を持つので直角の経路が意図通りに見えるが、
 * center は出口方向を持たず直角経路が恣意的な向きに倒れる。そのためどちらかの端点が center の
 * ときは straight を、両端が connectPoint（向きを持つ）のときは undefined（= 省略時の orthogonal
 * 既定）を返す。あくまで既定の導出で、ユーザーが明示指定した routing を縛る恒久制約ではない。
 */
export const defaultRoutingForAnchors = (
	a: AnchorSpec,
	b: AnchorSpec,
): ConnectorRouting | undefined =>
	a.kind === "center" || b.kind === "center" ? "straight" : undefined;
