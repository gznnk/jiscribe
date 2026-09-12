import assert from "node:assert/strict";

import * as vscode from "vscode";

import {
	canvasDocJson,
	jisPngBytes,
	jisSvgText,
} from "./support/canvasFixtures";
import {
	activeCustomEditorTabInput,
	CANVAS_EDITOR_VIEW_TYPE,
	CANVAS_IMAGE_EDITOR_VIEW_TYPE,
	closeAllEditors,
	EXTENSION_ID,
	openInCustomEditor,
} from "./support/customEditor";
import {
	createFixtureDirectory,
	removeFixtureDirectory,
	writeFixtureFile,
} from "./support/fixtureDirectory";
import { waitFor } from "./support/timing";

/**
 * That opening a canvas file is enough to start the extension and put the file
 * in the right custom editor.
 *
 * activationEvents is empty, so activation hangs entirely on the customEditors
 * contribution matching the file name; a mistyped selector or view type would
 * leave the file in the plain text editor with nothing reporting an error.
 */
describe("activation and custom editor registration", () => {
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

	it("activates the extension and shows .jis in the canvas editor", async () => {
		const uri = await writeFixtureFile(
			fixtureDirectory,
			"activation.jis",
			canvasDocJson(),
		);

		await openInCustomEditor(uri, CANVAS_EDITOR_VIEW_TYPE);

		await waitFor(
			() => vscode.extensions.getExtension(EXTENSION_ID)?.isActive === true,
			`extension ${EXTENSION_ID} to activate`,
		);
		assert.equal(
			activeCustomEditorTabInput()?.viewType,
			CANVAS_EDITOR_VIEW_TYPE,
		);
	});

	it("shows .jis.png in the image editor", async () => {
		const uri = await writeFixtureFile(
			fixtureDirectory,
			"activation.jis.png",
			jisPngBytes(canvasDocJson()),
		);

		await openInCustomEditor(uri, CANVAS_IMAGE_EDITOR_VIEW_TYPE);

		assert.equal(
			activeCustomEditorTabInput()?.viewType,
			CANVAS_IMAGE_EDITOR_VIEW_TYPE,
		);
	});

	it("shows .jis.svg in the image editor", async () => {
		const uri = await writeFixtureFile(
			fixtureDirectory,
			"activation.jis.svg",
			jisSvgText(canvasDocJson()),
		);

		await openInCustomEditor(uri, CANVAS_IMAGE_EDITOR_VIEW_TYPE);

		assert.equal(
			activeCustomEditorTabInput()?.viewType,
			CANVAS_IMAGE_EDITOR_VIEW_TYPE,
		);
	});
});
