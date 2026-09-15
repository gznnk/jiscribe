import assert from "node:assert/strict";

import * as vscode from "vscode";

import { canvasDocJson, compactCanvasDocJson } from "./support/canvasFixtures";
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
import {
	connectWebviewBridge,
	postAsWebview,
	recordMessagesToWebview,
	updateMessages,
	type UpdateToWebviewMessage,
	type WebviewBridge,
} from "./support/webviewBridge";

/**
 * What the canvas editor does with a commit from the Webview.
 *
 * The Webview is an isolated iframe, so these tests act as it through the
 * extension's Test-mode bridge (support/webviewBridge.ts): they post the `update`
 * a canvas edit sends, and watch every message the extension posts back. What is
 * asserted is the extension's side of that exchange — what it writes to the
 * document, and what it sends to the Webview. The real Webview is alive
 * throughout and reacts to the same messages; that is beside the point here.
 */

/** How long an assertion watches for a message that should never arrive. */
const QUIET_WINDOW_MS = 500;

/**
 * Budget for the Webview's first message. Well past the other waits here: the
 * canvas bundle is ~1MB of JS the Webview has to evaluate before it says "ready".
 */
const WEBVIEW_READY_TIMEOUT_MS = 15_000;

/** One open canvas editor, as these tests drive it. */
interface OpenedCanvasEditor {
	/** The edited document, for the text and dirty-state assertions. */
	readonly document: vscode.TextDocument;
	/**
	 * The `update` messages posted to the Webview since the editor finished
	 * opening, so the file's initial contents are not counted as an echo.
	 */
	updatesSinceOpen(): UpdateToWebviewMessage[];
	/** Release the message listener; call it before the test ends. */
	dispose(): void;
}

/**
 * Open a canvas file and wait until the exchange that opening it causes is over.
 *
 * @param bridge - the Test-mode bridge, already connected
 * @param uri - the canvas file to open; recording starts before the editor
 *   exists, so the update triggered by the Webview's "ready" cannot be missed
 */
async function openCanvasEditor(
	bridge: WebviewBridge,
	uri: vscode.Uri,
): Promise<OpenedCanvasEditor> {
	const recorder = recordMessagesToWebview(bridge, uri);
	await openInCustomEditor(uri, CANVAS_EDITOR_VIEW_TYPE);
	await waitFor(
		() => updateMessages(recorder).length >= 1,
		`the update the Webview's "ready" asks for on opening ${uri.path}`,
		WEBVIEW_READY_TIMEOUT_MS,
	);
	const updateCountAtOpen = updateMessages(recorder).length;
	const document = await vscode.workspace.openTextDocument(uri);
	return {
		document,
		updatesSinceOpen: () => updateMessages(recorder).slice(updateCountAtOpen),
		dispose: () => recorder.dispose(),
	};
}

