import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import type {
	InlineTextStyle,
	RichText,
} from "@jiscribe/doc/model/objects/types/RichText";
import {
	isSameInlineTextStyle,
	normalizeRichText,
	pickDefinedInlineTextStyle,
	remapRichText,
	richTextToPlain,
} from "@jiscribe/doc/model/objects/types/RichText";

import { createTestState } from "./createTestState";
import type { TextSlots } from "../../../../states/objects/types/TextSlots";
import { readRichTextSlot } from "../../../../states/objects/types/TextSlots";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { createTestRegistries } from "../../../registries/createCanvasRegistries";
import { graftTextEditDraft } from "../../../utils/graftTextEditDraft";
import type { CanvasAction } from "../../CanvasActions";
import { createCanvasReducer } from "../../canvasReducer";

/**
 * Randomized model test of one text-editing session against the reducer.
 *
 * A session is a random script of the operations a user can perform while an
 * editor is open — typing (any replacement of the plain text), format
 * keystrokes, styling from the ObjectMenu, committing and reopening — and a
 * model tracks alongside what must be true after every step. The invariants are
 * the seams the editor relies on: the draft stays canonical, holds exactly the
 * typed characters, reads back from the grafted object with the same styling it
 * shows, commits as what was on screen, and never grows a styling value nobody
 * applied.
 */

/** Deterministic PRNG (mulberry32), so a failing seed reproduces exactly. */
const createRandom = (seed: number): (() => number) => {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
};

const randomInt = (random: () => number, maxExclusive: number): number =>
	Math.floor(random() * maxExclusive);

const pick = <T>(random: () => number, values: readonly T[]): T =>
	values[randomInt(random, values.length)];

/** One step of a session script; kept as data so a failure can print the exact script. */
type FuzzOp =
	| {
			kind: "edit";
			nextPlain: string;
			/**
			 * Whether the simulated editor reports the edit with the draft's styling
			 * carried over (the browser extended a styled span) or as plain text (it
			 * landed outside every span). Both are bodies a real surface can read back.
			 */
			styled: boolean;
	  }
	| {
			kind: "toggle";
			format: "bold" | "italic" | "underline";
			start: number;
			end: number;
	  }
	| {
			kind: "menu";
			property: "fontColor" | "fontSize" | "fontWeight" | "fontStyle";
			value: string;
			/** Selection reported before the write; start === end takes the slot-wide path. */
			start: number;
			end: number;
			commit: boolean;
	  }
	| { kind: "commit" }
	| { kind: "cancel" };

/** How a session starts: the slot content the object opens with. */
export type FuzzScenario = {
	name: string;
	/** The body slot's stored content (a rows array is the row-partitioned form). */
	slotContent: unknown;
};

export const FUZZ_SCENARIOS: readonly FuzzScenario[] = [
	{ name: "plain body", slotContent: "hello world" },
	{
		name: "styled body",
		slotContent: [
			{ text: "he", fontWeight: "bold" },
			{ text: "llo " },
			{ text: "world", fontColor: "#d33", fontSize: 24 },
		],
	},
	{
		name: "rows body",
		slotContent: [
			[{ text: "id", fontWeight: "bold" }, { text: ": number" }],
			"name: string",
		],
	},
];

const OBJECT_ID = "rect-1";
const SLOT_ID = "body";

/** Characters typed text is drawn from; "\n" included so line handling is exercised. */
const ALPHABET = "abcXY .\n";

const MENU_VALUES: Record<string, readonly string[]> = {
	fontColor: ["#123456", "#abcdef"],
	fontSize: ["12", "24", "36"],
	fontWeight: ["bold", "normal"],
	fontStyle: ["italic", "normal"],
};

/** The run-override styling of each UTF-16 code unit, for by-character comparison. */
const charRunStyles = (body: RichText): InlineTextStyle[] => {
	const runs = typeof body === "string" ? [{ text: body }] : body;
	const styles: InlineTextStyle[] = [];
	for (const run of runs) {
		const style = pickDefinedInlineTextStyle(run);
		for (let index = 0; index < run.text.length; index += 1) {
			styles.push(style);
		}
	}
	return styles;
};

