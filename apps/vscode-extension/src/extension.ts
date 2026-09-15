import * as vscode from "vscode";

import { registerSetupAiCommand } from "./commands/setupAi";
import { DiagnosticProvider } from "./diagnostics/DiagnosticProvider";
import { JiscribeEditorProvider } from "./editor/JiscribeEditorProvider";
import { JiscribeImageEditorProvider } from "./editor/JiscribeImageEditorProvider";
import { createWebviewBridgeRegistry } from "./editor/webviewBridgeRegistry";
import type { JiscribeTestApi } from "./types/testApi";

/**
 * Extension entry point, called by VSCode on activation. Per package.json's
 * activationEvents (currently []), this fires when the first canvas file opens.
 * Disposables pushed to context.subscriptions are released on deactivation.
 *
 * @param context - the activation context; its extensionMode decides whether the
 *   Test API is returned
 * @returns the Test API in ExtensionMode.Test, undefined in every other mode
 */
export function activate(
	context: vscode.ExtensionContext,
): JiscribeTestApi | undefined {
	// Surface canvas file validation errors in the Problems panel.
	new DiagnosticProvider(context);

	// Both custom editors announce their panels here, so the e2e suite can act as
	// a Webview (see editor/webviewBridgeRegistry).
	const bridgeRegistry = createWebviewBridgeRegistry();

	// Custom editor that shows the Canvas UI (Webview) for canvas files.
	const provider = new JiscribeEditorProvider(context, bridgeRegistry);
	const registration = vscode.window.registerCustomEditorProvider(
		"jiscribe.editor", // must match contributes.customEditors[].viewType
		provider,
		{
			webviewOptions: {
				// false: discard the hidden tab's Webview context (~1MB of evaluated
				// JS + React/SVG tree) and rebuild on re-show (#138). No state is lost:
				// the document is re-sent when the rebuilt Webview re-emits "ready", and
				// the viewport is saved/restored via getState/setState
				// (src/webview/index.tsx). Trade-off: a brief "Loading canvas..." reload.
				retainContextWhenHidden: false,
			},
			supportsMultipleEditorsPerDocument: false,
		},
	);

	context.subscriptions.push(registration);

	// Custom editor that opens source-embedded images (.jis.png / .jis.svg,
	// analogous to draw.io's .drawio.png / .drawio.svg) in the Canvas UI.
	const imageProvider = new JiscribeImageEditorProvider(
		context,
		bridgeRegistry,
	);
	const imageRegistration = vscode.window.registerCustomEditorProvider(
		"jiscribe.imageEditor", // must match contributes.customEditors[].viewType
		imageProvider,
		{
			webviewOptions: {
				// Discard the hidden tab's Webview, same as the text side (#138).
				retainContextWhenHidden: false,
			},
			supportsMultipleEditorsPerDocument: false,
		},
	);
	context.subscriptions.push(imageRegistration);

	registerSetupAiCommand(context);

	// extensionMode is Test only for a host VSCode launched with
	// --extensionTestsPath, which is how the e2e suite runs; a normal session (or
	// a Development one) exports nothing, so this is not an environment sniff.
	if (context.extensionMode === vscode.ExtensionMode.Test) {
		return { webviewBridge: bridgeRegistry };
	}
	return undefined;
}

/**
 * Called by VSCode on deactivation. Disposables in context.subscriptions are
 * released automatically, so extra teardown here is usually unnecessary.
 */
export function deactivate() {}
