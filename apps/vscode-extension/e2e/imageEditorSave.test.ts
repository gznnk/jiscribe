import assert from "node:assert/strict";

import { PNG_SOURCE_KEYWORD, readPngTextChunk } from "@jiscribe/doc/png-source";
import { extractCanvasSourceFromSvgText } from "@jiscribe/doc/svg-source";
import * as vscode from "vscode";

import {
	canvasDocJson,
	jisPngBytes,
	jisSvgText,
	renderedJisPngBytes,
	renderedJisSvgText,
} from "./support/canvasFixtures";
import {
	CANVAS_IMAGE_EDITOR_VIEW_TYPE,
	closeAllEditors,
	customEditorTabFor,
	openInCustomEditor,
} from "./support/customEditor";
import {
	createFixtureDirectory,
	removeFixtureDirectory,
	writeFixtureFile,
} from "./support/fixtureDirectory";
import {
	answerImageExportRequests,
	imageExportRequests,
	type ImageExportRequestMessage,
} from "./support/imageExport";
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
 * What the image editor writes when a `.jis.png` / `.jis.svg` is saved.
 *
 * A save asks the Webview to render the image and writes what comes back, so
 * these tests answer that request themselves through the extension's Test-mode
 * bridge (support/imageExport.ts) and assert on the bytes that land on disk. The
 * paths where no answer is possible are the interesting ones: a save from a
 * hidden tab writes the file's own image with the new source embedded (#178), and
 * the next render repairs that image (#179).
 *
 * Two paths are deliberately absent. Save As opens a save dialog, which a test
 * run has no way to answer. The dirty-document conflict prompt is a modal for the
 * same reason, so no test here changes the file on disk while the document has
 * unsaved edits.
 */

/** How long an assertion watches for a message that should never arrive. */
const QUIET_WINDOW_MS = 500;

/**
 * Budget for a message from the Webview. Well past the other waits here: the
 * canvas bundle is ~1MB of JS the Webview evaluates on every mount before it says
 * anything, and a hidden tab remounts from scratch (retainContextWhenHidden:
 * false).
 */
const WEBVIEW_MESSAGE_TIMEOUT_MS = 15_000;

/** One open image editor, as these tests drive it. */
interface OpenedImageEditor {
	/**
	 * The `update` messages posted to the Webview since the editor finished
	 * opening, so the file's initial contents are not counted as one.
	 */
	updatesSinceOpen(): UpdateToWebviewMessage[];
	/**
	 * Every `requestImageExport` posted to the Webview, opening included — opening
	 * posts none, so the list is exactly the renders the saves asked for.
	 */
	exportRequests(): ImageExportRequestMessage[];
	/** Release the message listener; call it before the test ends. */
	dispose(): void;
}

/**
 * Open a canvas image and wait until the exchange that opening it causes is over.
 *
 * @param bridge - the Test-mode bridge, already connected
 * @param uri - the `.jis.png` / `.jis.svg` to open; recording starts before the
 *   editor exists, so the update triggered by the Webview's "ready" cannot be
 *   missed
 */
async function openImageEditor(
	bridge: WebviewBridge,
	uri: vscode.Uri,
): Promise<OpenedImageEditor> {
	const recorder = recordMessagesToWebview(bridge, uri);
	await openInCustomEditor(uri, CANVAS_IMAGE_EDITOR_VIEW_TYPE);
	await waitFor(
		() => updateMessages(recorder).length >= 1,
		`the update the Webview's "ready" asks for on opening ${uri.path}`,
		WEBVIEW_MESSAGE_TIMEOUT_MS,
	);
	const updateCountAtOpen = updateMessages(recorder).length;
	return {
		updatesSinceOpen: () => updateMessages(recorder).slice(updateCountAtOpen),
		exportRequests: () => imageExportRequests(recorder),
		dispose: () => recorder.dispose(),
	};
}

/**
 * Post the commit a canvas edit sends, and wait for the document to go dirty.
 *
 * @param bridge - the Test-mode bridge
 * @param uri - an open image document; unlike the `.jis` editor, nothing reaches
 *   its file until a save
 * @param sourceJson - the source the canvas committed
 */
async function commitFromWebview(
	bridge: WebviewBridge,
	uri: vscode.Uri,
	sourceJson: string,
): Promise<void> {
	postAsWebview(bridge, uri, { type: "update", data: sourceJson });
	await waitFor(
		() => customEditorTabFor(uri)?.isDirty === true,
		`the commit to ${uri.path} to make its tab dirty`,
	);
}

/**
 * Push the image tab out of view by making a text editor the active one in its
 * group, which leaves its Webview unable to render.
 *
 * @param fixtureDirectory - the suite's directory, where the text file to show is
 *   written
 * @param uri - the image document whose tab has to stop being the active one
 */
async function hideImageTab(
	fixtureDirectory: string,
	uri: vscode.Uri,
): Promise<void> {
	const textUri = await writeFixtureFile(
		fixtureDirectory,
		"not-a-canvas.txt",
		"Shown so that the canvas tab is not.\n",
	);
	const textDocument = await vscode.workspace.openTextDocument(textUri);
	// Not as a preview tab: the next thing opened replaces a preview one, which
	// here would put the canvas back in view.
	await vscode.window.showTextDocument(textDocument, { preview: false });
	await waitFor(
		() => customEditorTabFor(uri)?.isActive === false,
		`the ${uri.path} tab to stop being the active one in its group`,
	);
	// The panel's own `visible` follows the tab change on a later turn, and a save
	// that raced it would ask a Webview that cannot answer, then sit out the
	// export timeout instead of falling back.
	await delay(QUIET_WINDOW_MS);
}

/** Bytes as base64, the form these tests compare images in (one line per side). */
function bytesAsBase64(bytes: Uint8Array): string {
	return Buffer.from(bytes).toString("base64");
}

/**
 * Leave the document in the state a save from a hidden tab produces: the
 * committed source on disk inside the image the file already held (#178), and an
 * image waiting to be repaired by the next render (#179).
 *
 * @param bridge - the Test-mode bridge
 * @param fixtureDirectory - where the fixture and the text file that hides the
 *   tab are written
 * @param fileName - the `.jis.png` fixture's name; unique per test, so two of
 *   them never share a file
 * @param originalSource - the source the file starts out embedding; its image is
 *   the one the fallback re-embeds into
 * @param committedSource - the source committed before the save
 * @returns the opened editor, still recording; the caller disposes it
 */
async function saveWithTheTabHidden(
	bridge: WebviewBridge,
	fixtureDirectory: string,
	fileName: string,
	originalSource: string,
	committedSource: string,
): Promise<{ uri: vscode.Uri; editor: OpenedImageEditor }> {
	const uri = await writeFixtureFile(
		fixtureDirectory,
		fileName,
		jisPngBytes(originalSource),
	);
	const editor = await openImageEditor(bridge, uri);
	await commitFromWebview(bridge, uri, committedSource);
	await hideImageTab(fixtureDirectory, uri);

	// saveAll rather than files.save: the dirty document is no longer the active
	// editor, which is the whole point of hiding it.
	await vscode.commands.executeCommand("workbench.action.files.saveAll");
	await waitFor(
		() => customEditorTabFor(uri)?.isDirty === false,
		`the save of the hidden ${uri.path} to clear its tab's dirty state`,
	);
	return { uri, editor };
}

describe("image editor saving a canvas image", () => {
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

	it("writes the committed source into a freshly rendered .jis.png", async () => {
		const uri = await writeFixtureFile(
			fixtureDirectory,
			"save-png.jis.png",
			jisPngBytes(canvasDocJson(["r1"])),
		);
		const editor = await openImageEditor(bridge, uri);

		const committedSource = canvasDocJson(["r1", "r2"]);
		await commitFromWebview(bridge, uri, committedSource);

		const renderedBytes = renderedJisPngBytes(committedSource);
		const answerer = answerImageExportRequests(
			bridge,
			uri,
			() => renderedBytes,
		);
		try {
			await vscode.commands.executeCommand("workbench.action.files.save");
			await waitFor(
				() => customEditorTabFor(uri)?.isDirty === false,
				`the save of ${uri.path} to clear its tab's dirty state`,
			);
		} finally {
			answerer.dispose();
			editor.dispose();
		}

		const diskBytes = await vscode.workspace.fs.readFile(uri);
		assert.equal(
			readPngTextChunk(diskBytes, PNG_SOURCE_KEYWORD),
			committedSource,
			"the saved file does not carry the committed source",
		);
		assert.equal(
			bytesAsBase64(diskBytes),
			bytesAsBase64(renderedBytes),
			"the save wrote something other than the image the Webview rendered",
		);
		assert.deepEqual(
			editor.exportRequests().map((request) => request.format),
			["png"],
			"the save did not ask for exactly one PNG render",
		);
	});

	it("writes the committed source into a freshly rendered .jis.svg", async () => {
		const uri = await writeFixtureFile(
			fixtureDirectory,
			"save-svg.jis.svg",
			jisSvgText(canvasDocJson(["r1"])),
		);
		const editor = await openImageEditor(bridge, uri);

		const committedSource = canvasDocJson(["r1", "r2"]);
		await commitFromWebview(bridge, uri, committedSource);

		const renderedText = renderedJisSvgText(committedSource);
		const answerer = answerImageExportRequests(
			bridge,
			uri,
			() => new Uint8Array(Buffer.from(renderedText, "utf8")),
		);
		try {
			await vscode.commands.executeCommand("workbench.action.files.save");
			await waitFor(
				() => customEditorTabFor(uri)?.isDirty === false,
				`the save of ${uri.path} to clear its tab's dirty state`,
			);
		} finally {
			answerer.dispose();
			editor.dispose();
		}

		const diskText = Buffer.from(
			await vscode.workspace.fs.readFile(uri),
		).toString("utf8");
		assert.equal(
			extractCanvasSourceFromSvgText(diskText),
			committedSource,
			"the saved file does not carry the committed source",
		);
		assert.equal(
			diskText,
			renderedText,
			"the save wrote something other than the image the Webview rendered",
		);
		assert.deepEqual(
			editor.exportRequests().map((request) => request.format),
			["svg"],
			"the save did not ask for exactly one SVG render",
		);
	});

	it("saves the new source into the file's own image when the canvas cannot render", async () => {
		const originalSource = canvasDocJson(["r1"]);
		const committedSource = canvasDocJson(["r1", "r2"]);
		const { uri, editor } = await saveWithTheTabHidden(
			bridge,
			fixtureDirectory,
			"save-fallback.jis.png",
			originalSource,
			committedSource,
		);
		editor.dispose();

		const diskBytes = await vscode.workspace.fs.readFile(uri);
		assert.equal(
			readPngTextChunk(diskBytes, PNG_SOURCE_KEYWORD),
			committedSource,
			"the fallback lost the committed source, which is the one thing it must keep",
		);
		// The fixture helper re-embeds into the same carrier image the file was
		// built from, so this is byte for byte what the fallback should produce:
		// the picture as of the last save, the source as of the last commit.
		assert.equal(
			bytesAsBase64(diskBytes),
			bytesAsBase64(jisPngBytes(committedSource)),
			"the fallback wrote neither a render nor the file's own image with the committed source",
		);
		assert.deepEqual(
			editor.exportRequests(),
			[],
			"the extension asked a Webview it already knew could not answer to render",
		);
	});

	it("repairs the stale image once the canvas can render again", async () => {
		const committedSource = canvasDocJson(["r1", "r2"]);
		const { uri, editor } = await saveWithTheTabHidden(
			bridge,
			fixtureDirectory,
			"save-reconcile.jis.png",
			canvasDocJson(["r1"]),
			committedSource,
		);

		const renderedBytes = renderedJisPngBytes(committedSource);
		const answerer = answerImageExportRequests(
			bridge,
			uri,
			() => renderedBytes,
		);
		try {
			// Bringing the tab back remounts the Webview, which posts "rendered" once
			// the canvas is up; that is what drives the repair.
			await openInCustomEditor(uri, CANVAS_IMAGE_EDITOR_VIEW_TYPE);
			await waitFor(
				async () =>
					bytesAsBase64(await vscode.workspace.fs.readFile(uri)) ===
					bytesAsBase64(renderedBytes),
				`the remounted Webview's render to replace the stale image in ${uri.path}`,
				WEBVIEW_MESSAGE_TIMEOUT_MS,
			);
		} finally {
			answerer.dispose();
			editor.dispose();
		}

		assert.equal(
			readPngTextChunk(
				await vscode.workspace.fs.readFile(uri),
				PNG_SOURCE_KEYWORD,
			),
			committedSource,
			"the repair changed the source on disk",
		);
		assert.equal(
			customEditorTabFor(uri)?.isDirty,
			false,
			"the repair rewrote the file as an unsaved edit instead of in place",
		);
	});

	it("sends the source from disk back to the Webview on revert", async () => {
		const originalSource = canvasDocJson(["r1"]);
		const originalBytes = jisPngBytes(originalSource);
		const uri = await writeFixtureFile(
			fixtureDirectory,
			"revert.jis.png",
			originalBytes,
		);
		const editor = await openImageEditor(bridge, uri);
		await commitFromWebview(bridge, uri, canvasDocJson(["r1", "r2"]));

		await vscode.commands.executeCommand("workbench.action.files.revert");
		await waitFor(
			() =>
				editor
					.updatesSinceOpen()
					.some((message) => message.data === originalSource),
			`the update carrying the source ${uri.path} holds on disk`,
		);
		await waitFor(
			() => customEditorTabFor(uri)?.isDirty === false,
			`the revert of ${uri.path} to clear its tab's dirty state`,
		);
		editor.dispose();

		assert.equal(
			bytesAsBase64(await vscode.workspace.fs.readFile(uri)),
			bytesAsBase64(originalBytes),
			"the revert wrote to the file it was rolling back to",
		);
		assert.deepEqual(
			editor.exportRequests(),
			[],
			"the revert asked the Webview to render, which only a save has reason to",
		);
	});

	it("adopts a change made to the file while the document is clean", async () => {
		const uri = await writeFixtureFile(
			fixtureDirectory,
			"external-change.jis.png",
			jisPngBytes(canvasDocJson(["r1"])),
		);
		const editor = await openImageEditor(bridge, uri);
		assert.equal(
			customEditorTabFor(uri)?.isDirty,
			false,
			"the document must be clean here, or the write below opens the conflict prompt",
		);

		const externalSource = canvasDocJson(["fromDisk"]);
		await vscode.workspace.fs.writeFile(uri, jisPngBytes(externalSource));
		await waitFor(
			() =>
				editor
					.updatesSinceOpen()
					.some((message) => message.data === externalSource),
			`the update for the change made to ${uri.path} on disk`,
			WEBVIEW_MESSAGE_TIMEOUT_MS,
		);
		await delay(QUIET_WINDOW_MS);
		editor.dispose();

		assert.equal(
			customEditorTabFor(uri)?.isDirty,
			false,
			"following the change on disk left the document with unsaved edits",
		);
	});
});
