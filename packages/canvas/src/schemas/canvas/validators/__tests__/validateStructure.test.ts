import { describe, it, expect } from "vitest";

import { validateStructure } from "../validateStructure";

/**
 * コネクターは root 直下のみ（group の children には置けない）という不変条件を
 * 構造検証が強制することを確認する。JSON スキーマ（GroupChildDoc）とは別に、
 * スキーマを持たない webview / MCP のためにバリデータ側でも担保する。
 */
describe("validateStructure: コネクターは top-level のみ", () => {
	const connectorNode = (id: string): unknown => ({
		id,
		type: "connector",
		points: [],
		source: { owner: { type: "rect", id: "r1" }, anchor: { kind: "center" } },
		target: { owner: { type: "rect", id: "r2" }, anchor: { kind: "center" } },
	});

	it("group の children にコネクターがあるとエラー", () => {
		const doc = {
			version: 1,
			root: [{ id: "g1", type: "group", children: [connectorNode("c1")] }],
		};
		const errors = validateStructure(doc);
		expect(
			errors.some(
				(e) =>
					e.path === "root[0].children[0]" && e.message.includes("top-level"),
			),
		).toBe(true);
	});

	it("root 直下のコネクターは『group 内』エラーにならない", () => {
		const doc = { version: 1, root: [connectorNode("c1")] };
		const errors = validateStructure(doc);
		expect(errors.some((e) => e.message.includes("inside a group"))).toBe(
			false,
		);
	});

	it("旧フォーマットの top-level connectors フィールドは fail-fast でエラー", () => {
		const doc = { version: 1, root: [], connectors: [] };
		const errors = validateStructure(doc);
		expect(errors.some((e) => e.path === "connectors")).toBe(true);
	});
});
