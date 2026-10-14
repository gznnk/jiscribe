import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import type { RichText } from "@jiscribe/doc/model/objects/types/text/RichText";
import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { TextSlots } from "../../../../states/objects/types/TextSlots";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { createTestRegistries } from "../../../registries/createCanvasRegistries";
import { selectionOf } from "../../../selection/__tests__/support/selectionOf";
import {
	connectorOf,
	slotPickOf,
	sourceRectOf,
	textRectOf,
} from "../../../style/__tests__/support/styleFixtures";
import { materializeObjects } from "../../../utils/cowObjects";
import { createCommandState } from "../../__tests__/support/createCommandState";
import { runCommand } from "../../__tests__/support/dispatch";
import {
	findTextFormatByShortcut,
	toggleTextFormatCommands,
} from "../ToggleTextFormatCommands";

const registries = createTestRegistries();

const emptyDoc = { version: 1, root: [] } as unknown as CanvasDoc;

/**
 * A canvas holding `objects`, with `selectedIds` selected and, when `edit` is
 * given, a shape editor open on the first of them with that draft and selection.
 */
const stateOf = (
	objects: Record<string, ObjectState>,
	selectedIds: readonly string[],
	edit?: { draft: RichText; selection?: { start: number; end: number } },
): CanvasControllerState =>
	createCommandState(emptyDoc, {
		objects,
		selection: selectionOf(
			selectedIds,
			edit === undefined ? null : slotPickOf("body"),
		),
		textEditState:
			edit === undefined
				? null
				: { kind: "shape", text: edit.draft, selection: edit.selection },
	});

/** Runs a command and flattens its copy-on-write objects, as the reducer does, so the result can be pressed again. */
const press = (
	state: CanvasControllerState,
	commandId: string,
): CanvasControllerState => {
	const next = runCommand(state, commandId);
	return next === state
		? state
		: { ...next, objects: materializeObjects(next.objects) };
};

const bodyOf = (state: CanvasControllerState, id: string): unknown =>
	(state.objects[id] as unknown as { text: TextSlots }).text.body;

