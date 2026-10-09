import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../../states/objects/primitives/group/GroupState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { createTestRegistries } from "../../../registries/createCanvasRegistries";
import { selectionOf } from "../../../selection/__tests__/support/selectionOf";
import {
	connectorOf,
	rectOf,
} from "../../../style/__tests__/support/styleFixtures";
import { ToggleLockAspectRatioCommand } from "../ToggleLockAspectRatioCommand";

const registries = createTestRegistries();

const stateOf = (
	selectedIds: readonly string[],
	objects: Record<string, ObjectState>,
	multiSelectGroup: GroupState | null = null,
): CanvasControllerState =>
	({
		selection: selectionOf(selectedIds),
		objects,
		multiSelectGroup,
		textEditState: null,
		commitVersion: 0,
	}) as unknown as CanvasControllerState;

const lockOf = (state: CanvasControllerState, id: string): unknown =>
	(state.objects[id] as unknown as { lockAspectRatio?: unknown })
		.lockAspectRatio;

describe("ToggleLockAspectRatioCommand", () => {
	describe("a multi-selection flips the box drawn around it", () => {
		it("the box is written and no member of it is", () => {
			const a = rectOf("a");
			const multiSelectGroup = {
				lockAspectRatio: true,
			} as unknown as GroupState;
			const next = ToggleLockAspectRatioCommand.execute(
				stateOf(["a"], { a }, multiSelectGroup),
				registries,
			);
			expect(next.multiSelectGroup?.lockAspectRatio).toBe(false);
			expect(next.objects["a"]).toBe(a);
			expect(next.commitVersion).toBe(1);
		});

		it("a box carrying no flag flips the reading the row shows for one", () => {
			const a = rectOf("a");
			const next = ToggleLockAspectRatioCommand.execute(
				stateOf(["a"], { a }, {} as unknown as GroupState),
				registries,
			);
			// An absent flag reads as DEFAULT_LOCK_ASPECT_RATIO, which is what the
			// row reports too (getSelectedLockAspectRatio), so the press turns it on.
			expect(next.multiSelectGroup?.lockAspectRatio).toBe(true);
		});
	});

	describe("with no box drawn the selected objects carry it", () => {
		it("flips the flag the object holds", () => {
			const a = rectOf("a", { lockAspectRatio: true });
			const next = ToggleLockAspectRatioCommand.execute(
				stateOf(["a"], { a }),
				registries,
			);
			expect(lockOf(next, "a")).toBe(false);
			expect(next.commitVersion).toBe(1);
		});

		it("brings an object carrying no flag onto the other reading", () => {
			const a = rectOf("a");
			const next = ToggleLockAspectRatioCommand.execute(
				stateOf(["a"], { a }),
				registries,
			);
			expect(lockOf(next, "a")).toBe(true);
		});
	});

	describe("canExecute", () => {
		it("is true for a selected object that can carry the flag", () => {
			expect(
				ToggleLockAspectRatioCommand.canExecute(
					stateOf(["a"], { a: rectOf("a") }),
					registries,
				),
			).toBe(true);
		});

		it("is true for a multi-selection, whose box carries it", () => {
			expect(
				ToggleLockAspectRatioCommand.canExecute(
					stateOf(["a"], { a: rectOf("a") }, {} as unknown as GroupState),
					registries,
				),
			).toBe(true);
		});

		it("is false for a type with no transform to lock", () => {
			// A connector has no frame, so it declares no `features.transform` and
			// nothing in its table answers for the lock.
			expect(
				ToggleLockAspectRatioCommand.canExecute(
					stateOf(["c"], { c: connectorOf("c") }),
					registries,
				),
			).toBe(false);
		});

		it("is false with nothing selected", () => {
			expect(
				ToggleLockAspectRatioCommand.canExecute(stateOf([], {}), registries),
			).toBe(false);
		});
	});
});
