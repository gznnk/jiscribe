import { describe, expect, it } from "vitest";

import type { ConnectorState } from "../../../states/objects/connections/connector/ConnectorState";
import { calcConnectorBoundingBox } from "../calcConnectorBoundingBox";

const freeConnector = (
	overrides: Partial<Record<string, unknown>> = {},
): ConnectorState =>
	({
		id: "connector-1",
		type: "connector",
		points: [],
		source: { anchor: { kind: "free", point: { x: 10, y: 20 } } },
		target: { anchor: { kind: "free", point: { x: 110, y: 70 } } },
		...overrides,
	}) as unknown as ConnectorState;

describe("calcConnectorBoundingBox", () => {
	it("free 端点のみのコネクターは両端点からバウンドを計算する", () => {
		const bbox = calcConnectorBoundingBox(freeConnector(), {});

		expect(bbox).toEqual({ left: 10, right: 110, top: 20, bottom: 70 });
	});

	it("中間経由点がバウンドを広げる場合は経由点も含める", () => {
		const connector = freeConnector({
			points: [
				{ x: -50, y: 40 },
				{ x: 60, y: 200 },
			],
		});

		const bbox = calcConnectorBoundingBox(connector, {});

		expect(bbox).toEqual({ left: -50, right: 110, top: 20, bottom: 200 });
	});

	it("owned 端点の参照先が存在しない場合は null を返す", () => {
		const connector = freeConnector({
			source: {
				owner: { type: "rect", id: "missing-rect" },
				anchor: { kind: "center" },
			},
		});

		expect(calcConnectorBoundingBox(connector, {})).toBeNull();
	});
});
