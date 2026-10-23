import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { CanvasControllerState } from "../../../CanvasTypes";
import { createTestState } from "../../../reducer/__tests__/support/createTestState";
import type { CanvasAction } from "../../../reducer/CanvasActions";
import { createCanvasReducer } from "../../../reducer/canvasReducer";
import { createTestRegistries } from "../../../registries/createCanvasRegistries";
import { selectionOf } from "../../../selection/__tests__/support/selectionOf";
import { textSlotPartSelection } from "../../../selection/__tests__/support/textSlotPartSelection";
import {
	CommitTextEditCommand,
	isCommitTextEditShortcut,
} from "../CommitTextEditCommand";

const registries = createTestRegistries();
const canvasReducer = createCanvasReducer(registries);

/**
 * A text object that sizes itself to its content, with a connector hanging off
 * it, so a commit has a box to re-measure and a vertex to settle; and a free
 * connector carrying a label.
 */
const doc = {
	version: 1,
	root: [
		{ id: "text-1", type: "text", x: 100, y: 60, text: "hi", fontSize: 16 },
		{
			id: "conn-1",
			type: "connector",
			points: [],
			source: { owner: { id: "text-1" }, anchor: { kind: "center" } },
			target: { anchor: { kind: "free", point: { x: 400, y: 400 } } },
		},
		{
			id: "conn-2",
			type: "connector",
			points: [
				{ x: 0, y: 300 },
				{ x: 100, y: 300 },
			],
			label: { text: "old" },
		},
	],
} as unknown as CanvasDoc;

const shapeEditState = (draft: string): CanvasControllerState =>
	createTestState(doc, {
		selection: selectionOf(["text-1"], textSlotPartSelection("body")),
		textEditState: { kind: "shape", text: draft },
	});

const labelEditState = (draft: string): CanvasControllerState =>
	createTestState(doc, {
		selection: selectionOf(["conn-2"]),
		textEditState: { kind: "connectorLabel", text: draft },
	});

const commitByCommand: CanvasAction = {
	type: "COMMAND",
	commandId: CommitTextEditCommand.id,
};
const commitByPressOutside: CanvasAction = {
	type: "END_TEXT_EDIT",
	commit: true,
};

const widthOf = (state: CanvasControllerState): number =>
	(state.objects["text-1"] as unknown as { width: number }).width;

/** What a commit leaves behind that the two routes must agree on; the save nonce and coalesce clock aside. */
const outcomeOf = (state: CanvasControllerState) => ({
	objects: state.objects,
	selection: state.selection,
	textEditState: state.textEditState,
	commitVersion: state.commitVersion,
	viewport: state.viewport,
	past: state.history.past,
	presentObjects: state.history.present.source?.objects,
	future: state.history.future,
	saveRequestVersion: state.saveRequest.version,
});

describe("CommitTextEditCommand", () => {
	describe("canExecute", () => {
		it("holds while a shape's text or a connector's label is being edited", () => {
			expect(
				CommitTextEditCommand.canExecute(shapeEditState("hi"), registries),
			).toBe(true);
			expect(
				CommitTextEditCommand.canExecute(labelEditState("old"), registries),
			).toBe(true);
		});

		it("does not hold with no editor open, leaving the keystroke to the browser", () => {
			expect(
				CommitTextEditCommand.canExecute(createTestState(doc), registries),
			).toBe(false);
		});
	});

	describe("through the COMMAND route", () => {
		it("commits a shape's draft and closes the editor in one undo entry, as a press outside does", () => {
			const start = shapeEditState("hello world");
			const byCommand = canvasReducer(start, commitByCommand);
			const byPressOutside = canvasReducer(start, commitByPressOutside);

			expect(byCommand.textEditState).toBeNull();
			expect(
				(byCommand.objects["text-1"] as unknown as { text: unknown }).text,
			).toMatchObject({ body: { text: "hello world" } });
			// Re-measured to the longer text, so the box and the vertex settling
			// behind it are part of what the two routes are compared on.
			expect(widthOf(byCommand)).toBeGreaterThan(widthOf(start));
			expect(byCommand.history.past.map((entry) => entry.source)).toEqual([
				start.history.present.source,
			]);
			expect(outcomeOf(byCommand)).toEqual(outcomeOf(byPressOutside));
		});

		it("commits a connector's label, as a press outside does", () => {
			const start = labelEditState("new");
			const byCommand = canvasReducer(start, commitByCommand);
			const byPressOutside = canvasReducer(start, commitByPressOutside);

			expect(byCommand.textEditState).toBeNull();
			expect(
				(byCommand.objects["conn-2"] as unknown as { label: unknown }).label,
			).toEqual({ text: "new" });
			expect(byCommand.history.past).toHaveLength(1);
			expect(outcomeOf(byCommand)).toEqual(outcomeOf(byPressOutside));
		});

		it("closes an unchanged draft without recording anything", () => {
			const start = shapeEditState("hi");
			const after = canvasReducer(start, commitByCommand);

			expect(after.textEditState).toBeNull();
			expect(after.history.past).toEqual([]);
			expect(after.commitVersion).toBe(start.commitVersion);
		});

		it("leaves a canvas with no editor open as it was", () => {
			const start = createTestState(doc);
			expect(canvasReducer(start, commitByCommand)).toBe(start);
		});
	});
});

describe("isCommitTextEditShortcut", () => {
	/** Pin getPlatform()'s detection via navigator.userAgent. */
	const stubPlatform = (platform: "mac" | "win"): void => {
		const userAgent =
			platform === "mac"
				? "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"
				: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)";
		vi.stubGlobal("navigator", { userAgent });
	};

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	const keystroke = (
		modifiers: { ctrl?: boolean; meta?: boolean; shift?: boolean } = {},
	) => ({
		code: "Enter",
		key: "Enter",
		ctrlKey: modifiers.ctrl ?? false,
		metaKey: modifiers.meta ?? false,
		shiftKey: modifiers.shift ?? false,
		altKey: false,
	});

	it("is Ctrl+Enter off a Mac", () => {
		stubPlatform("win");
		expect(isCommitTextEditShortcut(keystroke({ ctrl: true }))).toBe(true);
		expect(isCommitTextEditShortcut(keystroke({ meta: true }))).toBe(false);
	});

	it("is Cmd+Enter on a Mac", () => {
		stubPlatform("mac");
		expect(isCommitTextEditShortcut(keystroke({ meta: true }))).toBe(true);
		expect(isCommitTextEditShortcut(keystroke({ ctrl: true }))).toBe(false);
	});

	it("leaves plain Enter (a newline) and Shift added alone", () => {
		stubPlatform("win");
		expect(isCommitTextEditShortcut(keystroke())).toBe(false);
		expect(
			isCommitTextEditShortcut(keystroke({ ctrl: true, shift: true })),
		).toBe(false);
	});
});
