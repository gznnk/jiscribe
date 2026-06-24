import { describe, expect, it } from "vitest";

import type { CanvasControllerState } from "../../../CanvasTypes";
import { DeselectAllCommand } from "../DeselectAllCommand";

const baseState = (
	overrides: Partial<CanvasControllerState>,
): CanvasControllerState =>
	({
		selectedIds: [],
		selectedConnectorId: null,
		selectedVertex: null,
		multiSelectGroup: null,
		areaSelection: null,
		shapeDrawing: null,
		eventStartSnapshot: null,
		objectMenuOpenId: null,
		edgeScrollEnabled: false,
		...overrides,
	}) as unknown as CanvasControllerState;

describe("DeselectAllCommand", () => {
	it("各種選択・編集状態をまとめてクリアする", () => {
		const state = baseState({
			selectedIds: ["a", "b"],
			selectedConnectorId: "c1",
			selectedVertex: { objectId: "p1", vertexIndex: 0 },
			multiSelectGroup: { id: "ms" } as never,
			areaSelection: { x: 0, y: 0 } as never,
			shapeDrawing: { type: "rect" } as never,
			objectMenuOpenId: "a",
			edgeScrollEnabled: true,
		});
		const next = DeselectAllCommand.execute(state);
		expect(next.selectedIds).toEqual([]);
		expect(next.selectedConnectorId).toBeNull();
		expect(next.selectedVertex).toBeNull();
		expect(next.multiSelectGroup).toBeNull();
		expect(next.areaSelection).toBeNull();
		expect(next.shapeDrawing).toBeNull();
		expect(next.objectMenuOpenId).toBeNull();
		expect(next.edgeScrollEnabled).toBe(false);
	});

	describe("canExecute", () => {
		it("オブジェクト選択があれば実行可能", () => {
			expect(
				DeselectAllCommand.canExecute(baseState({ selectedIds: ["a"] })),
			).toBe(true);
		});

		it("コネクター選択があれば実行可能", () => {
			expect(
				DeselectAllCommand.canExecute(baseState({ selectedConnectorId: "c1" })),
			).toBe(true);
		});

		it("頂点選択があれば実行可能", () => {
			expect(
				DeselectAllCommand.canExecute(
					baseState({ selectedVertex: { objectId: "p1", vertexIndex: 0 } }),
				),
			).toBe(true);
		});

		it("何も選択していなければ実行不可", () => {
			expect(DeselectAllCommand.canExecute(baseState({}))).toBe(false);
		});

		it("オブジェクトドラッグ中（範囲選択以外）は実行不可", () => {
			const state = baseState({
				selectedIds: ["a"],
				eventStartSnapshot: { foo: 1 } as never,
				areaSelection: null,
			});
			expect(DeselectAllCommand.canExecute(state)).toBe(false);
		});

		it("範囲選択ドラッグ中は実行可能", () => {
			const state = baseState({
				eventStartSnapshot: { foo: 1 } as never,
				areaSelection: { x: 0, y: 0 } as never,
			});
			expect(DeselectAllCommand.canExecute(state)).toBe(true);
		});
	});
});
