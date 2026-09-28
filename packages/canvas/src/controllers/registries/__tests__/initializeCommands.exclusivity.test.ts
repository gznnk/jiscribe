import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { CanvasControllerState } from "../../CanvasTypes";
import type { Command, KeyBinding } from "../../commands/CommandTypes";
import { getPlatformShortcuts } from "../../commands/CommandUtils";
import { createInitialControllerState } from "../../reducer/createInitialControllerState";
import { ZOOM } from "../../utils/zoom";
import { createTestRegistries } from "../createCanvasRegistries";

/**
 * Shortcut routing exclusivity: registration order must never decide which
 * command a keystroke runs. `findAllByShortcut` hands every match to
 * useKeyboardShortcuts, which picks the first whose `canExecute` passes — so the
 * invariant is that for any keystroke either at most one command matches, or the
 * matching commands are never available at the same time.
 *
 * This is the counterpart of initializeGestureHandlerRegistry.exclusivity.test:
 * a new binding that overlaps an existing one fails here instead of silently
 * depending on its position in ALL_COMMANDS.
 */

const registries = createTestRegistries();

const rectsDoc: CanvasDoc = {
	version: 1,
	root: [
		{ id: "rect-1", type: "rect", x: 0, y: 0, width: 10, height: 10 },
		{ id: "rect-2", type: "rect", x: 100, y: 100, width: 10, height: 10 },
	],
} as unknown as CanvasDoc;

const emptyDoc: CanvasDoc = { version: 1, root: [] } as unknown as CanvasDoc;

const buildState = (
	doc: CanvasDoc,
	overrides: Partial<CanvasControllerState> = {},
): CanvasControllerState => ({
	...createInitialControllerState(doc, registries),
	...overrides,
});

/** An object spelling its text out as slots, so Tab / Shift+Tab have a target. */
const slotObjects = {
	"rec-1": {
		id: "rec-1",
		type: "record",
		features: { text: "slots" },
		text: { name: { text: "User" }, attributes: { text: [] } },
	},
} as never;

const historyDepth = (past: number, future: number) => {
	const seed = createInitialControllerState(rectsDoc, registries).history;
	return {
		past: Array.from({ length: past }, () => seed.present),
		present: seed.present,
		future: Array.from({ length: future }, () => seed.present),
	};
};

/**
 * States the availability of two colliding commands is compared over. Wide
 * enough that a pair claiming the same binding for genuinely different contexts
 * (a cell selection versus an object selection, say) shows up as overlapping
 * here unless it truly is exclusive.
 */
const STATE_MATRIX: { name: string; state: CanvasControllerState }[] = [
	{ name: "empty canvas", state: buildState(emptyDoc) },
	{ name: "nothing selected", state: buildState(rectsDoc) },
	{
		name: "one object selected",
		state: buildState(rectsDoc, { selectedIds: ["rect-1"] }),
	},
	{
		name: "two objects selected",
		state: buildState(rectsDoc, { selectedIds: ["rect-1", "rect-2"] }),
	},
	{
		name: "connector selected",
		state: buildState(rectsDoc, { selectedConnectorId: "conn-1" }),
	},
	{
		name: "vertex selected",
		state: buildState(rectsDoc, {
			selectedVertex: { objectId: "rect-1", vertexIndex: 0 },
		}),
	},
	{
		name: "slot-bearing object selected",
		state: buildState(emptyDoc, {
			objects: slotObjects,
			selectedIds: ["rec-1"],
		}),
	},
	{
		name: "slot selected inside the object",
		state: buildState(emptyDoc, {
			objects: slotObjects,
			selectedIds: ["rec-1"],
			selectedTextSlot: { objectId: "rec-1", slotId: "name" },
		}),
	},
	{
		name: "text editing in progress",
		state: buildState(rectsDoc, {
			selectedIds: ["rect-1"],
			textEditState: { objectId: "rect-1" } as never,
		}),
	},
	{
		name: "object drag in progress",
		state: buildState(rectsDoc, {
			selectedIds: ["rect-1"],
			activeDrag: { startSnapshot: {} } as never,
		}),
	},
	{
		name: "area-selection drag in progress",
		state: buildState(rectsDoc, {
			activeDrag: { startSnapshot: {} } as never,
			areaSelection: { x: 0, y: 0 } as never,
		}),
	},
	{
		name: "stencil flyout open",
		state: buildState(rectsDoc, { stencilLibraryOpenCategory: "flowchart" }),
	},
	{
		name: "history full in both directions",
		state: buildState(rectsDoc, {
			selectedIds: ["rect-1"],
			history: historyDepth(1, 1),
		}),
	},
	{
		name: "zoom at its floor",
		state: buildState(rectsDoc, {
			viewport: { minX: 0, minY: 0, width: 1000, height: 800, zoom: ZOOM.MIN },
		}),
	},
	{
		name: "zoom at its ceiling",
		state: buildState(rectsDoc, {
			viewport: { minX: 0, minY: 0, width: 1000, height: 800, zoom: ZOOM.MAX },
		}),
	},
];

