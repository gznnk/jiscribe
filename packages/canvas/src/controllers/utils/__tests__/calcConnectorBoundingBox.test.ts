import { beforeAll, describe, expect, it } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../../states/objects/connections/connector/ConnectorState";
import { initializeObjectRegistry } from "../../setup/initializeObjectRegistry";
import { calcConnectorBoundingBox } from "../calcConnectorBoundingBox";

beforeAll(() => {
	initializeObjectRegistry();
});

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

const rectObj = (
	id: string,
	cx: number,
	cy: number,
	width: number,
	height: number,
): ObjectState =>
	({
		id,
		type: "rect",
		cx,
		cy,
		width,
		height,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
	}) as unknown as ObjectState;

describe("calcConnectorBoundingBox", () => {
	it("free 端点のみのコネクターは両端点からバウンドを計算する", () => {
		const bbox = calcConnectorBoundingBox(
			freeConnector({ routing: "straight" }),
			{},
		);

		expect(bbox).toEqual({ left: 10, right: 110, top: 20, bottom: 70 });
	});

	it("straight ルーティングで中間経由点がバウンドを広げる場合は経由点も含める", () => {
		const connector = freeConnector({
			routing: "straight",
			points: [
				{ x: -50, y: 40 },
				{ x: 60, y: 200 },
			],
		});

		const bbox = calcConnectorBoundingBox(connector, {});

		expect(bbox).toEqual({ left: -50, right: 110, top: 20, bottom: 200 });
	});

	it("直交ルーティングの曲がり点（waypoints）も範囲に含める", () => {
		// 互いに外側へ向かう connectPoint 同士。経路は両端の図形を回り込むため、
		// 曲がり点が端点の x 範囲（50〜350）の外へふくらむ。
		const src = rectObj("r1", 300, 100, 100, 60); // rightCenter = (350, 100)
		const tgt = rectObj("r2", 100, 300, 100, 60); // leftCenter = (50, 300)
		const connector = freeConnector({
			routing: "orthogonal",
			source: {
				owner: { type: "rect", id: "r1" },
				anchor: { kind: "connectPoint", id: "rightCenter" },
			},
			target: {
				owner: { type: "rect", id: "r2" },
				anchor: { kind: "connectPoint", id: "leftCenter" },
			},
		});

		const bbox = calcConnectorBoundingBox(connector, { r1: src, r2: tgt });

		// 端点だけなら {left:50, right:350, top:100, bottom:300} になるが、
		// 直交経路のスタブ（辺 + margin 30）が両側へふくらむため左右に広がる。
		expect(bbox).not.toBeNull();
		expect(bbox!.left).toBe(20); // target 左辺 50 - margin 30
		expect(bbox!.right).toBe(380); // source 右辺 350 + margin 30
		expect(bbox!.left).toBeLessThan(50);
		expect(bbox!.right).toBeGreaterThan(350);
		expect(bbox!.top).toBeLessThanOrEqual(100);
		expect(bbox!.bottom).toBeGreaterThanOrEqual(300);
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
