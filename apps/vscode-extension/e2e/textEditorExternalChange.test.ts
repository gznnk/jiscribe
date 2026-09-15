import assert from "node:assert/strict";

import * as vscode from "vscode";

import { canvasDocJson, compactCanvasDocJson } from "./support/canvasFixtures";
import {
	CANVAS_EDITOR_VIEW_TYPE,
	closeAllEditors,
	openInCustomEditor,
} from "./support/customEditor";
import {
	recordChangeEvents,
	replaceWholeDocument,
	textsOfContentChanges,
} from "./support/documentEdits";
import {
	createFixtureDirectory,
	removeFixtureDirectory,
	writeFixtureFile,
} from "./support/fixtureDirectory";
import { delay, waitFor } from "./support/timing";

/**
 * How the canvas editor treats a change it did not make.
 *
 * The provider forwards every change event it does not recognize as its own
 * write to the webview, and the webview commits back, so a misclassification
 * shows up as a write-back loop: an extra change event carrying text no one
 * wrote. These tests make the change (both through applyEdit and on disk) and
 * then watch for that extra event.
 */

/** How long an assertion watches for an event that should never arrive. */
const QUIET_WINDOW_MS = 500;

describe("canvas editor and changes made outside it", () => {
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

	it("leaves an applyEdit from outside exactly as written", async () => {
		const uri = await writeFixtureFile(
			fixtureDirectory,
			"external-edit.jis",
			canvasDocJson(["r1"]),
		);
		await openInCustomEditor(uri, CANVAS_EDITOR_VIEW_TYPE);
		const document = await vscode.workspace.openTextDocument(uri);
		const recorder = recordChangeEvents(document);

		// Unindented, so a write-back would show up in the text itself: what the
		// editor hands the webview is re-indented, and that is what would come
		// back through the commit path.
		const editedText = compactCanvasDocJson(["r1", "r2"]);
		await replaceWholeDocument(document, editedText);
		await waitFor(
			() => textsOfContentChanges(recorder).length >= 1,
			"the change event for the edit this test made",
		);
		await delay(QUIET_WINDOW_MS);
		recorder.dispose();

		assert.equal(document.getText(), editedText);
		assert.deepEqual(
			textsOfContentChanges(recorder),
			[editedText],
			"the editor wrote the document back after the external edit",
		);

		await document.save();
	});

	it("follows a write to the file on disk while the editor is open", async () => {
		const uri = await writeFixtureFile(
			fixtureDirectory,
			"external-write.jis",
			canvasDocJson(["r1"]),
		);
		await openInCustomEditor(uri, CANVAS_EDITOR_VIEW_TYPE);
		const document = await vscode.workspace.openTextDocument(uri);

		const diskText = compactCanvasDocJson(["fromDisk"]);
		await vscode.workspace.fs.writeFile(
			uri,
			new TextEncoder().encode(diskText),
		);
		await waitFor(
			() => document.getText() === diskText,
			"the document to reload the text now on disk",
		);
		assert.equal(
			document.isDirty,
			false,
			"reloading a clean document should not make it dirty",
		);

		const recorder = recordChangeEvents(document);
		await delay(QUIET_WINDOW_MS);
		recorder.dispose();

		assert.deepEqual(
			recorder.changes.map((change) => change.text),
			[],
			"the editor wrote the document back after the change on disk",
		);
		assert.equal(document.getText(), diskText);
	});
});
