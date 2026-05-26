import * as vscode from "vscode";

export function registerExportSchemaCommand(
	context: vscode.ExtensionContext,
): void {
	context.subscriptions.push(
		vscode.commands.registerCommand(
			"jiscribe.exportSchema",
			async (uri?: vscode.Uri) => {
				let targetFolder: vscode.Uri | undefined = uri;

				if (!targetFolder) {
					const selected = await vscode.window.showOpenDialog({
						canSelectFiles: false,
						canSelectFolders: true,
						canSelectMany: false,
						openLabel: "Export Schema Here",
					});
					targetFolder = selected?.[0];
				}

				if (!targetFolder) {
					return;
				}

				const destUri = vscode.Uri.joinPath(
					targetFolder,
					"jiscribe.schema.json",
				);
				const srcUri = vscode.Uri.joinPath(
					context.extensionUri,
					"dist",
					"jiscribe.schema.json",
				);

				try {
					try {
						await vscode.workspace.fs.stat(destUri);
						const answer = await vscode.window.showWarningMessage(
							`"jiscribe.schema.json" already exists. Overwrite it?`,
							{ modal: true },
							"Overwrite",
						);
						if (answer !== "Overwrite") {
							return;
						}
					} catch {
						// File does not exist — proceed normally
					}

					await vscode.workspace.fs.copy(srcUri, destUri, { overwrite: true });

					const action = await vscode.window.showInformationMessage(
						"Schema exported: jiscribe.schema.json",
						"Open File",
					);
					if (action === "Open File") {
						await vscode.window.showTextDocument(destUri);
					}
				} catch (err) {
					vscode.window.showErrorMessage(
						`Failed to export schema: ${err instanceof Error ? err.message : String(err)}`,
					);
				}
			},
		),
	);
}
