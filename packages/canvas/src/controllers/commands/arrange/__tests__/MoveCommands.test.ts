import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../../states/objects/primitives/group/GroupState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { createTestRegistries } from "../../../setup/createCanvasRegistries";
import { moveCommands } from "../MoveCommands";

const registries = createTestRegistries();

const commandById = (id: string) => {
	const command = moveCommands.find((c) => c.id === id);
	if (!command) {
		throw new Error(`command not found: ${id}`);
	}
	return command;
};

const makeRect = (id: string, cx: number, cy: number): ObjectState =>
	({
		id,
		type: "rect",
		cx,
		cy,
		width: 10,
		height: 10,
	}) as unknown as ObjectState;

const makeState = (params: {
	selectedIds: string[];
	objects: Record<string, ObjectState>;
	multiSelectGroup?: GroupState | null;
	textEditState?: CanvasControllerState["textEditState"];
}): CanvasControllerState =>
	({
		selectedIds: params.selectedIds,
		objects: params.objects,
		multiSelectGroup: params.multiSelectGroup ?? null,
		textEditState: params.textEditState ?? null,
		commitVersion: 0,
		historyCoalesce: { recorded: null, pending: null },
		registries,
	}) as unknown as CanvasControllerState;

describe("moveCommands", () => {
	it("generates 8 commands (up/down/left/right × normal/Shift)", () => {
		expect(moveCommands.map((c) => c.id).sort()).toEqual(
			[
				"move-down",
				"move-down-large",
				"move-left",
				"move-left-large",
				"move-right",
				"move-right-large",
				"move-up",
				"move-up-large",
			].sort(),
		);
	});

	it("every command sets a coalesce key (pending) containing the selected IDs on execute (a different target means a separate operation)", () => {
		const stateA = makeState({
			selectedIds: ["a"],
			objects: { a: makeRect("a", 0, 0) },
		});
		const stateAB = makeState({
			selectedIds: ["a", "b"],
			objects: { a: makeRect("a", 0, 0), b: makeRect("b", 0, 0) },
		});
		for (const command of moveCommands) {
			expect(command.execute(stateA, registries).historyCoalesce.pending).toBe(
				"move:a",
			);
			expect(command.execute(stateAB, registries).historyCoalesce.pending).toBe(
				"move:a,b",
			);
		}
	});

	describe("shortcuts", () => {
		it("normal commands are bound to arrow keys without shift", () => {
			expect(commandById("move-up").shortcuts?.default).toEqual([
				{ code: "ArrowUp", shift: false },
			]);
		});

		it("Shift commands are bound to arrow keys with shift", () => {
			expect(commandById("move-right-large").shortcuts?.default).toEqual([
				{ code: "ArrowRight", shift: true },
			]);
		});
	});

	describe("execute (movement amount)", () => {
		it("move-right increments cx by 1 (screen coordinates)", () => {
			const state = makeState({
				selectedIds: ["a"],
				objects: { a: makeRect("a", 50, 50) },
			});
			const next = commandById("move-right").execute(state, registries);
			const rect = next.objects["a"] as unknown as { cx: number; cy: number };
			expect(rect.cx).toBe(51);
			expect(rect.cy).toBe(50);
		});

		it("move-up decrements cy by 1 (up is negative in screen coordinates)", () => {
			const state = makeState({
				selectedIds: ["a"],
				objects: { a: makeRect("a", 50, 50) },
			});
			const next = commandById("move-up").execute(state, registries);
			const rect = next.objects["a"] as unknown as { cx: number; cy: number };
			expect(rect.cy).toBe(49);
		});

		it("Shift commands move by 10px", () => {
			const state = makeState({
				selectedIds: ["a"],
				objects: { a: makeRect("a", 50, 50) },
			});
			const next = commandById("move-down-large").execute(state, registries);
			const rect = next.objects["a"] as unknown as { cx: number; cy: number };
			expect(rect.cy).toBe(60);
		});

		it("moves a multi-selection together by the same delta", () => {
			const state = makeState({
				selectedIds: ["a", "b"],
				objects: { a: makeRect("a", 0, 0), b: makeRect("b", 100, 100) },
			});
			const next = commandById("move-left").execute(state, registries);
			expect((next.objects["a"] as unknown as { cx: number }).cx).toBe(-1);
			expect((next.objects["b"] as unknown as { cx: number }).cx).toBe(99);
		});

		it("moves the multiSelectGroup center in sync as well", () => {
			const multiSelectGroup = {
				id: "ms",
				type: "group",
				cx: 50,
				cy: 50,
			} as unknown as GroupState;
			const state = makeState({
				selectedIds: ["a", "b"],
				objects: { a: makeRect("a", 0, 0), b: makeRect("b", 100, 100) },
				multiSelectGroup,
			});
			const next = commandById("move-right").execute(state, registries);
			expect(next.multiSelectGroup?.cx).toBe(51);
			expect(next.multiSelectGroup?.cy).toBe(50);
		});

		it("increments commitVersion", () => {
			const state = makeState({
				selectedIds: ["a"],
				objects: { a: makeRect("a", 0, 0) },
			});
			const next = commandById("move-up").execute(state, registries);
			expect(next.commitVersion).toBe(state.commitVersion + 1);
		});
	});

	describe("canExecute", () => {
		it("is executable in the normal case when there is a selection", () => {
			const state = makeState({
				selectedIds: ["a"],
				objects: { a: makeRect("a", 0, 0) },
			});
			expect(commandById("move-up").canExecute(state, registries)).toBe(true);
		});

		it("is not executable when there is no selection", () => {
			const state = makeState({ selectedIds: [], objects: {} });
			expect(commandById("move-up").canExecute(state, registries)).toBe(false);
		});

		it("is not executable while editing text, prioritizing caret movement", () => {
			const state = makeState({
				selectedIds: ["a"],
				objects: { a: makeRect("a", 0, 0) },
				textEditState: { objectId: "a", text: "" },
			});
			expect(commandById("move-up").canExecute(state, registries)).toBe(false);
		});
	});
});
