import * as vscode from "vscode";

import { DiagnosticProvider } from "./DiagnosticProvider";
import { JiscribeEditorProvider } from "./JiscribeEditorProvider";

export function activate(context: vscode.ExtensionContext) {
	console.log("Jiscribe extension is now active");

	// Initialize diagnostic provider for text editors
	new DiagnosticProvider(context);

	// Register custom editor provider
	const provider = new JiscribeEditorProvider(context);
	const registration = vscode.window.registerCustomEditorProvider(
		"jiscribe.editor",
		provider,
		{
			webviewOptions: {
				retainContextWhenHidden: true,
			},
			supportsMultipleEditorsPerDocument: false,
		},
	);

	context.subscriptions.push(registration);
}

export function deactivate() {
	console.log("Jiscribe extension is now deactivated");
}
