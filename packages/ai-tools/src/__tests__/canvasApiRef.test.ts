// Holds the three name spaces one tool lives in — its tool name, its op kind and
// the canvas API it drives — against each other, so none of them can drift on its
// own.
//
// Only the doc-ops side is covered exhaustively: createDocOps() returns a plain
// object, so every member it has can be enumerated at run time. The canvas handle
// cannot be — it is assembled by React hooks and only exists once a canvas is
// mounted, which no node test has. That side is held by the type instead:
// CanvasApiRef is derived from CanvasHandle, so a namespace or member renamed
// there fails typecheck at every `drives` entry naming it. What the type does not
// catch is a handle member that is added and never driven, which is the one thing
// the doc-ops check does catch.

import { createDocOps } from "@jiscribe/doc";
import { describe, expect, it } from "vitest";

import { createCanvasToolDescriptors } from "../canvasTools";
import type { AiCanvasCapabilities } from "../capabilities";

const capabilities: AiCanvasCapabilities = {
	creatableObjectTypes: ["rect", "ellipse", "diamond"],
	connectableObjectTypes: ["rect", "ellipse"],
};

/**
 * The doc-ops members no tool drives, each with why it is not worth a tool. It is
 * a list rather than a rule so that adding a doc-op forces the decision to be made
 * and written down: the exhaustiveness test below fails until the new member is
 * either driven by a tool or entered here.
 *
 * Empty is the state to keep it in — every other doc-op is reachable by the model
 * today. The list is also the place a future member is argued out of the tool set;
 * deleting it would let one be added and never exposed, unnoticed.
 */
const UNEXPOSED_DOC_OPS: Readonly<Record<string, string>> = {};

const toCamelCase = (toolName: string): string =>
	toolName.replace(/_(.)/g, (_match, letter: string) => letter.toUpperCase());

const drivenDocOpNames = (): Set<string> =>
	new Set(
		createCanvasToolDescriptors(capabilities)
			.flatMap((descriptor) => descriptor.drives)
			.flatMap((apiRef) =>
				apiRef.startsWith("docOps.") ? [apiRef.slice("docOps.".length)] : [],
			),
	);

describe("CanvasToolDescriptor.drives", () => {
	it("accounts for every docOps member, as driven or as deliberately unexposed", () => {
		const driven = drivenDocOpNames();

		const unaccounted = Object.keys(createDocOps()).filter(
			(docOpName) =>
				!driven.has(docOpName) && UNEXPOSED_DOC_OPS[docOpName] === undefined,
		);

		// Add the new op to a tool's drives, or enter it in UNEXPOSED_DOC_OPS with why
		expect(unaccounted).toEqual([]);
	});

	it("keeps the unexposed list free of members that are gone or now driven", () => {
		const driven = drivenDocOpNames();
		const docOpNames = new Set(Object.keys(createDocOps()));

		const stale = Object.keys(UNEXPOSED_DOC_OPS).filter(
			(docOpName) => !docOpNames.has(docOpName) || driven.has(docOpName),
		);

		expect(stale).toEqual([]);
	});

	it("gives every tool at least one API to drive", () => {
		for (const descriptor of createCanvasToolDescriptors(capabilities)) {
			expect(descriptor.drives.length, descriptor.name).toBeGreaterThan(0);
		}
	});
});

describe("CanvasToolDescriptor.toOp", () => {
	it("names the op after the tool, letter for letter", () => {
		// The op kind is the third name for the same thing. Keeping it a mechanical
		// transcription of the tool name leaves only one name to actually choose
		for (const descriptor of createCanvasToolDescriptors(capabilities)) {
			expect(descriptor.toOp({}).kind, descriptor.name).toBe(
				toCamelCase(descriptor.name),
			);
		}
	});
});
