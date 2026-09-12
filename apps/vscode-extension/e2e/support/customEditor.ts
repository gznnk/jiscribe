import * as vscode from "vscode";

import { waitFor } from "./timing";

/** Canvas editor for `.jis`; must match contributes.customEditors[].viewType. */
export const CANVAS_EDITOR_VIEW_TYPE = "jiscribe.editor";

/** Canvas editor for `.jis.png` / `.jis.svg`; must match contributes.customEditors[].viewType. */
export const CANVAS_IMAGE_EDITOR_VIEW_TYPE = "jiscribe.imageEditor";

/** The extension under test, as `publisher.name` from package.json. */
export const EXTENSION_ID = "gznnk.jiscribe";

/**
 * The active tab's input when a custom editor owns it, undefined otherwise
 * (a text editor, a diff, a webview panel, or no tab at all).
 */
export function activeCustomEditorTabInput():
	vscode.TabInputCustom | undefined {
	const input = vscode.window.tabGroups.activeTabGroup.activeTab?.input;
	return input instanceof vscode.TabInputCustom ? input : undefined;
}

/**
 * Open a file in one of the extension's custom editors and wait for its tab.
 *
 * `vscode.openWith` resolves once the editor is created, which is before the tab
 * is the active one, so the wait is what makes the assertions that follow stable.
 *
 * @param uri - the file to open; it must already exist on disk
 * @param viewType - {@link CANVAS_EDITOR_VIEW_TYPE} or
 *   {@link CANVAS_IMAGE_EDITOR_VIEW_TYPE}; naming the view type explicitly keeps
 *   the test off VSCode's own priority resolution
 * @returns rejects when the provider throws while resolving the editor
 */
export async function openInCustomEditor(
	uri: vscode.Uri,
	viewType: string,
): Promise<void> {
	await vscode.commands.executeCommand("vscode.openWith", uri, viewType);
	await waitFor(
		() => activeCustomEditorTabInput()?.uri.toString() === uri.toString(),
		`the ${viewType} tab for ${uri.path} to become active`,
	);
}

/**
 * Close every editor, so one suite's tabs cannot change what the next one sees.
 *
 * Only safe while nothing is dirty: VSCode puts up a modal save prompt for a
 * dirty editor, and a modal in a test run never gets an answer.
 */
export function closeAllEditors(): Thenable<unknown> {
	return vscode.commands.executeCommand("workbench.action.closeAllEditors");
}
