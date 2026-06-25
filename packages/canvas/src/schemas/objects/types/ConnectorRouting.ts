/**
 * Available connector routing modes.
 *
 * - `straight`: 端点を直線で結び、`points`（手動 waypoint）があればそれを通る折れ線。
 *   既定値（`routing` 省略時はこれ）。
 * - `orthogonal`: 端点と接続図形の形状から、描画時に水平/垂直の経路を自動生成する。
 *   `points` は使わず常に空（経路は派生値で永続化しない）。
 */
export const ConnectorRoutings = ["straight", "orthogonal"] as const;

export type ConnectorRouting = (typeof ConnectorRoutings)[number];

export const isConnectorRouting = (value: unknown): value is ConnectorRouting =>
	ConnectorRoutings.includes(value as ConnectorRouting);