/**
 * The character a physical key produces on a US layout, unshifted and shifted.
 * Code-based and key-based bindings can only collide through a real key press,
 * so the sweep pairs each `code` with the `key` it actually yields instead of
 * crossing every code with every key (which would flag impossible events).
 * Every bound code must appear here — a new binding on an unlisted code fails
 * the coverage test below rather than being swept with a wrong key.
 */
const US_KEY_BY_CODE: Record<string, readonly [string, string]> = {
	KeyA: ["a", "A"],
	KeyC: ["c", "C"],
	KeyD: ["d", "D"],
	KeyG: ["g", "G"],
	KeyV: ["v", "V"],
	KeyX: ["x", "X"],
	KeyY: ["y", "Y"],
	KeyZ: ["z", "Z"],
	Digit0: ["0", ")"],
	Digit2: ["2", "@"],
	Minus: ["-", "_"],
	Equal: ["=", "+"],
	Semicolon: [";", ":"],
	Escape: ["Escape", "Escape"],
	Tab: ["Tab", "Tab"],
	Enter: ["Enter", "Enter"],
	Delete: ["Delete", "Delete"],
	Backspace: ["Backspace", "Backspace"],
	ArrowUp: ["ArrowUp", "ArrowUp"],
	ArrowDown: ["ArrowDown", "ArrowDown"],
	ArrowLeft: ["ArrowLeft", "ArrowLeft"],
	ArrowRight: ["ArrowRight", "ArrowRight"],
};

/** The physical key a character comes from on a US layout, for the reverse pairing. */
const US_CODE_BY_KEY: Record<string, string> = {
	"?": "Slash",
	"+": "Equal",
	"[": "BracketLeft",
	"]": "BracketRight",
	"{": "BracketLeft",
	"}": "BracketRight",
};

type Modifiers = {
	ctrlKey: boolean;
	shiftKey: boolean;
	altKey: boolean;
	metaKey: boolean;
};

const MODIFIER_COMBINATIONS: Modifiers[] = [false, true].flatMap((ctrlKey) =>
	[false, true].flatMap((shiftKey) =>
		[false, true].flatMap((altKey) =>
			[false, true].map((metaKey) => ({
				ctrlKey,
				shiftKey,
				altKey,
				metaKey,
			})),
		),
	),
);

/** Pin getPlatform()'s detection via navigator.userAgent. */
const stubPlatform = (platform: "mac" | "win"): void => {
	vi.stubGlobal("navigator", {
		userAgent:
			platform === "mac"
				? "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"
				: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
	});
};

const bindingsOf = (command: Command): KeyBinding[] =>
	command.shortcuts ? getPlatformShortcuts(command.shortcuts) : [];

const allBindings = (): KeyBinding[] =>
	registries.command.getAll().flatMap(bindingsOf);

const keyEvent = (
	code: string,
	key: string,
	modifiers: Modifiers,
): KeyboardEvent => ({ code, key, ...modifiers }) as KeyboardEvent;

/**
 * Every keystroke the registered bindings can be reached by, on one platform:
 * each bound `code` paired with the character it produces, and each bound `key`
 * paired with the code it comes from, across all sixteen modifier combinations.
 */
const sweepEvents = (): KeyboardEvent[] => {
	const bindings = allBindings();
	const codes = new Set(
		bindings.flatMap((binding) => (binding.code ? [binding.code] : [])),
	);
	const keys = new Set(
		bindings.flatMap((binding) => (binding.key ? [binding.key] : [])),
	);

	return MODIFIER_COMBINATIONS.flatMap((modifiers) => [
		...Array.from(codes, (code) =>
			keyEvent(
				code,
				US_KEY_BY_CODE[code]?.[modifiers.shiftKey ? 1 : 0] ?? "Unidentified",
				modifiers,
			),
		),
		...Array.from(keys, (key) =>
			keyEvent(US_CODE_BY_KEY[key] ?? "Unidentified", key, modifiers),
		),
	]);
};

