import assert from "node:assert/strict";

import {
	canvasDocJson,
	jisPngBytes,
	jisSvgText,
	plainPngBytes,
	plainSvgText,
} from "./support/canvasFixtures";
import {
	activeCustomEditorTabInput,
	CANVAS_IMAGE_EDITOR_VIEW_TYPE,
	closeAllEditors,
	openInCustomEditor,
} from "./support/customEditor";
import {
	createFixtureDirectory,
	removeFixtureDirectory,
	writeFixtureFile,
} from "./support/fixtureDirectory";

/**
 * The open paths of the image editor, including the ones that carry no canvas
 * source.
 *
 * `openCustomDocument` reads and parses the file before any webview exists, so a
 * file it cannot make sense of fails the open command outright rather than
 * showing an error inside the canvas. An image nobody exported from jiscribe has
 * to reach the "no editable source" display instead, which from here is visible
 * only as the open succeeding.
 *
 * What the webview then shows is out of reach: a test cannot post messages as
 * the webview, so nothing past the open is asserted. Saving is out of reach for
 * the same reason — every save asks the webview to render the image, and the
 * bytes that land on disk depend on whether it answers.
 */

describe("image editor open paths", () => {
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

	it("opens a .jis.png carrying an embedded source", async () => {
		const uri = await writeFixtureFile(
			fixtureDirectory,
			"with-source.jis.png",
			jisPngBytes(canvasDocJson()),
		);

		await openInCustomEditor(uri, CANVAS_IMAGE_EDITOR_VIEW_TYPE);

		assert.equal(
			activeCustomEditorTabInput()?.viewType,
			CANVAS_IMAGE_EDITOR_VIEW_TYPE,
		);
	});

	it("opens a .jis.svg carrying an embedded source", async () => {
		const uri = await writeFixtureFile(
			fixtureDirectory,
			"with-source.jis.svg",
			jisSvgText(canvasDocJson()),
		);

		await openInCustomEditor(uri, CANVAS_IMAGE_EDITOR_VIEW_TYPE);

		assert.equal(
			activeCustomEditorTabInput()?.viewType,
			CANVAS_IMAGE_EDITOR_VIEW_TYPE,
		);
	});

	it("opens a .jis.png with no embedded source instead of failing", async () => {
		const uri = await writeFixtureFile(
			fixtureDirectory,
			"no-source.jis.png",
			plainPngBytes(),
		);

		await openInCustomEditor(uri, CANVAS_IMAGE_EDITOR_VIEW_TYPE);

		assert.equal(
			activeCustomEditorTabInput()?.viewType,
			CANVAS_IMAGE_EDITOR_VIEW_TYPE,
		);
	});

	it("opens a .jis.svg with no embedded source instead of failing", async () => {
		const uri = await writeFixtureFile(
			fixtureDirectory,
			"no-source.jis.svg",
			plainSvgText(),
		);

		await openInCustomEditor(uri, CANVAS_IMAGE_EDITOR_VIEW_TYPE);

		assert.equal(
			activeCustomEditorTabInput()?.viewType,
			CANVAS_IMAGE_EDITOR_VIEW_TYPE,
		);
	});
});
