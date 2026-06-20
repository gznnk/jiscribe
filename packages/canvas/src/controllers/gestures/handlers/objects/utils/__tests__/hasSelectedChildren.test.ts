import { describe, it, expect } from "vitest";

import type { CanvasControllerState } from "../../../../../CanvasTypes";
import { hasSelectedChildren } from "../hasSelectedChildren";

const makeState = (
	objects: Record<string, unknown>,
	selectedIds: string[],
): CanvasControllerState =>
	({ objects, selectedIds }) as unknown as CanvasControllerState;

describe("hasSelectedChildren", () => {
	it("ID が存在しない → false", () => {
		expect(hasSelectedChildren(makeState({}, []), "missing")).toBe(false);
	});

	it("グループでないオブジェクト（type=rect）→ false", () => {
		const state = makeState({ r1: { type: "rect" } }, ["r1"]);
		expect(hasSelectedChildren(state, "r1")).toBe(false);
	});

	it("グループだが childIds が空 → false", () => {
		const state = makeState({ g1: { type: "group", childIds: [] } }, ["other"]);
		expect(hasSelectedChildren(state, "g1")).toBe(false);
	});

	it("グループの子が selectedIds に含まれない → false", () => {
		const state = makeState({ g1: { type: "group", childIds: ["r1", "r2"] } }, [
			"other",
		]);
		expect(hasSelectedChildren(state, "g1")).toBe(false);
	});

	it("グループの子が 1 件選択済み → true", () => {
		const state = makeState({ g1: { type: "group", childIds: ["r1", "r2"] } }, [
			"r1",
		]);
		expect(hasSelectedChildren(state, "g1")).toBe(true);
	});

	it("グループの複数の子が選択済み → true", () => {
		const state = makeState(
			{ g1: { type: "group", childIds: ["r1", "r2", "r3"] } },
			["r1", "r2"],
		);
		expect(hasSelectedChildren(state, "g1")).toBe(true);
	});

	it("全子が選択済み → true", () => {
		const state = makeState({ g1: { type: "group", childIds: ["r1", "r2"] } }, [
			"r1",
			"r2",
		]);
		expect(hasSelectedChildren(state, "g1")).toBe(true);
	});
});