const describeEvent = (event: KeyboardEvent): string => {
	const parts = [
		event.ctrlKey ? "Ctrl" : "",
		event.shiftKey ? "Shift" : "",
		event.altKey ? "Alt" : "",
		event.metaKey ? "Meta" : "",
		`${event.code}/"${event.key}"`,
	].filter(Boolean);
	return parts.join("+");
};

/** The states where both commands are available at once, by matrix entry name. */
const overlappingStates = (left: Command, right: Command): string[] =>
	STATE_MATRIX.filter(
		({ state }) =>
			left.canExecute(state, registries) && right.canExecute(state, registries),
	).map(({ name }) => name);

const sweepCollisions = (): string[] => {
	const violations: string[] = [];

	for (const event of sweepEvents()) {
		const matches = registries.command.findAllByShortcut(event);
		for (let i = 0; i < matches.length; i++) {
			for (let j = i + 1; j < matches.length; j++) {
				const overlaps = overlappingStates(matches[i], matches[j]);
				if (overlaps.length > 0) {
					violations.push(
						`${describeEvent(event)} -> ${matches[i].id} / ${matches[j].id} both available in: ${overlaps.join(", ")}`,
					);
				}
			}
		}
	}

	return violations;
};

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("command shortcut routing exclusivity", () => {
	it("covers every bound key code with a US layout character", () => {
		for (const platform of ["mac", "win"] as const) {
			stubPlatform(platform);
			const unmapped = allBindings()
				.flatMap((binding) => (binding.code ? [binding.code] : []))
				.filter((code) => US_KEY_BY_CODE[code] === undefined);
			expect(unmapped).toEqual([]);
		}
	});

	it("never leaves two commands available for the same keystroke on Windows", () => {
		stubPlatform("win");
		expect(sweepCollisions()).toEqual([]);
	});

	it("never leaves two commands available for the same keystroke on Mac", () => {
		stubPlatform("mac");
		expect(sweepCollisions()).toEqual([]);
	});

	it("registers every command id exactly once", () => {
		const ids = registries.command.getAll().map((command) => command.id);
		expect(ids).toHaveLength(new Set(ids).size);
	});

	// Guards the sweep itself: a matcher that stopped matching would make the
	// collision sweep pass vacuously.
	it("reaches every command that declares a shortcut", () => {
		stubPlatform("win");
		const reached = new Set(
			sweepEvents().flatMap((event) =>
				registries.command
					.findAllByShortcut(event)
					.map((command) => command.id),
			),
		);
		const bound = registries.command
			.getAll()
			.filter((command) => command.shortcuts !== undefined)
			.map((command) => command.id);
		expect(bound.filter((id) => !reached.has(id))).toEqual([]);
		expect(bound.length).toBeGreaterThan(0);
	});

	it("routes the shift-separated pairs to one command each", () => {
		stubPlatform("win");
		const matchedIds = (
			code: string,
			modifiers: Partial<Modifiers>,
		): string[] =>
			registries.command
				.findAllByShortcut(
					keyEvent(code, "Unidentified", {
						ctrlKey: false,
						shiftKey: false,
						altKey: false,
						metaKey: false,
						...modifiers,
					}),
				)
				.map((command) => command.id);

		expect(matchedIds("Tab", {})).toEqual(["selectNextTextSlot"]);
		expect(matchedIds("Tab", { shiftKey: true })).toEqual([
			"selectPreviousTextSlot",
		]);
		expect(matchedIds("KeyZ", { ctrlKey: true })).toEqual(["undo"]);
		expect(matchedIds("KeyZ", { ctrlKey: true, shiftKey: true })).toEqual([
			"redo",
		]);
		expect(matchedIds("ArrowUp", {})).toEqual(["move-up"]);
		expect(matchedIds("ArrowUp", { shiftKey: true })).toEqual([
			"move-up-large",
		]);
		expect(matchedIds("Delete", {})).toEqual(["delete"]);
	});
});
