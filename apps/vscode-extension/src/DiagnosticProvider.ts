import * as vscode from "vscode";

import {
	parseAndValidateCanvasDoc,
	CanvasValidationError,
} from "@workspace/svg-canvas-2";

export class DiagnosticProvider {
	private collection: vscode.DiagnosticCollection;

	constructor(context: vscode.ExtensionContext) {
		this.collection = vscode.languages.createDiagnosticCollection("jiscribeCanvas");
		context.subscriptions.push(this.collection);

		// Listen for save events
		const saveListener = vscode.workspace.onDidSaveTextDocument((doc) => {
			this.validateDocument(doc);
		});
		
		// Initial check for opened files
		const openListener = vscode.workspace.onDidOpenTextDocument((doc) => {
			this.validateDocument(doc);
		});

		context.subscriptions.push(saveListener, openListener);

		// Validate all currently open documents when the extension activates
		vscode.workspace.textDocuments.forEach((doc) => {
			this.validateDocument(doc);
		});
	}

	private validateDocument(document: vscode.TextDocument) {
		if (!document.fileName.endsWith(".jis.json")) {
			return;
		}

		const text = document.getText();
		this.collection.delete(document.uri);
		const diagnostics: vscode.Diagnostic[] = [];

		try {
			// If JSON is totally invalid, JSON schema validation covers it.
			// Focus here on business-logic parsing vs JSON syntax.
			let json;
			try {
				json = JSON.parse(text);
			} catch (e) {
				// Let VS Code's built-in JSON tools handle basic syntax errors
				return;
			}

			// Validate Semantics (e.g. duplicate IDs, missing references)
			parseAndValidateCanvasDoc(json);
		} catch (error) {
			if (error instanceof CanvasValidationError) {
				for (const diag of error.specifics) {
					// We want to highlight the duplicate ID or missing ref.
					// A basic approach is finding the text of the ID in the document.
					let line = 0;
					let char = 0;
					let length = 1; // Default
                    let range: vscode.Range;
                    
					if (diag.id) {
						// Look for `"id": "..."` or just `"..."`
						const targetStr = `"${diag.id}"`;
						const idx = text.indexOf(targetStr);
						if (idx !== -1) {
							const position = document.positionAt(idx);
							line = position.line;
							char = position.character;
							length = targetStr.length;
                            range = new vscode.Range(line, char, line, char + length);
						} else {
                            // Fallback to top if not found
                            range = new vscode.Range(0, 0, 0, 10);
                        }
					} else {
                        // Fallback to top
                        range = new vscode.Range(0, 0, 0, 10);
                    }

					const diagnostic = new vscode.Diagnostic(
						range,
						`[Jiscribe Semantic Error] ${diag.message} (${diag.path})`,
						vscode.DiagnosticSeverity.Error
					);
					diagnostics.push(diagnostic);
				}
			}
		}

		if (diagnostics.length > 0) {
			this.collection.set(document.uri, diagnostics);
		}
	}
}
