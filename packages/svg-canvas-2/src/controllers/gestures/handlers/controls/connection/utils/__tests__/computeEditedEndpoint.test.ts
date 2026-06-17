import { describe, expect, it } from "vitest";

import type { EndpointRef } from "../../../../../../../schemas/objects/types/EndpointRef";
import type { ObjectState } from "../../../../../../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../../../../../../states/objects/connections/connector/ConnectorState";
import { computeEditedEndpoint } from "../computeEditedEndpoint";

const free = (x: number, y: number): EndpointRef => ({
	anchor: { kind: "free", point: { x, y } },
});

const baseConnector = (): ConnectorState =>
	({
		id: "c1",
		type: "connector",
		points: [{ x: 5, y: 5 }],
		source: free(0, 0),
		target: free(10, 10),
	}) as unknown as ConnectorState;

/** 非回転・等倍のフレーム（中心 100,100 / 幅40 / 高20）を持つ rect オブジェクト。 */
const rectFrame = {
	id: "rect-1",
	type: "rect",
	cx: 100,
	cy: 100,
	width: 40,
	height: 20,
	rotation: 0,
	scaleX: 1,
	scaleY: 1,
} as unknown as ObjectState;

describe("computeEditedEndpoint", () => {
	it("hover 対象が無ければ target をカーソル位置の free アンカーにする", () => {
		const result = computeEditedEndpoint(
			baseConnector(),
			"target",
			{ x: 80, y: 80 },
			null,
		);
		expect(result.target.anchor).toEqual({
			kind: "free",
			point: { x: 80, y: 80 },
		});
		// 固定側（source）と中間点は保持
		expect(result.source).toEqual(free(0, 0));
		expect(result.points).toEqual([{ x: 5, y: 5 }]);
	});

	it("free アンカーの座標は PRECISION.COORDINATE で丸める", () => {
		const result = computeEditedEndpoint(
			baseConnector(),
			"target",
			{ x: 12.123456, y: 9.987654 },
			null,
		);
		expect(result.target.anchor).toEqual({
			kind: "free",
			point: { x: 12.1235, y: 9.9877 },
		});
	});

	it("hover 対象があれば最近接アンカーへ owner 接続する", () => {
		const result = computeEditedEndpoint(
			baseConnector(),
			"target",
			{ x: 100, y: 200 }, // フレーム下辺の外側
			{ id: "rect-1", object: rectFrame },
		);
		expect(result.target).toEqual({
			owner: { type: "rect", id: "rect-1" },
			anchor: { kind: "connectPoint", id: "bottomCenter" },
		});
	});

	it("source を編集対象にすると target は据え置く", () => {
		const result = computeEditedEndpoint(
			baseConnector(),
			"source",
			{ x: 1, y: 2 },
			null,
		);
		expect(result.source.anchor).toEqual({
			kind: "free",
			point: { x: 1, y: 2 },
		});
		expect(result.target).toEqual(free(10, 10));
	});
});