/** Structural equality without canonicalization, for asserting a body IS canonical. */
const isStructurallySameRichText = (a: RichText, b: RichText): boolean => {
	if (typeof a === "string" || typeof b === "string") {
		return a === b;
	}
	return (
		a.length === b.length &&
		a.every(
			(run, index) =>
				run.text === b[index].text && isSameInlineTextStyle(run, b[index]),
		)
	);
};

/**
 * Same characters drawn the same way, ignoring what a newline carries: the rows
 * round trip drops styling on the "\n" between rows, and that styling is
 * invisible either way.
 */
const assertSameVisibleText = (
	label: string,
	actual: RichText,
	expected: RichText,
	fail: (message: string) => never,
): void => {
	const actualPlain = richTextToPlain(actual);
	const expectedPlain = richTextToPlain(expected);
	if (actualPlain !== expectedPlain) {
		fail(
			`${label}: characters differ\n actual: ${JSON.stringify(actualPlain)}\n expected: ${JSON.stringify(expectedPlain)}`,
		);
	}
	const actualStyles = charRunStyles(actual);
	const expectedStyles = charRunStyles(expected);
	for (let index = 0; index < actualPlain.length; index += 1) {
		if (actualPlain[index] === "\n") {
			continue;
		}
		if (!isSameInlineTextStyle(actualStyles[index], expectedStyles[index])) {
			fail(
				`${label}: styling differs at offset ${index} (${JSON.stringify(actualPlain[index])})\n actual: ${JSON.stringify(actualStyles[index])}\n expected: ${JSON.stringify(expectedStyles[index])}`,
			);
		}
	}
};

/** The state the session model tracks between steps. */
type FuzzModel = {
	/** What the plain text must read as after the last step. */
	expectedPlain: string;
	/** The slot's own styling fields, which only a slot-wide menu write may change. */
	expectedSlotStyle: InlineTextStyle;
	/** Per property, every value a run override may legitimately hold. */
	allowedRunValues: Record<string, Set<string | number>>;
};

const readDraft = (state: CanvasControllerState): RichText => {
	if (state.textEditState?.kind !== "shape") {
		throw new Error("session is not open");
	}
	return state.textEditState.text;
};

const readSlot = (state: CanvasControllerState) => {
	const target = state.objects[OBJECT_ID] as unknown as { text: TextSlots };
	return target.text[SLOT_ID];
};

/** Builds the opening state: the object seeded with the scenario's slot content, session open. */
const openSession = (scenario: FuzzScenario): CanvasControllerState => {
	const doc: CanvasDoc = {
		version: 1,
		root: [
			{
				id: OBJECT_ID,
				type: "rect",
				x: 0,
				y: 0,
				width: 200,
				height: 80,
			},
		],
	} as unknown as CanvasDoc;
	const base = createTestState(doc, { selectedIds: [OBJECT_ID] });
	const seeded = {
		...base.objects[OBJECT_ID],
		text: { [SLOT_ID]: { text: scenario.slotContent } },
	} as CanvasControllerState["objects"][string];
	const objects = { ...base.objects, [OBJECT_ID]: seeded };
	return createTestState(doc, {
		selectedIds: [OBJECT_ID],
		objects,
		textEditState: {
			kind: "shape",
			objectId: OBJECT_ID,
			slotId: SLOT_ID,
			text: readRichTextSlot(
				(seeded as unknown as { text: TextSlots }).text,
				SLOT_ID,
			),
		},
	});
};

