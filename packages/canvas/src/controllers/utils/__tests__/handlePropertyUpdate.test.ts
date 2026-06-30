import { beforeAll, describe, it, expect } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../CanvasTypes";
import { initializeObjectRegistry } from "../../setup/initializeObjectRegistry";
import { handlePropertyUpdate } from "../handlePropertyUpdate";

beforeAll(() => {
	initializeObjectRegistry();
});

type MinState = Pick<
	CanvasControllerState,
	"selectedIds" | "selectedConnectorId" | "objects" | "multiSelectGroup"
>;

const makeState = (overrides: Partial<MinState> = {}): CanvasControllerState =>
	({
		selectedIds: [],
		selectedConnectorId: null,
		objects: {},
		multiSelectGroup: null,
		...overrides,
	}) as unknown as CanvasControllerState;

const rectObj = (id: string): ObjectState =>
	({
		id,
		type: "rect",
		fill: "#ffffff",
		stroke: "#000000",
		strokeWidth: 1,
		cx: 0,
		cy: 0,
		width: 100,
		height: 100,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
	}) as unknown as ObjectState;

const connObj = (id: string): ObjectState =>
	({
		id,
		type: "connector",
		stroke: "#000000",
		strokeWidth: 1,
		source: { anchor: { kind: "free", point: { x: 0, y: 0 } } },
		target: { anchor: { kind: "free", point: { x: 100, y: 0 } } },
	}) as unknown as ObjectState;

