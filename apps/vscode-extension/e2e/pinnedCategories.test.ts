import assert from "node:assert/strict";

import { canvasDocJson } from "./support/canvasFixtures";
import {
	CANVAS_EDITOR_VIEW_TYPE,
	closeAllEditors,
	openInCustomEditor,
} from "./support/customEditor";
import {
	createFixtureDirectory,
	removeFixtureDirectory,
	writeFixtureFile,
} from "./support/fixtureDirectory";
import { waitFor } from "./support/timing";
import {
	connectWebviewBridge,
	postAsWebview,
	recordMessagesToWebview,
	type WebviewBridge,
} from "./support/webviewBridge";

/**
 * The rail's pins as the extension carries them from one editor to the next
 * (src/editor/pinnedCategoryStore.ts). Driven through the Test-mode bridge, as
 * textEditorCommit.test.ts is: the test posts the change a canvas reports, and
 * watches what the next editor's Webview is sent on "ready".
 */

/** Budget for the Webview's first message (see textEditorCommit.test.ts). */
const WEBVIEW_READY_TIMEOUT_MS = 15_000;

describe("the rail's pinned categories", () => {
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

	it("sends the pins one editor reported to the next editor, ahead of its first update", async () => {
		const firstUri = await writeFixtureFile(
			fixtureDirectory,
			"first.jis",
			canvasDocJson(["r1"]),
		);
		const secondUri = await writeFixtureFile(
			fixtureDirectory,
			"second.jis",
			canvasDocJson(["r2"]),
		);
		// globalState outlives the run (.vscode-test/user-data), so the ids differ
		// per run: a value left by an earlier run cannot pass for this one's write.
		const reportedPinnedCategoryIds = [
			"uml",
			`not-installed-plugin-${Date.now()}`,
		];

		const firstRecorder = recordMessagesToWebview(bridge, firstUri);
		await openInCustomEditor(firstUri, CANVAS_EDITOR_VIEW_TYPE);
		await waitFor(
			() => firstRecorder.messages.some(({ type }) => type === "update"),
			`the update the Webview's "ready" asks for on opening ${firstUri.path}`,
			WEBVIEW_READY_TIMEOUT_MS,
		);
		firstRecorder.dispose();
		postAsWebview(bridge, firstUri, {
			type: "pinnedCategoriesChange",
			pinnedCategoryIds: reportedPinnedCategoryIds,
		});

		const secondRecorder = recordMessagesToWebview(bridge, secondUri);
		await openInCustomEditor(secondUri, CANVAS_EDITOR_VIEW_TYPE);
		await waitFor(
			() => secondRecorder.messages.some(({ type }) => type === "update"),
			`the update the Webview's "ready" asks for on opening ${secondUri.path}`,
			WEBVIEW_READY_TIMEOUT_MS,
		);
		secondRecorder.dispose();

		const pinsIndex = secondRecorder.messages.findIndex(
			({ type }) => type === "pinnedCategories",
		);
		const updateIndex = secondRecorder.messages.findIndex(
			({ type }) => type === "update",
		);
		assert.ok(
			pinsIndex !== -1 && pinsIndex < updateIndex,
			"the pins did not reach the Webview before the update its canvas mounts on",
		);
		assert.deepEqual(secondRecorder.messages[pinsIndex], {
			type: "pinnedCategories",
			pinnedCategoryIds: reportedPinnedCategoryIds,
		});
	});
});
