import assert from "node:assert/strict";

import * as vscode from "vscode";

import {
	BROKEN_CANVAS_DOC_TEXT,
	canvasDocJson,
	duplicateIdCanvasDocJson,
} from "./support/canvasFixtures";
import {
	CANVAS_EDITOR_VIEW_TYPE,
	closeAllEditors,
	openInCustomEditor,
} from "./support/customEditor";
import { replaceWholeDocument } from "./support/documentEdits";
import {
	createFixtureDirectory,
	removeFixtureDirectory,
	writeFixtureFile,
} from "./support/fixtureDirectory";
import { delay, waitFor } from "./support/timing";

/**
 * What reaches the Problems panel when a canvas file is opened in the canvas
 * editor.
 *
 * DiagnosticProvider validates on open, on save and on a change once it settles,
 * and reports only what the JSON schema cannot express, so these tests are
 * written around that last limit rather than against it.
 */

/** Prefix DiagnosticProvider puts on every message it raises. */
const JISCRIBE_DIAGNOSTIC_PREFIX = "[Jiscribe] ";

/** How long an assertion watches for a diagnostic that should never arrive. */
const QUIET_WINDOW_MS = 1000;

/**
 * The diagnostics this extension raised for a file, with everyone else's
 * (the JSON language service's above all) filtered out by their message prefix.
 */
function jiscribeDiagnostics(uri: vscode.Uri): vscode.Diagnostic[] {
	return vscode.languages
		.getDiagnostics(uri)
		.filter((diagnostic) =>
			diagnostic.message.startsWith(JISCRIBE_DIAGNOSTIC_PREFIX),
		);
}

describe("canvas file diagnostics", () => {
	let fixtureDirectory: string;

	before(async () => {
		fixtureDirectory = await createFixtureDirectory();
	});

	afterEach(async () => {
		await closeAllEditors();
	});

	after(async () => {
		await removeFixtureDirectory(fixtureDirectory);
	});

	it("reports a duplicate id, which the JSON schema cannot express", async () => {
		const uri = await writeFixtureFile(
			fixtureDirectory,
			"duplicate-id.jis",
			duplicateIdCanvasDocJson(),
		);

		await openInCustomEditor(uri, CANVAS_EDITOR_VIEW_TYPE);

		await waitFor(
			() => jiscribeDiagnostics(uri).length > 0,
			"a diagnostic on the duplicate id",
		);
		assert.match(jiscribeDiagnostics(uri)[0].message, /duplicated/);
	});

	it("clears the diagnostic once the fixed document is saved", async () => {
		const uri = await writeFixtureFile(
			fixtureDirectory,
			"fixed-after-save.jis",
			duplicateIdCanvasDocJson(),
		);

		await openInCustomEditor(uri, CANVAS_EDITOR_VIEW_TYPE);
		await waitFor(
			() => jiscribeDiagnostics(uri).length > 0,
			"a diagnostic on the duplicate id",
		);

		const document = await vscode.workspace.openTextDocument(uri);
		await replaceWholeDocument(document, canvasDocJson(["r1", "r2"]));
		// A save re-validates straight away rather than waiting out the debounce,
		// so the panel is right the moment the file lands on disk.
		await document.save();

		await waitFor(
			() => jiscribeDiagnostics(uri).length === 0,
			"the diagnostic to be cleared",
		);
	});

	it("reports an edit that was never saved, which is how an agent's rewrite arrives", async () => {
		const uri = await writeFixtureFile(
			fixtureDirectory,
			"changed-without-save.jis",
			canvasDocJson(["r1", "r2"]),
		);

		await openInCustomEditor(uri, CANVAS_EDITOR_VIEW_TYPE);

		const document = await vscode.workspace.openTextDocument(uri);
		await replaceWholeDocument(document, duplicateIdCanvasDocJson());

		await waitFor(
			() => jiscribeDiagnostics(uri).length > 0,
			"a diagnostic on the duplicate id the unsaved edit introduced",
		);

		// closeAllEditors cannot run against a dirty editor (see customEditor.ts).
		await document.save();
	});

	it("leaves broken JSON to the JSON language service", async () => {
		const uri = await writeFixtureFile(
			fixtureDirectory,
			"broken.jis",
			BROKEN_CANVAS_DOC_TEXT,
		);

		await openInCustomEditor(uri, CANVAS_EDITOR_VIEW_TYPE);
		await delay(QUIET_WINDOW_MS);

		assert.deepEqual(
			jiscribeDiagnostics(uri).map((diagnostic) => diagnostic.message),
			[],
			"a syntax error was reported twice, once here and once by the JSON schema",
		);
	});
});
