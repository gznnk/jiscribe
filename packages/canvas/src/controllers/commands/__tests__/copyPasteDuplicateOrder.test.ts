import { beforeAll, describe, expect, it } from "vitest";

import type { CanvasControllerState } from "../../CanvasTypes";
import { handlePaste } from "../../reducer/handlers/handlePaste";
import { initializeCommands } from "../../setup/initializeCommands";
import { initializeObjectRegistry } from "../../setup/initializeObjectRegistry";
import { CopyCommand } from "../selection/CopyCommand";
import { createCommandState } from "./support/createCommandState";
import { runCommand } from "./support/dispatch";
import { twoRectsWithConnectorDoc } from "./support/fixtures";

beforeAll(() => {
	initializeObjectRegistry();
	initializeCommands();
});

/** rect-1 と rect-2 の「間」にコネクターがいる z-order の選択状態。 */
const betweenState = (): CanvasControllerState =>
	createCommandState(twoRectsWithConnectorDoc, {
		selectedIds: ["rect-1", "rect-2"],
		rootIds: ["rect-1", "conn-1", "rect-2"],
	});

/** rootIds の末尾（複製/ペーストで追加された分）の型列。 */
const appendedTypes = (
	after: CanvasControllerState,
	originalLen: number,
): string[] =>
	after.rootIds.slice(originalLen).map((id) => after.objects[id]?.type ?? "");

/**
 * コピー/複製では、コピー集合の相対的な重なり順を保ったまま前面へ追加される。
 * 「2図形の間にいるコネクター」が、複製後も間に留まることを検証する
 * （単純連結だとコネクターが前面に飛ぶ不具合の回帰防止）。
 */
describe("コピー/複製でコネクターの相対 z 順を保つ", () => {
	it("複製（duplicate）: コネクターが2図形の間に保たれる", () => {
		const after = runCommand(betweenState(), "duplicate");
		expect(after.rootIds).toHaveLength(6);
		expect(appendedTypes(after, 3)).toEqual(["rect", "connector", "rect"]);
	});

	it("コピー→ペースト: コネクターが2図形の間に保たれる", () => {
		const state = betweenState();
		const clipboard = CopyCommand.execute(state).internalClipboard;
		expect(clipboard).not.toBeNull();
		// クリップボードは z-order 済み（コネクター混在）
		expect(clipboard?.rootIds).toEqual(["rect-1", "conn-1", "rect-2"]);

		const after = handlePaste(state, clipboard!);
		expect(after.rootIds).toHaveLength(6);
		expect(appendedTypes(after, 3)).toEqual(["rect", "connector", "rect"]);
	});
});
