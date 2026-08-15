import { expect, test } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Randomized editing sessions on the real editor surface, checked against
 * contracts that hold whatever Chrome does with the keys:
 *
 * - a keystroke lands in the selection the surface reported, and leaves the
 *   caret right after what it inserted;
 * - caret moves and format toggles change no characters;
 * - nothing moves the caret afterwards on its own (the editor redrawing under
 *   the caret — the original insertion-jumps-around bug — shows up here);
 * - what the commit draws is what the editor showed, glyph by glyph, computed
 *   typography included (a font size changing on commit shows up here).
 *
 * A failure prints the seed and the step log; rerun the seed alone to debug.
 * CI runs a fixed budget; raise TEXT_EDIT_FUZZ_SESSIONS locally to explore.
 */
const SESSIONS = Number(process.env.TEXT_EDIT_FUZZ_SESSIONS ?? 3);
const OPS_PER_SESSION = Number(process.env.TEXT_EDIT_FUZZ_OPS ?? 30);

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

type FuzzOp =
	| { kind: "type"; text: string }
	| { kind: "enter" }
	| { kind: "backspace" }
	| { kind: "forwardDelete" }
	| { kind: "caret"; key: string; presses: number }
	| { kind: "select"; key: string; presses: number }
	| { kind: "format"; key: "b" | "i" | "u" }
	| { kind: "commit" };

const generateOp = (random: () => number): FuzzOp => {
	const roll = random();
	if (roll < 0.4) {
		let text = "";
		const length = 1 + randomInt(random, 3);
		for (let index = 0; index < length; index += 1) {
			text += pick(random, [..."abcXY ."]);
		}
		return { kind: "type", text };
	}
	if (roll < 0.5) {
		return { kind: "enter" };
	}
	if (roll < 0.62) {
		return { kind: "backspace" };
	}
	if (roll < 0.68) {
		return { kind: "forwardDelete" };
	}
	if (roll < 0.78) {
		return {
			kind: "caret",
			key: pick(random, ["ArrowLeft", "ArrowRight", "Home", "End"]),
			presses: 1 + randomInt(random, 3),
		};
	}
	if (roll < 0.9) {
		return {
			kind: "select",
			key: pick(random, ["Shift+ArrowLeft", "Shift+ArrowRight"]),
			presses: 1 + randomInt(random, 4),
		};
	}
	if (roll < 0.96) {
		return { kind: "format", key: pick(random, ["b", "i", "u"] as const) };
	}
	// A mid-session commit narrows a coherence failure down to the few steps
	// since the previous one, which is what makes a failing script debuggable.
	return { kind: "commit" };
};

type EditorProbe = {
	text: string;
	selection: { start: number; end: number };
};

/**
 * The surface's text and selection once they have settled: read twice with a
 * frame between, so a caret the editor moves asynchronously after the fact (the
 * redraw-under-the-caret bug class) fails here rather than corrupting the next
 * step's expectation.
 */
const probeSettled = async (
	canvas: CanvasDriver,
	fail: (message: string) => never,
): Promise<EditorProbe> => {
	const first = {
		text: await canvas.textEditorText(),
		selection: await canvas.textEditorSelection(),
	};
	await canvas.page.waitForTimeout(60);
	const second = {
		text: await canvas.textEditorText(),
		selection: await canvas.textEditorSelection(),
	};
	if (first.text === null || first.selection === null) {
		fail("editor closed unexpectedly");
	}
	if (
		first.text !== second.text ||
		first.selection?.start !== second.selection?.start ||
		first.selection?.end !== second.selection?.end
	) {
		fail(
			`surface changed on its own after the keys settled\n first: ${JSON.stringify(first)}\n second: ${JSON.stringify(second)}`,
		);
	}
	return second as EditorProbe;
};

/** What an insertion must leave behind, given the settled state it typed into. */
const expectInsertion = (
	before: EditorProbe,
	after: EditorProbe,
	inserted: string,
	fail: (message: string) => never,
): void => {
	const expectedText =
		before.text.slice(0, before.selection.start) +
		inserted +
		before.text.slice(before.selection.end);
	const expectedCaret = before.selection.start + inserted.length;
	if (after.text !== expectedText) {
		fail(
			`insertion landed off the caret\n typed: ${JSON.stringify(inserted)}\n into: ${JSON.stringify(before)}\n got text: ${JSON.stringify(after.text)}\n expected: ${JSON.stringify(expectedText)}`,
		);
	}
	if (
		after.selection.start !== expectedCaret ||
		after.selection.end !== expectedCaret
	) {
		fail(
			`caret not after the insertion\n typed: ${JSON.stringify(inserted)}\n into: ${JSON.stringify(before)}\n got selection: ${JSON.stringify(after.selection)}\n expected caret: ${expectedCaret}`,
		);
	}
};