/** Generates the next step given the current plain text. */
const generateOp = (random: () => number, plain: string): FuzzOp => {
	const roll = random();
	if (roll < 0.55) {
		// An edit: the editor reports the whole plain text, so any replacement of a
		// random stretch models typing, deleting and pasting alike.
		const from = randomInt(random, plain.length + 1);
		const to = from + randomInt(random, plain.length - from + 1);
		let inserted = "";
		const insertedLength = randomInt(random, 4);
		for (let index = 0; index < insertedLength; index += 1) {
			inserted += pick(random, [...ALPHABET]);
		}
		return {
			kind: "edit",
			nextPlain: plain.slice(0, from) + inserted + plain.slice(to),
			styled: random() < 0.7,
		};
	}
	if (roll < 0.75) {
		const start = randomInt(random, plain.length + 1);
		const end = start + randomInt(random, plain.length - start + 1);
		return {
			kind: "toggle",
			format: pick(random, ["bold", "italic", "underline"] as const),
			start,
			end,
		};
	}
	if (roll < 0.9) {
		const property = pick(random, [
			"fontColor",
			"fontSize",
			"fontWeight",
			"fontStyle",
		] as const);
		const collapsed = random() < 0.5;
		const start = randomInt(random, plain.length + 1);
		const end = collapsed
			? start
			: start + randomInt(random, plain.length - start + 1);
		return {
			kind: "menu",
			property,
			value: pick(random, MENU_VALUES[property]),
			start,
			end,
			commit: random() < 0.5,
		};
	}
	return random() < 0.7 ? { kind: "commit" } : { kind: "cancel" };
};

/**
 * Runs one randomized session and checks every invariant after every step.
 * Throws with the seed, scenario and full script on the first violation.
 *
 * @param scenario - The slot content the session opens on
 * @param seed - PRNG seed; the same seed replays the same script
 * @param opCount - Steps in the script (commits and reopens included)
 */
