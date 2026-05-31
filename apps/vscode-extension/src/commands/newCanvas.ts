import * as vscode from "vscode";

const EMPTY_CONTENT = JSON.stringify({ root: [], connectors: [] }, null, 2);

const VALID_EXTENSIONS = [".jis.json", ".jiscribe.json"];

function stripJisExtension(name: string): string {
	for (const ext of VALID_EXTENSIONS) {
		if (name.endsWith(ext)) {
			return name.slice(0, -ext.length);
		}
	}
	return name;
}

async function findAvailableFileName(
	folder: vscode.Uri,
	base: string,
): Promise<string> {
	const stem = stripJisExtension(base);
	const ext = base.slice(stem.length);
	let candidate = base;
	let n = 2;
	while (true) {
		try {
			await vscode.workspace.fs.stat(vscode.Uri.joinPath(folder, candidate));
			candidate = `${stem}-${n}${ext}`;
			n++;
		} catch {
			return candidate;
		}
	}
}

async function resolveTargetFolder(
	folderUri: vscode.Uri | undefined,
): Promise<vscode.Uri | undefined> {
	if (folderUri) {
		return folderUri;
	}

	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (workspaceFolders && workspaceFolders.length === 1) {
		return workspaceFolders[0].uri;
	}
	if (workspaceFolders && workspaceFolders.length > 1) {
		const picked = await vscode.window.showWorkspaceFolderPick({
			placeHolder: "Select a workspace folder to create the file in",
		});
		return picked?.uri;
	}

	const selected = await vscode.window.showOpenDialog({
		canSelectFiles: false,
		canSelectFolders: true,
		canSelectMany: false,
		openLabel: "Select Folder",
	});
	return selected?.[0];
}

async function createCanvas(folderUri: vscode.Uri | undefined): Promise<void> {
	const targetFolder = await resolveTargetFolder(folderUri);
	if (!targetFolder) {
		return;
	}

	const defaultName = await findAvailableFileName(
		targetFolder,
		"untitled.jis.json",
	);

	const fileName = await vscode.window.showInputBox({
		prompt: "Enter a file name",
		value: defaultName,
		validateInput: (value) => {
			if (!value.trim()) {
				return "File name is required";
			}
			if (!VALID_EXTENSIONS.some((ext) => value.endsWith(ext))) {
				return `File name must end with one of: ${VALID_EXTENSIONS.join(", ")}`;
			}
			return null;
		},
	});

	if (!fileName) {
		return;
	}

	const fileUri = vscode.Uri.joinPath(targetFolder, fileName);

	try {
		try {
			await vscode.workspace.fs.stat(fileUri);
			const answer = await vscode.window.showWarningMessage(
				`"${fileName}" already exists. Overwrite it?`,
				{ modal: true },
				"Overwrite",
			);
			if (answer !== "Overwrite") {
				return;
			}
		} catch {
			// File does not exist — proceed normally
		}

		await vscode.workspace.fs.writeFile(
			fileUri,
			new TextEncoder().encode(EMPTY_CONTENT),
		);
		await vscode.commands.executeCommand(
			"vscode.openWith",
			fileUri,
			"jiscribe.editor",
		);
	} catch (err) {
		vscode.window.showErrorMessage(
			`Failed to create file: ${err instanceof Error ? err.message : String(err)}`,
		);
	}
}

export function registerNewCanvasCommands(
	context: vscode.ExtensionContext,
): void {
	context.subscriptions.push(
		vscode.commands.registerCommand(
			"jiscribe.newEmptyCanvas",
			(uri?: vscode.Uri) => createCanvas(uri),
		),
	);
}