/** Per-code-unit view of drawn runs, for glyph-by-glyph typography comparison. */
const perCharStyles = (
	runs: {
		text: string;
		color: string;
		fontSize: string;
		fontWeight: string;
		fontStyle: string;
	}[],
): { char: string; style: string }[] =>
	runs.flatMap((run) =>
		[...run.text].map((char) => ({
			char,
			style: `${run.color} ${run.fontSize} ${run.fontWeight} ${run.fontStyle}`,
		})),
	);

/**
 * Per-code-unit styling of the open editor surface, read node by node: after
 * browser edits the surface mixes styled spans with bare text nodes (a char
 * typed outside every span), which a children-only walk would drop. Each
 * character carries the computed typography of the element it is drawn by.
 */
const editorPerCharStyles = (
	canvas: CanvasDriver,
): Promise<{ char: string; style: string }[]> =>
	canvas.page.evaluate(() => {
		const surface = document.querySelector(
			'[data-testid="text-editor"] [contenteditable="true"]',
		);
		if (!(surface instanceof HTMLElement)) {
			return [];
		}
		const chars: { char: string; style: string }[] = [];
		const pushChars = (text: string, element: Element): void => {
			const style = getComputedStyle(element);
			for (const char of text) {
				chars.push({
					char,
					style: `${style.color} ${style.fontSize} ${style.fontWeight} ${style.fontStyle}`,
				});
			}
		};
		const visit = (parent: Node): void => {
			for (const child of parent.childNodes) {
				if (child.nodeType === Node.TEXT_NODE) {
					pushChars(
						(child as Text).data,
						child.parentElement ?? (surface as Element),
					);
					continue;
				}
				if (!(child instanceof Element)) {
					continue;
				}
				if (child.tagName === "BR") {
					pushChars("\n", child.parentElement ?? (surface as Element));
					continue;
				}
				if (
					(child.tagName === "DIV" || child.tagName === "P") &&
					chars.length > 0
				) {
					pushChars("\n", child);
				}
				visit(child);
			}
		};
		visit(surface);
		// The trailing padding break is not a character of the text.
		if (chars.length > 0 && chars[chars.length - 1].char === "\n") {
			chars.pop();
		}
		return chars;
	});