describe("canvas editor and a commit from the Webview", () => {
	let fixtureDirectory: string;
	let bridge: WebviewBridge;

	before(async () => {
		fixtureDirectory = await createFixtureDirectory();
		bridge = await connectWebviewBridge();
	});

	afterEach(async () => {
		await closeAllEditors();
	});

	after(async () => {
		await removeFixtureDirectory(fixtureDirectory);
	});

	it("writes a commit with the document's line ending", async () => {
		const uri = await writeFixtureFile(
			fixtureDirectory,
			"commit-crlf.jis",
			canvasDocJson(["r1"]).replaceAll("\n", "\r\n"),
		);
		const editor = await openCanvasEditor(bridge, uri);
		assert.equal(
			editor.document.eol,
			vscode.EndOfLine.CRLF,
			"VSCode no longer detects CRLF from the file's own content",
		);

		// The Webview always commits with "\n", whatever the file holds.
		const committedText = canvasDocJson(["r1", "r2"]);
		postAsWebview(bridge, uri, {
			type: "update",
			data: committedText,
		});

		await waitFor(
			() =>
				editor.document.getText() === committedText.replaceAll("\n", "\r\n"),
			"the commit to reach the document with its CRLF line ending",
		);
		assert.equal(
			editor.document.eol,
			vscode.EndOfLine.CRLF,
			"the commit changed the document's line ending",
		);

		editor.dispose();
		await editor.document.save();
	});

	it("does not echo a commit back to the Webview", async () => {
		const uri = await writeFixtureFile(
			fixtureDirectory,
			"commit-no-echo.jis",
			canvasDocJson(["r1"]),
		);
		const editor = await openCanvasEditor(bridge, uri);
		// Clean at this point, so the commit below is also the clean-to-dirty
		// transition: VSCode raises a metadata-only change event for it on top of
		// the content one, and forwarding that event echoed the commit straight back
		// (fixed in 970cd7b7). That regression fails the first assertion here.
		assert.equal(
			editor.document.isDirty,
			false,
			"the document must be clean here for this to cover the dirty transition",
		);

		const committedText = canvasDocJson(["r1", "r2"]);
		postAsWebview(bridge, uri, {
			type: "update",
			data: committedText,
		});
		await waitFor(
			() => editor.document.getText() === committedText,
			"the commit to reach the document",
		);
		await delay(QUIET_WINDOW_MS);
		assert.deepEqual(
			editor.updatesSinceOpen(),
			[],
			"the extension sent the commit back to the Webview",
		);

		// A change the editor did not make is news for the canvas, so this one has
		// to arrive. Written unindented, so the re-indentation on the way out shows.
		const externalText = compactCanvasDocJson(["r1", "r2", "r3"]);
		await replaceWholeDocument(editor.document, externalText);
		await waitFor(
			() => editor.updatesSinceOpen().length >= 1,
			"the update for the change made outside the editor",
		);
		await delay(QUIET_WINDOW_MS);
		const updatesAfterExternalChange = editor.updatesSinceOpen();

		assert.equal(
			updatesAfterExternalChange.length,
			1,
			"one external change produced more than one update",
		);
		assert.equal(
			updatesAfterExternalChange[0].data,
			canvasDocJson(["r1", "r2", "r3"]),
			"the Webview was not sent the re-indented document text",
		);
		editor.dispose();
		await editor.document.save();
	});

	it("keeps consecutive commits out of the Webview", async () => {
		const uri = await writeFixtureFile(
			fixtureDirectory,
			"commit-consecutive.jis",
			canvasDocJson(["aa"]),
		);
		const editor = await openCanvasEditor(bridge, uri);

		// Back-to-back with nothing awaited between them, as the canvas posts them:
		// a WorkspaceEdit carries the document version it was built against, so an
		// edit built before the previous one is applied is refused outright ("has
		// changed in the meantime"). That is why the provider serializes its writes
		// (see latestWriteSerializer) instead of applying each commit as it arrives.
		const firstText = canvasDocJson(["bb"]);
		const secondText = canvasDocJson(["cc"]);
		postAsWebview(bridge, uri, {
			type: "update",
			data: firstText,
		});
		postAsWebview(bridge, uri, {
			type: "update",
			data: secondText,
		});

		await waitFor(
			() => editor.document.getText() === secondText,
			"the second commit to reach the document",
		);
		await delay(QUIET_WINDOW_MS);

		assert.equal(editor.document.getText(), secondText);
		assert.deepEqual(
			editor.updatesSinceOpen(),
			[],
			"one of the two commits came back to the Webview as an external change",
		);

		editor.dispose();
		await editor.document.save();
	});

	it("ends at the last of three consecutive commits", async () => {
		const uri = await writeFixtureFile(
			fixtureDirectory,
			"commit-three.jis",
			canvasDocJson(["aa"]),
		);
		const editor = await openCanvasEditor(bridge, uri);

		// Only the end state is asserted: the middle commit is superseded before it
		// can be written, and whether it reaches the document at all is not part of
		// the contract (see latestWriteSerializer).
		const lastText = canvasDocJson(["dd"]);
		postAsWebview(bridge, uri, {
			type: "update",
			data: canvasDocJson(["bb"]),
		});
		postAsWebview(bridge, uri, {
			type: "update",
			data: canvasDocJson(["cc"]),
		});
		postAsWebview(bridge, uri, {
			type: "update",
			data: lastText,
		});

		await waitFor(
			() => editor.document.getText() === lastText,
			"the last commit to reach the document",
		);
		await delay(QUIET_WINDOW_MS);

		assert.equal(editor.document.getText(), lastText);
		assert.deepEqual(
			editor.updatesSinceOpen(),
			[],
			"one of the three commits came back to the Webview as an external change",
		);

		editor.dispose();
		await editor.document.save();
	});
});