describe("toggleTextFormatCommands", () => {
	it("registers one command per format, each with its own id", () => {
		expect(toggleTextFormatCommands.map((command) => command.id)).toEqual([
			"toggleBold",
			"toggleItalic",
			"toggleUnderline",
			"toggleStrikethrough",
		]);
	});

	describe("with an editor open", () => {
		it("a selected stretch takes the format alone, and the draft follows it", () => {
			const a = textRectOf("a", { body: { text: "hello" } });
			const next = press(
				stateOf({ a }, ["a"], {
					draft: "hello",
					selection: { start: 0, end: 2 },
				}),
				"toggleBold",
			);
			expect(bodyOf(next, "a")).toEqual({
				text: [{ text: "he", fontWeight: "bold" }, { text: "llo" }],
			});
			expect(next.textEditState).toMatchObject({
				text: [{ text: "he", fontWeight: "bold" }, { text: "llo" }],
			});
			expect(next.commitVersion).toBe(1);
		});

		it("styles the text being typed, not the last committed one", () => {
			const a = textRectOf("a", { body: { text: "hi" } });
			const next = press(
				stateOf({ a }, ["a"], {
					draft: "hi there",
					selection: { start: 3, end: 8 },
				}),
				"toggleBold",
			);
			expect(bodyOf(next, "a")).toEqual({
				text: [{ text: "hi " }, { text: "there", fontWeight: "bold" }],
			});
		});

		it("a caret alone flips the whole slot being edited", () => {
			const a = textRectOf("a", {
				body: { text: [{ text: "he", fontStyle: "italic" }, { text: "llo" }] },
			});
			const next = press(
				stateOf({ a }, ["a"], {
					draft: [{ text: "he", fontStyle: "italic" }, { text: "llo" }],
					selection: { start: 2, end: 2 },
				}),
				"toggleItalic",
			);
			// The slot is upright, so the press turns it italic and drops the run
			// that already was.
			expect(bodyOf(next, "a")).toEqual({ text: "hello", fontStyle: "italic" });
		});

		it("a source-language body is not offered the format at all", () => {
			const a = sourceRectOf("a", { body: { text: "# Title" } });
			const state = stateOf({ a }, ["a"], {
				draft: "# Title",
				selection: { start: 0, end: 2 },
			});
			expect(toggleTextFormatCommands[0].canExecute(state, registries)).toBe(
				false,
			);
			expect(press(state, "toggleBold")).toBe(state);
		});
	});

	describe("with no editor open", () => {
		it("flips the whole text of the selected shape", () => {
			const a = textRectOf("a", { body: { text: "hello" } });
			const next = press(stateOf({ a }, ["a"]), "toggleBold");
			expect(bodyOf(next, "a")).toEqual({ text: "hello", fontWeight: "bold" });
			expect(next.commitVersion).toBe(1);
		});

		it("a selection mixing the format comes out all on, then all off", () => {
			const a = textRectOf("a", { body: { text: "A", fontWeight: "bold" } });
			const b = textRectOf("b", { body: { text: "B" } });
			const mixed = stateOf({ a, b }, ["a", "b"]);

			const allOn = press(mixed, "toggleBold");
			expect(bodyOf(allOn, "a")).toEqual({ text: "A", fontWeight: "bold" });
			expect(bodyOf(allOn, "b")).toEqual({ text: "B", fontWeight: "bold" });

			const allOff = press(allOn, "toggleBold");
			expect(bodyOf(allOff, "a")).toEqual({ text: "A", fontWeight: "normal" });
			expect(bodyOf(allOff, "b")).toEqual({ text: "B", fontWeight: "normal" });
		});

		it("an underline press keeps the strikethrough", () => {
			const a = textRectOf("a", {
				body: { text: "hello", textDecoration: "line-through" },
			});
			const underlined = press(stateOf({ a }, ["a"]), "toggleUnderline");
			expect(bodyOf(underlined, "a")).toEqual({
				text: "hello",
				textDecoration: "underline line-through",
			});
			const cleared = press(underlined, "toggleUnderline");
			expect(bodyOf(cleared, "a")).toEqual({
				text: "hello",
				textDecoration: "line-through",
			});
		});

		it("a strikethrough press keeps the underline", () => {
			const a = textRectOf("a", {
				body: { text: "hello", textDecoration: "underline" },
			});
			const struck = press(stateOf({ a }, ["a"]), "toggleStrikethrough");
			expect(bodyOf(struck, "a")).toEqual({
				text: "hello",
				textDecoration: "underline line-through",
			});
		});
	});

	describe("underline and strikethrough each keep the other line", () => {
		it("shapes all underlined take it off together, each keeping its own strikethrough", () => {
			const a = textRectOf("a", {
				body: { text: "A", textDecoration: "underline" },
			});
			const b = textRectOf("b", {
				body: { text: "B", textDecoration: "underline line-through" },
			});
			const next = press(stateOf({ a, b }, ["a", "b"]), "toggleUnderline");
			expect(bodyOf(next, "a")).toEqual({ text: "A", textDecoration: "none" });
			expect(bodyOf(next, "b")).toEqual({
				text: "B",
				textDecoration: "line-through",
			});
			expect(next.commitVersion).toBe(1);
		});

		it("shapes underlined in part all take it, each keeping its own strikethrough", () => {
			const a = textRectOf("a", {
				body: { text: "A", textDecoration: "underline" },
			});
			const b = textRectOf("b", {
				body: { text: "B", textDecoration: "line-through" },
			});
			const next = press(stateOf({ a, b }, ["a", "b"]), "toggleUnderline");
			expect(bodyOf(next, "a")).toEqual({
				text: "A",
				textDecoration: "underline",
			});
			expect(bodyOf(next, "b")).toEqual({
				text: "B",
				textDecoration: "underline line-through",
			});
		});

		it("a selected stretch whose runs differ sets the line run by run", () => {
			const draft = [
				{ text: "ab", textDecoration: "underline" },
				{ text: "cd", textDecoration: "underline line-through" },
			];
			const a = textRectOf("a", { body: { text: draft } });
			const next = press(
				stateOf({ a }, ["a"], { draft, selection: { start: 0, end: 4 } }),
				"toggleUnderline",
			);
			expect(bodyOf(next, "a")).toEqual({
				text: [
					{ text: "ab", textDecoration: "none" },
					{ text: "cd", textDecoration: "line-through" },
				],
			});
			expect(next.commitVersion).toBe(1);
		});

		it("a caret alone keeps the strikethrough a run of the slot carries", () => {
			const draft = [
				{ text: "he", textDecoration: "underline line-through" },
				{ text: "llo" },
			];
			const a = textRectOf("a", {
				body: { text: draft, textDecoration: "underline" },
			});
			const next = press(
				stateOf({ a }, ["a"], { draft, selection: { start: 1, end: 1 } }),
				"toggleUnderline",
			);
			expect(bodyOf(next, "a")).toEqual({
				text: [{ text: "he", textDecoration: "line-through" }, { text: "llo" }],
				textDecoration: "none",
			});
		});

		it("a row-partitioned slot keeps the strikethrough of each row's runs", () => {
			const a = textRectOf("a", {
				body: {
					text: [
						"id",
						[{ text: "email", textDecoration: "underline line-through" }],
					],
					textDecoration: "underline",
				},
			});
			const next = press(stateOf({ a }, ["a"]), "toggleUnderline");
			expect(bodyOf(next, "a")).toEqual({
				text: ["id", [{ text: "email", textDecoration: "line-through" }]],
				textDecoration: "none",
			});
		});
	});

	describe("canExecute", () => {
		it("is false when nothing selected takes the format", () => {
			for (const command of toggleTextFormatCommands) {
				expect(command.canExecute(stateOf({}, []), registries)).toBe(false);
				expect(
					command.canExecute(
						stateOf({ c: connectorOf("c") }, ["c"]),
						registries,
					),
				).toBe(false);
			}
		});

		it("is true for a selected shape holding text", () => {
			const a = textRectOf("a", { body: { text: "hello" } });
			for (const command of toggleTextFormatCommands) {
				expect(command.canExecute(stateOf({ a }, ["a"]), registries)).toBe(
					true,
				);
			}
		});
	});
});

describe("findTextFormatByShortcut", () => {
	const keystroke = (
		code: string,
		modifiers: { shift?: boolean; alt?: boolean } = {},
	) => ({
		code,
		key: "",
		// The tests run outside a browser, so the platform reads as not a Mac.
		ctrlKey: true,
		metaKey: false,
		shiftKey: modifiers.shift ?? false,
		altKey: modifiers.alt ?? false,
	});

	it("names the format each command is bound to", () => {
		expect(findTextFormatByShortcut(keystroke("KeyB"))).toBe("bold");
		expect(findTextFormatByShortcut(keystroke("KeyI"))).toBe("italic");
		expect(findTextFormatByShortcut(keystroke("KeyU"))).toBe("underline");
		expect(findTextFormatByShortcut(keystroke("KeyX", { shift: true }))).toBe(
			"strikethrough",
		);
	});

	it("leaves Cut's Ctrl+X and an Alt chord alone", () => {
		expect(findTextFormatByShortcut(keystroke("KeyX"))).toBeUndefined();
		expect(
			findTextFormatByShortcut(keystroke("KeyB", { alt: true })),
		).toBeUndefined();
	});
});