test.describe("text editing fuzz on the real surface", () => {
	test("random sessions keep the editing contracts", async ({ canvas }) => {
		// Scaled to the requested budget: a deep local run (dozens of sessions of
		// dozens of settled keystrokes each) takes well over the default timeout.
		test.setTimeout(Math.max(600_000, SESSIONS * OPS_PER_SESSION * 1_000));
		await canvas.drawShape("Rectangle", { x: 380, y: 180 }, { x: 620, y: 340 });
		const [shape] = await canvas.captureObjects();
		const shapeId = shape.id;
		if (shapeId === null) {
			throw new Error("drawn shape carries no data-id");
		}
		await canvas.deselect();

		for (let seed = 1; seed <= SESSIONS; seed += 1) {
			const random = createRandom(seed);
			const opLog: (FuzzOp | "commit")[] = [];
			const fail = (message: string): never => {
				throw new Error(
					`text edit e2e fuzz: ${message}\n seed: ${seed}\n script: ${JSON.stringify(opLog)}`,
				);
			};

			// Opens the editor on the shape, aiming the double-click at where it is
			// drawn NOW rather than at a fixed coordinate.
			const openEditor = async (): Promise<void> => {
				for (let attempt = 0; attempt < 3; attempt += 1) {
					const box = await canvas.page
						.locator(`[data-id="${shapeId}"]`)
						.boundingBox();
					if (!box) {
						return fail("shape not found to double-click");
					}
					await canvas.page.mouse.dblclick(
						box.x + box.width / 2,
						box.y + box.height / 2,
					);
					try {
						await canvas.waitForTextEditor();
						return;
					} catch {
						// Retry the double-click.
					}
				}
				fail("editor did not open on the session's double-click");
			};

			// Commit coherence: the overlay must draw what the editor showed,
			// glyph by glyph, computed typography included.
			const commitAndCheck = async (): Promise<void> => {
				const editorChars = (await editorPerCharStyles(canvas)).filter(
					({ char }) => char !== "\n",
				);
				await canvas.commitText();
				const overlayChars = perCharStyles(
					await canvas.drawnTextRuns(shapeId),
				).filter(({ char }) => char !== "\n");

				const editorText = editorChars.map(({ char }) => char).join("");
				const overlayText = overlayChars.map(({ char }) => char).join("");
				if (overlayText !== editorText) {
					fail(
						`commit changed the characters\n editor: ${JSON.stringify(editorText)}\n overlay: ${JSON.stringify(overlayText)}`,
					);
				}
				for (let index = 0; index < editorChars.length; index += 1) {
					if (editorChars[index].style !== overlayChars[index].style) {
						fail(
							`commit changed the typography of ${JSON.stringify(editorChars[index].char)} at ${index}\n editor: ${editorChars[index].style}\n overlay: ${overlayChars[index].style}`,
						);
					}
				}
			};

			// Each session starts over from a short seed text: an ever-growing text
			// makes the caret reveal scroll the camera off the shape (and the culled
			// shape unclickable), which is camera behavior, not what this fuzz is
			// after. Mid-session commits still chain edited text through commits.
			await openEditor();
			await canvas.page.keyboard.press("Control+Home");
			await canvas.page.keyboard.press("Shift+Control+End");
			const seedText = `s${seed} `;
			await canvas.page.keyboard.type(seedText);
			let settled = await probeSettled(canvas, fail);
			if (settled.text !== seedText) {
				fail(
					`session reset left ${JSON.stringify(settled.text)} instead of ${JSON.stringify(seedText)}`,
				);
			}

			for (let step = 0; step < OPS_PER_SESSION; step += 1) {
				const op = generateOp(random);
				opLog.push(op);
				const before = settled;

				if (op.kind === "commit") {
					await commitAndCheck();
					await openEditor();
					settled = await probeSettled(canvas, fail);
				} else if (op.kind === "type") {
					await canvas.page.keyboard.type(op.text);
					settled = await probeSettled(canvas, fail);
					expectInsertion(before, settled, op.text, fail);
				} else if (op.kind === "enter") {
					await canvas.page.keyboard.press("Enter");
					settled = await probeSettled(canvas, fail);
					expectInsertion(before, settled, "\n", fail);
				} else if (op.kind === "backspace") {
					await canvas.page.keyboard.press("Backspace");
					settled = await probeSettled(canvas, fail);
					const { start, end } = before.selection;
					const from = start === end ? Math.max(0, start - 1) : start;
					const expected = before.text.slice(0, from) + before.text.slice(end);
					if (settled.text !== expected) {
						fail(
							`backspace deleted the wrong stretch\n before: ${JSON.stringify(before)}\n got: ${JSON.stringify(settled.text)}\n expected: ${JSON.stringify(expected)}`,
						);
					}
				} else if (op.kind === "forwardDelete") {
					await canvas.page.keyboard.press("Delete");
					settled = await probeSettled(canvas, fail);
					const { start, end } = before.selection;
					const to =
						start === end ? Math.min(before.text.length, end + 1) : end;
					const expected = before.text.slice(0, start) + before.text.slice(to);
					if (settled.text !== expected) {
						fail(
							`delete removed the wrong stretch\n before: ${JSON.stringify(before)}\n got: ${JSON.stringify(settled.text)}\n expected: ${JSON.stringify(expected)}`,
						);
					}
				} else if (op.kind === "caret" || op.kind === "select") {
					for (let press = 0; press < op.presses; press += 1) {
						await canvas.page.keyboard.press(op.key);
					}
					settled = await probeSettled(canvas, fail);
					if (settled.text !== before.text) {
						fail(
							`${op.kind} move changed the text\n before: ${JSON.stringify(before.text)}\n after: ${JSON.stringify(settled.text)}`,
						);
					}
				} else {
					await canvas.page.keyboard.press(`Control+${op.key}`);
					settled = await probeSettled(canvas, fail);
					if (settled.text !== before.text) {
						fail(
							`format toggle changed the text\n before: ${JSON.stringify(before.text)}\n after: ${JSON.stringify(settled.text)}`,
						);
					}
					if (
						settled.selection.start !== before.selection.start ||
						settled.selection.end !== before.selection.end
					) {
						fail(
							`format toggle moved the selection\n before: ${JSON.stringify(before.selection)}\n after: ${JSON.stringify(settled.selection)}`,
						);
					}
				}
			}

			opLog.push("commit");
			await commitAndCheck();
			expect(await canvas.textEditorText()).toBeNull();
		}
	});
});
