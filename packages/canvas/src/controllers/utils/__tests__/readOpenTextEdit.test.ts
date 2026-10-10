import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../CanvasTypes";
import { selectionOf } from "../../selection/__tests__/support/selectionOf";
import { textSlotPartSelection } from "../../selection/__tests__/support/textSlotPartSelection";
import { vertexPartSelection } from "../../selection/__tests__/support/vertexPartSelection";
import { readOpenTextEdit } from "../readOpenTextEdit";

type ResolveInput = Parameters<typeof readOpenTextEdit>[0];

/** A record-like shape with two named slots. */
const slotted: ObjectState = {
	id: "rec-1",
	type: "record",
	features: { text: "slots" },
	text: { name: { text: "User" }, rows: { text: ["id"] } },
} as unknown as ObjectState;

/** A shape holding one body rather than slots, so it takes no pick below itself. */
const singleBody: ObjectState = {
	id: "rect-1",
	type: "rect",
	features: { text: "body" },
	text: { body: { text: "hi" } },
} as unknown as ObjectState;

const connector: ObjectState = {
	id: "c1",
	type: "connector",
	points: [],
} as unknown as ObjectState;

const objects: Record<string, ObjectState> = {
	"rec-1": slotted,
	"rect-1": singleBody,
	c1: connector,
};

const input = (
	textEditState: CanvasControllerState["textEditState"],
	selection: CanvasControllerState["selection"],
): ResolveInput => ({ textEditState, selection, objects });

describe("readOpenTextEdit", () => {
	it("returns null when no session is open", () => {
		expect(readOpenTextEdit(input(null, selectionOf(["rec-1"])))).toBeNull();
	});

	it("resolves a shape session to the selected object and slot", () => {
		const openEdit = readOpenTextEdit(
			input(
				{ kind: "shape", text: "Account", selection: { start: 0, end: 2 } },
				selectionOf(["rec-1"], textSlotPartSelection("rows")),
			),
		);
		expect(openEdit).toEqual({
			kind: "shape",
			object: slotted,
			slotId: "rows",
			text: "Account",
			selection: { start: 0, end: 2 },
		});
	});

	it("falls back to the object's one body where nothing is picked below it", () => {
		// A `features.text: "body"` type registers no slot kind, so its selection
		// stays at the object and its sole slot is the one being edited.
		const openEdit = readOpenTextEdit(
			input({ kind: "shape", text: "hi" }, selectionOf(["rect-1"])),
		);
		expect(openEdit).toEqual({
			kind: "shape",
			object: singleBody,
			slotId: "body",
			text: "hi",
		});
	});

	it("falls back to the one body for a pick of another kind too", () => {
		const openEdit = readOpenTextEdit(
			input(
				{ kind: "shape", text: "hi" },
				selectionOf(["rect-1"], vertexPartSelection(0)),
			),
		);
		expect(openEdit).toMatchObject({ slotId: "body" });
	});

	it("resolves a connector label session to the selected connector", () => {
		const openEdit = readOpenTextEdit(
			input(
				{
					kind: "connectorLabel",
					text: "Yes",
					placement: { position: 0.25, offset: 12 },
				},
				selectionOf(["c1"]),
			),
		);
		expect(openEdit).toEqual({
			kind: "connectorLabel",
			connector,
			text: "Yes",
			placement: { position: 0.25, offset: 12 },
		});
	});

	describe("throws on a broken invariant rather than letting the editor vanish", () => {
		it("no lone selected object to own the session", () => {
			expect(() =>
				readOpenTextEdit(input({ kind: "shape", text: "x" }, selectionOf([]))),
			).toThrow(/0 selected objects/);
			expect(() =>
				readOpenTextEdit(
					input(
						{ kind: "shape", text: "x" },
						selectionOf(["rec-1", "c1"], textSlotPartSelection("rows")),
					),
				),
			).toThrow(/2 selected objects/);
		});

		it("the selected object is gone", () => {
			expect(() =>
				readOpenTextEdit(
					input(
						{ kind: "shape", text: "x" },
						selectionOf(["gone"], textSlotPartSelection("rows")),
					),
				),
			).toThrow(/gone/);
		});

		it("an object holding no text at all", () => {
			expect(() =>
				readOpenTextEdit(
					input({ kind: "shape", text: "x" }, selectionOf(["c1"])),
				),
			).toThrow(/no text slots/);
		});

		it("a slot the object does not hold", () => {
			expect(() =>
				readOpenTextEdit(
					input(
						{ kind: "shape", text: "x" },
						selectionOf(["rec-1"], textSlotPartSelection("missing")),
					),
				),
			).toThrow(/missing/);
		});

		it("a label session whose owner is no connector", () => {
			expect(() =>
				readOpenTextEdit(
					input({ kind: "connectorLabel", text: "x" }, selectionOf(["rec-1"])),
				),
			).toThrow(/"record"/);
		});
	});
});
