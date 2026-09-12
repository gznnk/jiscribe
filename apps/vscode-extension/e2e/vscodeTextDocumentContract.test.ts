import assert from "node:assert/strict";

import * as vscode from "vscode";

import { canvasDocJson } from "./support/canvasFixtures";
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
 * The VSCode behaviour selfWriteTracker is built on.
 *
 * Its unit tests exercise the tracker against a hand-written model of VSCode, so
 * they stay green even if VSCode stops behaving that way. These assertions run
 * against VSCode itself: if a release changes one of them, the echo detection
 * breaks here rather than in a user's canvas.
 */

/** How long an assertion watches for an event that should never arrive. */
const QUIET_WINDOW_MS = 500;

describe("VSCode TextDocument contract", () => {
	let fixtureDirectory: string;

	before(async () => {
		fixtureDirectory = await createFixtureDirectory();
	});

	after(async () => {
		await removeFixtureDirectory(fixtureDirectory);
	});

	it("normalizes text applyEdit inserts to the document's CRLF line ending", async () => {
		const uri = await writeFixtureFile(
			fixtureDirectory,
			"crlf.jis",
			canvasDocJson(["r1"]).replaceAll("\n", "\r\n"),
		);
		const document = await vscode.workspace.openTextDocument(uri);
		assert.equal(
			document.eol,
			vscode.EndOfLine.CRLF,
			"VSCode no longer detects CRLF from the file's own content",
		);

		const writtenText = canvasDocJson(["r1", "r2"]);
		await replaceWholeDocument(document, writtenText);

		const documentText = document.getText();
		assert.ok(documentText.includes("\r\n"), "nothing was normalized to CRLF");
		assert.equal(
			documentText.replaceAll("\r\n", "").includes("\n"),
			false,
			"a lone \\n survived the normalization",
		);
		assert.equal(
			document.eol,
			vscode.EndOfLine.CRLF,
			"the whole-document replace changed the document's line ending",
		);
		// The exact string selfWriteTracker.track() predicts for a CRLF document.
		assert.equal(documentText, writtenText.replaceAll("\n", "\r\n"));

		// Leave nothing dirty behind: a modified document blocks the window from
		// closing at the end of the run.
		await document.save();
	});

	it("still raises a change event when applyEdit replaces the text with an identical copy", async () => {
		const uri = await writeFixtureFile(
			fixtureDirectory,
			"identical.jis",
			canvasDocJson(["r1"]),
		);
		const document = await vscode.workspace.openTextDocument(uri);
		const originalText = document.getText();
		const recorder = recordChangeEvents(document);

		await replaceWholeDocument(document, originalText);
		await delay(QUIET_WINDOW_MS);
		recorder.dispose();

		// A replace that changes nothing is still applied: it raises a content
		// change carrying the unchanged text, plus the metadata-only event of the
		// document turning dirty. selfWriteTracker relies on the former (the echo
		// is consumed like any other) and JiscribeEditorProvider drops the latter.
		assert.ok(
			recorder.changes.length > 0,
			"a replace that changed nothing raised no event at all",
		);
		assert.deepEqual(
			recorder.changes.map((change) => change.text),
			recorder.changes.map(() => originalText),
			"an event carried text nobody wrote",
		);
		assert.deepEqual(textsOfContentChanges(recorder), [originalText]);

		await document.save();
	});

	it("delivers two sequential applyEdit calls as change events in call order", async () => {
		const uri = await writeFixtureFile(
			fixtureDirectory,
			"sequential.jis",
			canvasDocJson(["r1"]),
		);
		const document = await vscode.workspace.openTextDocument(uri);
		assert.equal(
			document.eol,
			vscode.EndOfLine.LF,
			"the fixture must stay LF, or the expected texts need normalizing too",
		);
		const recorder = recordChangeEvents(document);

		const firstText = canvasDocJson(["r1", "r2"]);
		const secondText = canvasDocJson(["r1", "r2", "r3"]);
		await replaceWholeDocument(document, firstText);
		await replaceWholeDocument(document, secondText);
		await waitFor(
			() => textsOfContentChanges(recorder).length >= 2,
			"both change events to arrive",
		);
		recorder.dispose();

		assert.deepEqual(textsOfContentChanges(recorder), [firstText, secondText]);
		assert.equal(document.getText(), secondText);
		await document.save();
	});
});
