import type { ArrowType } from "../../types/ArrowType";
import type { ConnectorRouting } from "../../types/ConnectorRouting";
import type { EndpointRef } from "../../types/EndpointRef";
import type { ObjectFeatures } from "../../types/ObjectFeatures";
import type { CreateObjectType } from "../../utils/CreateObjectType";

export const ConnectorFeatures = {
	type: "connector",
	geometry: "poly",
	stroke: true,
	connectable: false,
} as const satisfies ObjectFeatures;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const ConnectorDocBrand: unique symbol;

/**
 * コネクター（接続線）の Doc。
 *
 * `points` のセマンティクス: source → target 順の**中間経由点（waypoint）のみ**を
 * ワールド座標で保持する。端点座標は含めない（端点の正は `source` / `target` の
 * EndpointRef であり、owned アンカーは描画時に動的解決される）。
 * 直線コネクターは空配列。
 *
 * `routing` が `"orthogonal"` のときは経路を描画時に自動生成し、`points` は使わない
 * （常に空・派生値は永続化しない）。省略時は `"straight"`。
 */
export type ConnectorDoc = CreateObjectType<
	typeof ConnectorFeatures,
	typeof ConnectorDocBrand,
	{
		source: EndpointRef;
		target: EndpointRef;
		routing?: ConnectorRouting;
		startArrow?: ArrowType;
		endArrow?: ArrowType;
	}
>;