describe("handlePropertyUpdate", () => {
	describe("selectedIds が空で selectedConnectorId も null", () => {
		it("→ 同一参照を返す", () => {
			const state = makeState();
			expect(handlePropertyUpdate(state, "fill", "#ff0000")).toBe(state);
		});
	});

	describe("selectedConnectorId あり（コネクター選択時）", () => {
		it("サポートされるプロパティ（stroke）→ コネクターが更新される", () => {
			const c1 = connObj("c1");
			const state = makeState({
				selectedConnectorId: "c1",
				objects: { c1 },
			});
			const result = handlePropertyUpdate(state, "stroke", "#ff0000");
			const updated = result.objects["c1"] as unknown as { stroke: string };
			expect(updated.stroke).toBe("#ff0000");
		});

		it("サポートされないプロパティ（fill on connector）→ 同一参照を返す", () => {
			const c1 = connObj("c1");
			const state = makeState({
				selectedConnectorId: "c1",
				objects: { c1 },
			});
			expect(handlePropertyUpdate(state, "fill", "#ff0000")).toBe(state);
		});

		it("オブジェクトが存在しない → 同一参照を返す", () => {
			const state = makeState({ selectedConnectorId: "missing" });
			expect(handlePropertyUpdate(state, "stroke", "#ff0000")).toBe(state);
		});

		it("strokeWidth は数値に変換して適用される", () => {
			const c1 = connObj("c1");
			const state = makeState({
				selectedConnectorId: "c1",
				objects: { c1 },
			});
			const result = handlePropertyUpdate(state, "strokeWidth", "3");
			const updated = result.objects["c1"] as unknown as {
				strokeWidth: number;
			};
			expect(updated.strokeWidth).toBe(3);
		});

		it("strokeWidth に非数値 → 同一参照を返す", () => {
			const c1 = connObj("c1");
			const state = makeState({
				selectedConnectorId: "c1",
				objects: { c1 },
			});
			expect(handlePropertyUpdate(state, "strokeWidth", "abc")).toBe(state);
		});
	});

	describe("コネクターラベルのネストスタイル（label.*）", () => {
		const connWithLabel = (id: string): ObjectState =>
			({
				...(connObj(id) as unknown as object),
				label: { text: "Yes" },
			}) as unknown as ObjectState;

		it("label.fill → connector.label.fill にネスト更新される", () => {
			const c1 = connWithLabel("c1");
			const state = makeState({
				selectedConnectorId: "c1",
				objects: { c1 },
			});
			const result = handlePropertyUpdate(state, "label.fill", "#ff0000");
			const updated = result.objects["c1"] as unknown as {
				label: { text: string; fill: string };
			};
			expect(updated.label.fill).toBe("#ff0000");
			// 既存の text は保持される
			expect(updated.label.text).toBe("Yes");
		});

		it("label.stroke → label.stroke にネスト更新される", () => {
			const c1 = connWithLabel("c1");
			const state = makeState({
				selectedConnectorId: "c1",
				objects: { c1 },
			});
			const result = handlePropertyUpdate(state, "label.stroke", "#00ff00");
			const updated = result.objects["c1"] as unknown as {
				label: { stroke: string };
			};
			expect(updated.label.stroke).toBe("#00ff00");
		});

		it("label.strokeDashType → 文字列のままネスト更新される", () => {
			const c1 = connWithLabel("c1");
			const state = makeState({
				selectedConnectorId: "c1",
				objects: { c1 },
			});
			const result = handlePropertyUpdate(
				state,
				"label.strokeDashType",
				"dashed",
			);
			const updated = result.objects["c1"] as unknown as {
				label: { strokeDashType: string };
			};
			expect(updated.label.strokeDashType).toBe("dashed");
		});

		it("label.strokeWidth は数値化して更新される", () => {
			const c1 = connWithLabel("c1");
			const state = makeState({
				selectedConnectorId: "c1",
				objects: { c1 },
			});
			const result = handlePropertyUpdate(state, "label.strokeWidth", "2");
			const updated = result.objects["c1"] as unknown as {
				label: { strokeWidth: number };
			};
			expect(updated.label.strokeWidth).toBe(2);
		});

		it("label.strokeWidth に非数値 → 同一参照を返す", () => {
			const c1 = connWithLabel("c1");
			const state = makeState({
				selectedConnectorId: "c1",
				objects: { c1 },
			});
			expect(handlePropertyUpdate(state, "label.strokeWidth", "x")).toBe(state);
		});

		it("ラベル未設定のコネクターへの label.* → 同一参照を返す", () => {
			const c1 = connObj("c1");
			const state = makeState({
				selectedConnectorId: "c1",
				objects: { c1 },
			});
			expect(handlePropertyUpdate(state, "label.fill", "#ff0000")).toBe(state);
		});

		it("元の objects は変更されない（イミュータブル）", () => {
			const c1 = connWithLabel("c1");
			const state = makeState({
				selectedConnectorId: "c1",
				objects: { c1 },
			});
			handlePropertyUpdate(state, "label.fill", "#ff0000");
			expect(
				(c1 as unknown as { label: { fill?: string } }).label.fill,
			).toBeUndefined();
		});
	});

	describe("selectedIds あり（通常選択時）", () => {
		it("rect に fill を適用 → fill が更新される", () => {
			const r1 = rectObj("r1");
			const state = makeState({
				selectedIds: ["r1"],
				objects: { r1 },
			});
			const result = handlePropertyUpdate(state, "fill", "#123456");
			const updated = result.objects["r1"] as unknown as { fill: string };
			expect(updated.fill).toBe("#123456");
		});

		it("サポートされないプロパティ → 同一参照を返す", () => {
			const r1 = rectObj("r1");
			const state = makeState({
				selectedIds: ["r1"],
				objects: { r1 },
			});
			expect(handlePropertyUpdate(state, "startArrow", "triangle")).toBe(state);
		});

		it("複数選択 → 全オブジェクトが更新される", () => {
			const r1 = rectObj("r1");
			const r2 = rectObj("r2");
			const state = makeState({
				selectedIds: ["r1", "r2"],
				objects: { r1, r2 },
			});
			const result = handlePropertyUpdate(state, "fill", "#abcdef");
			expect((result.objects["r1"] as unknown as { fill: string }).fill).toBe(
				"#abcdef",
			);
			expect((result.objects["r2"] as unknown as { fill: string }).fill).toBe(
				"#abcdef",
			);
		});

		it("lockAspectRatio かつ multiSelectGroup あり → multiSelectGroup のみ更新", () => {
			const r1 = rectObj("r1");
			const multiGroup = {
				lockAspectRatio: true,
			} as CanvasControllerState["multiSelectGroup"];
			const state = makeState({
				selectedIds: ["r1"],
				objects: { r1 },
				multiSelectGroup: multiGroup,
			});
			const result = handlePropertyUpdate(state, "lockAspectRatio", "false");
			expect(result.multiSelectGroup?.lockAspectRatio).toBe(false);
			// rect 自体は変わらない
			expect(result.objects["r1"]).toBe(r1);
		});

		it("元の objects は変更されない（イミュータブル）", () => {
			const r1 = rectObj("r1");
			const originalFill = (r1 as unknown as { fill: string }).fill;
			const state = makeState({ selectedIds: ["r1"], objects: { r1 } });
			handlePropertyUpdate(state, "fill", "#000000");
			expect((r1 as unknown as { fill: string }).fill).toBe(originalFill);
		});
	});
});
