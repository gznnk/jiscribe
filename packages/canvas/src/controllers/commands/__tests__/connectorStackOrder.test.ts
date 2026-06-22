import { beforeAll, describe, expect, it } from "vitest";

import type { CanvasControllerState } from "../../CanvasTypes";
import { createCommandState } from "./support/createCommandState";
import { runCommand } from "./support/dispatch";
import { twoRectsWithConnectorDoc } from "./support/fixtures";
import { initializeCommands } from "../../setup/initializeCommands";
import { initializeObjectRegistry } from "../../setup/initializeObjectRegistry";
import { isArrangeableSelection } from "../../utils/isArrangeableSelection";

beforeAll(() => {
	// canvasToState（doc→state）に object/connector の Mapper、handleCommand に Command が要る
	initializeObjectRegistry();
	initializeCommands();
});

/**
 * コネクターは selectedConnectorId で選択され、selectedIds とは排他。
 * rootIds の並びでコネクターの初期 z 位置を指定する。
 */
const withConnectorSelected = (rootIds: string[]): CanvasControllerState =>
	createCommandState(twoRectsWithConnectorDoc, {
		selectedConnectorId: "conn-1",
		rootIds,
	});

/**
 * ObjectMenu の StackOrder クリックと同じ入口（ObjectMenuHandler → handleCommand）で、
 * コネクター選択時にも重なり順コマンドが効くことを結合検証する。
 */
describe("コネクター選択時の重なり順（StackOrder / handleCommand 経由）", () => {
	it("StackOrder メニューが表示される条件（isArrangeableSelection）を満たす", () => {
		expect(
			isArrangeableSelection(
				withConnectorSelected(["rect-1", "rect-2", "conn-1"]),
			),
		).toBe(true);
	});

	it("sendToBack: コネクターを最背面へ", () => {
		expect(
			runCommand(
				withConnectorSelected(["rect-1", "rect-2", "conn-1"]),
				"sendToBack",
			).rootIds,
		).toEqual(["conn-1", "rect-1", "rect-2"]);
	});

	it("bringToFront: コネクターを最前面へ", () => {
		expect(
			runCommand(
				withConnectorSelected(["conn-1", "rect-1", "rect-2"]),
				"bringToFront",
			).rootIds,
		).toEqual(["rect-1", "rect-2", "conn-1"]);
	});

	it("sendBackward: コネクターを1つ背面へ", () => {
		expect(
			runCommand(
				withConnectorSelected(["rect-1", "conn-1", "rect-2"]),
				"sendBackward",
			).rootIds,
		).toEqual(["conn-1", "rect-1", "rect-2"]);
	});

	it("bringForward: コネクターを1つ前面へ", () => {
		expect(
			runCommand(
				withConnectorSelected(["rect-1", "conn-1", "rect-2"]),
				"bringForward",
			).rootIds,
		).toEqual(["rect-1", "rect-2", "conn-1"]);
	});
});