export const runTextEditFuzzSession = (
	scenario: FuzzScenario,
	seed: number,
	opCount: number,
): void => {
	const registries = createTestRegistries();
	const canvasReducer = createCanvasReducer(registries);
	const random = createRandom(seed);
	const opLog: FuzzOp[] = [];

	const fail = (message: string): never => {
		throw new Error(
			`text edit fuzz: ${message}\n scenario: ${scenario.name}\n seed: ${seed}\n script: ${JSON.stringify(opLog)}`,
		);
	};

	let state = openSession(scenario);
	const initialDraft = readDraft(state);
	const initialSlot = readSlot(state);
	const model: FuzzModel = {
		expectedPlain: richTextToPlain(initialDraft),
		expectedSlotStyle: pickDefinedInlineTextStyle(
			initialSlot as unknown as InlineTextStyle,
		),
		allowedRunValues: {
			fontColor: new Set(),
			fontSize: new Set(),
			fontWeight: new Set(["bold", "normal"]),
			fontStyle: new Set(["italic", "normal"]),
		},
	};
	// Whatever the scenario opens with is legitimate everywhere.
	const allowInitialValues = (body: RichText): void => {
		if (typeof body === "string") {
			return;
		}
		for (const run of body) {
			for (const property of Object.keys(model.allowedRunValues)) {
				const value = run[property as keyof InlineTextStyle];
				if (value !== undefined) {
					model.allowedRunValues[property].add(value);
				}
			}
		}
	};
	allowInitialValues(initialDraft);

	const dispatch = (action: CanvasAction): void => {
		state = canvasReducer(state, action);
	};

	const checkInvariants = (lastOp: FuzzOp | null): void => {
		const draft = readDraft(state);

		// The draft is always canonical: every writer normalizes, and a
		// non-canonical body would compare unequal to its own echo.
		if (!isStructurallySameRichText(draft, normalizeRichText(draft))) {
			fail(`draft is not canonical: ${JSON.stringify(draft)}`);
		}

		// The draft holds exactly the characters the session typed.
		if (richTextToPlain(draft) !== model.expectedPlain) {
			fail(
				`draft characters diverged\n draft: ${JSON.stringify(richTextToPlain(draft))}\n expected: ${JSON.stringify(model.expectedPlain)}`,
			);
		}

		// What the grafted object draws is what the editor draws.
		const grafted = graftTextEditDraft(
			state.objects,
			state.textEditState,
			registries.objectContentResizer,
		);
		const graftedBody = readRichTextSlot(
			(grafted[OBJECT_ID] as unknown as { text: TextSlots }).text,
			SLOT_ID,
		);
		assertSameVisibleText("grafted slot vs draft", graftedBody, draft, fail);

		// The slot's own styling only moves through a slot-wide menu write.
		const slotStyle = pickDefinedInlineTextStyle(
			readSlot(state) as unknown as InlineTextStyle,
		);
		if (!isSameInlineTextStyle(slotStyle, model.expectedSlotStyle)) {
			fail(
				`slot styling changed unexpectedly\n slot: ${JSON.stringify(slotStyle)}\n expected: ${JSON.stringify(model.expectedSlotStyle)}`,
			);
		}

		// No run holds a styling value nobody applied.
		if (typeof draft !== "string") {
			for (const run of draft) {
				for (const [property, allowed] of Object.entries(
					model.allowedRunValues,
				)) {
					const value = run[property as keyof InlineTextStyle];
					if (value !== undefined && !allowed.has(value)) {
						fail(
							`run carries unapplied ${property} ${JSON.stringify(value)} in ${JSON.stringify(draft)}`,
						);
					}
				}
			}
		}

		// A slot-wide write leaves no run override of the written property behind.
		if (lastOp?.kind === "menu" && lastOp.start === lastOp.end) {
			if (
				typeof draft !== "string" &&
				draft.some(
					(run) => run[lastOp.property as keyof InlineTextStyle] !== undefined,
				)
			) {
				fail(
					`slot-wide ${lastOp.property} left run overrides behind: ${JSON.stringify(draft)}`,
				);
			}
		}
	};

	const reopen = (): void => {
		dispatch({ type: "COMMAND", commandId: "start-text-edit" });
		if (state.textEditState?.kind !== "shape") {
			fail("session did not reopen");
		}
		const draft = readDraft(state);
		model.expectedPlain = richTextToPlain(draft);
		model.expectedSlotStyle = pickDefinedInlineTextStyle(
			readSlot(state) as unknown as InlineTextStyle,
		);
		allowInitialValues(draft);
	};

	checkInvariants(null);

	for (let step = 0; step < opCount; step += 1) {
		const op = generateOp(random, model.expectedPlain);
		opLog.push(op);

		if (op.kind === "edit") {
			// What the editor reports is what its surface reads back: the draft's
			// styling carried onto the edit when the browser kept it in a styled
			// span, the plain characters when it did not.
			dispatch({
				type: "UPDATE_TEXT_EDIT",
				text: op.styled
					? remapRichText(readDraft(state), op.nextPlain)
					: op.nextPlain,
			});
			model.expectedPlain = op.nextPlain;
		} else if (op.kind === "toggle") {
			dispatch({
				type: "UPDATE_TEXT_EDIT_SELECTION",
				selection: { start: op.start, end: op.end },
			});
			dispatch({ type: "TOGGLE_TEXT_FORMAT", format: op.format });
		} else if (op.kind === "menu") {
			dispatch({
				type: "UPDATE_TEXT_EDIT_SELECTION",
				selection: { start: op.start, end: op.end },
			});
			dispatch({
				type: "MENU_PROPERTY_UPDATE",
				property: op.property,
				value: op.value,
				commit: op.commit,
			});
			const coerced = op.property === "fontSize" ? Number(op.value) : op.value;
			model.allowedRunValues[op.property].add(coerced);
			if (op.start === op.end) {
				model.expectedSlotStyle = {
					...model.expectedSlotStyle,
					[op.property]: coerced,
				};
			}
		} else if (op.kind === "commit") {
			const draftBeforeCommit = readDraft(state);
			dispatch({ type: "END_TEXT_EDIT", commit: true });
			if (state.textEditState !== null) {
				fail("commit left the session open");
			}
			const committedBody = readRichTextSlot(
				(state.objects[OBJECT_ID] as unknown as { text: TextSlots }).text,
				SLOT_ID,
			);
			// The commit writes what was on screen — characters and styling alike.
			assertSameVisibleText(
				"committed slot vs draft",
				committedBody,
				draftBeforeCommit,
				fail,
			);
			reopen();
		} else {
			dispatch({ type: "END_TEXT_EDIT", commit: false });
			if (state.textEditState !== null) {
				fail("cancel left the session open");
			}
			reopen();
		}

		checkInvariants(op);
	}
};
