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

	describe("自己ループ（固定側と同一オブジェクト）", () => {
		// 固定側 source が rect-1 の bottomCenter に接続済みのコネクター。
		const selfLoopBase = (): ConnectorState =>
			({
				id: "c1",
				type: "connector",
				points: [],
				source: {
					owner: { type: "rect", id: "rect-1" },
					anchor: { kind: "connectPoint", id: "bottomCenter" },
				},
				target: free(10, 10),
			}) as unknown as ConnectorState;

		const fixedSource: EndpointRef = {
			owner: { type: "rect", id: "rect-1" },
			anchor: { kind: "connectPoint", id: "bottomCenter" },
		};

		it("固定側と同じオブジェクトへ戻すと固定側アンカーは選ばれない", () => {
			// カーソルを下辺の外側（本来 bottomCenter が最近接）に置いても、
			// 固定側が bottomCenter のため除外され別の辺中点になる。
			const result = computeEditedEndpoint(
				selfLoopBase(),
				"target",
				{ x: 100, y: 200 },
				{ id: "rect-1", object: rectFrame },
				fixedSource,
			);
			expect(result.target.owner).toEqual({ type: "rect", id: "rect-1" });
			const anchor = result.target.anchor;
			expect(anchor.kind).toBe("connectPoint");
			if (anchor.kind === "connectPoint") {
				expect(anchor.id).not.toBe("bottomCenter");
			}
		});

		it("自己ループでは center が選ばれない（中心付近のカーソルでも辺中点になる）", () => {
			const result = computeEditedEndpoint(
				selfLoopBase(),
				"target",
				{ x: 100, y: 100 }, // 図形中心付近
				{ id: "rect-1", object: rectFrame },
				fixedSource,
			);
			expect(result.target.anchor.kind).toBe("connectPoint");
		});

		it("別オブジェクトへの接続では除外は働かない（最近接をそのまま選ぶ）", () => {
			const other = { ...rectFrame, id: "rect-2" } as unknown as ObjectState;
			const result = computeEditedEndpoint(
				selfLoopBase(),
				"target",
				{ x: 100, y: 200 },
				{ id: "rect-2", object: other },
				fixedSource,
			);
			expect(result.target).toEqual({
				owner: { type: "rect", id: "rect-2" },
				anchor: { kind: "connectPoint", id: "bottomCenter" },
			});
		});
	});
});
