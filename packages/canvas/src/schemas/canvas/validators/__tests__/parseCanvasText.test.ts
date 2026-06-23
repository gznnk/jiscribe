import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { initializeObjectDocValidatorRegistry } from "../../../registry/initializeObjectDocValidatorRegistry";
import { objectDocValidatorRegistry } from "../../../registry/ObjectDocValidatorRegistry";
import { parseCanvasText } from "../parseCanvasText";

// parseCanvasText は JSON.parse → validateStructure → validateSemantics と
// レジストリ初期化を束ねる sociable なオーケストレーター。個々の validator の
// 中身ではなく「束ね方」（kind 振り分け・順序・自己初期化・例外契約）を検証する。

const rect = (id: string, over: Record<string, unknown> = {}) => ({
	id,
	type: "rect",
	x: 0,
	y: 0,
	width: 10,
	height: 10,
	...over,
});
const validDoc = (root: unknown[] = [rect("r1")]) => ({ version: 1, root });
const text = (doc: unknown) => JSON.stringify(doc);

// 各テストはレジストリ空（cold start）から始める。これにより隔離されると同時に、
// 全テストが parseCanvasText の自己初期化を経由して契約を常時検証する。
beforeEach(() => {
	objectDocValidatorRegistry.clear();
});
afterEach(() => {
	objectDocValidatorRegistry.clear();
});

describe("parseCanvasText", () => {
	describe("結果 kind の振り分け", () => {
		it("正常な doc は ok を返し、doc は入力と一致する", () => {
			const doc = validDoc([rect("r1"), rect("r2")]);
			const result = parseCanvasText(text(doc));
			expect(result.kind).toBe("ok");
			if (result.kind === "ok") {
				expect(result.doc).toEqual(doc);
			}
		});

		it("ok の doc は $schema などのメタも保持して素通しする", () => {
			const doc = { $schema: "https://example/s.json", ...validDoc() };
			const result = parseCanvasText(text(doc));
			expect(result.kind).toBe("ok");
			if (result.kind === "ok") {
				expect(result.doc).toEqual(doc);
			}
		});

		it("壊れた JSON は syntax-error（message 付き）", () => {
			const result = parseCanvasText("{ not valid json");
			expect(result.kind).toBe("syntax-error");
			if (result.kind === "syntax-error") {
				expect(result.message.length).toBeGreaterThan(0);
			}
		});

		it("構造エラー（未知 type）は structure-error", () => {
			const result = parseCanvasText(
				text(validDoc([{ id: "x", type: "rectangle" }])),
			);
			expect(result.kind).toBe("structure-error");
			if (result.kind === "structure-error") {
				expect(result.diagnostics.length).toBeGreaterThan(0);
			}
		});

		it("構造OK・意味NG（id 重複）は semantic-error", () => {
			const result = parseCanvasText(
				text(validDoc([rect("dup"), rect("dup")])),
			);
			expect(result.kind).toBe("semantic-error");
			if (result.kind === "semantic-error") {
				expect(
					result.diagnostics.some((d) => d.message.includes("duplicated")),
				).toBe(true);
			}
		});
	});

	describe("構造検証 → 意味検証の順序（短絡）", () => {
		it("構造エラーと意味エラーが両方あるとき structure-error のみ（semantics は走らない）", () => {
			// 未知 type（構造）＋ id 重複（意味）を同居させる
			const result = parseCanvasText(
				text(validDoc([rect("dup"), rect("dup"), { id: "u", type: "nope" }])),
			);
			expect(result.kind).toBe("structure-error");
			if (result.kind === "structure-error") {
				// semantics は走っていないので "duplicated" は含まれない
				expect(
					result.diagnostics.some((d) => d.message.includes("duplicated")),
				).toBe(false);
			}
		});

		it("root が配列でない doc は structure-error（internal-error にならない）", () => {
			// 短絡が無いと validateSemantics が 5.forEach で throw して internal-error になる。
			const result = parseCanvasText(text({ version: 1, root: 5 }));
			expect(result.kind).toBe("structure-error");
		});
	});

	describe("レジストリの遅延初期化", () => {
		it("レジストリ空のまま呼んでも正常 doc を ok にできる（自己初期化）", () => {
			expect(objectDocValidatorRegistry.isEmpty()).toBe(true);
			const result = parseCanvasText(text(validDoc()));
			expect(result.kind).toBe("ok");
			// 呼び出し後はレジストリが埋まっている
			expect(objectDocValidatorRegistry.isEmpty()).toBe(false);
		});

		it("connectable 判定も cold start から正しく働く（group は非接続可）", () => {
			const doc = validDoc([
				rect("a"),
				{ id: "g", type: "group", children: [rect("gc")] },
				{
					id: "c",
					type: "connector",
					points: [],
					source: {
						owner: { type: "rect", id: "a" },
						anchor: { kind: "center" },
					},
					target: {
						owner: { type: "group", id: "g" },
						anchor: { kind: "center" },
					},
				},
			]);
			const result = parseCanvasText(text(doc));
			expect(result.kind).toBe("semantic-error");
			if (result.kind === "semantic-error") {
				expect(
					result.diagnostics.some((d) => d.message.includes("not connectable")),
				).toBe(true);
			}
		});

		it("事前初期化済みでも冪等に動く", () => {
			initializeObjectDocValidatorRegistry();
			expect(objectDocValidatorRegistry.isEmpty()).toBe(false);
			expect(parseCanvasText(text(validDoc())).kind).toBe("ok");
			// 連続呼び出しでも壊れない
			expect(parseCanvasText(text(validDoc())).kind).toBe("ok");
		});
	});

	describe("例外を投げない契約", () => {
		it.each(["", "null", "123", "true", '"str"', "[]", "{}", "[1,2,3]"])(
			"入力 %j でも throw せず union を返す",
			(input) => {
				let result: ReturnType<typeof parseCanvasText> | undefined;
				expect(() => {
					result = parseCanvasText(input);
				}).not.toThrow();
				expect([
					"ok",
					"syntax-error",
					"structure-error",
					"semantic-error",
					"internal-error",
				]).toContain(result?.kind);
			},
		);
	});

	describe("internal-error 経路", () => {
		it("検証中に予期しない例外が起きたら internal-error（message 付き）", async () => {
			// validator を一時的に throw させる。vi.doMock + 動的 import でこのテストに閉じ込める。
			vi.resetModules();
			vi.doMock("../validateSemantics", () => ({
				validateSemantics: () => {
					throw new Error("boom from semantics");
				},
			}));
			try {
				const { parseCanvasText: freshParse } =
					await import("../parseCanvasText");
				const result = freshParse(text(validDoc()));
				expect(result.kind).toBe("internal-error");
				if (result.kind === "internal-error") {
					expect(result.message).toContain("boom from semantics");
				}
			} finally {
				vi.doUnmock("../validateSemantics");
				vi.resetModules();
			}
		});
	});
});
