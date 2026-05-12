import * as vscode from "vscode";

const EMPTY_CONTENT = JSON.stringify({ root: [], connectors: [] }, null, 2);

const SAMPLE_CONTENT = JSON.stringify(
	{
		root: [
			{
				id: "rect-1",
				type: "rect",
				x: 100,
				y: 150,
				width: 200,
				height: 100,
				stroke: "#1565C0",
				strokeWidth: 2,
				fill: "#90CAF9",
			},
			{
				id: "rect-2",
				type: "rect",
				x: 500,
				y: 150,
				width: 200,
				height: 100,
				stroke: "#2E7D32",
				strokeWidth: 2,
				fill: "#A5D6A7",
			},
			{
				id: "ellipse-1",
				type: "ellipse",
				cx: 400,
				cy: 380,
				rx: 100,
				ry: 60,
				stroke: "#E65100",
				strokeWidth: 2,
				fill: "#FFCC80",
			},
		],
		connectors: [
			{
				id: "connector-1",
				type: "connector",
				points: [
					{ x: 300, y: 200 },
					{ x: 500, y: 200 },
				],
				source: {
					owner: { type: "rect", id: "rect-1" },
					anchor: { kind: "connectPoint", id: "rightCenter" },
				},
				target: {
					owner: { type: "rect", id: "rect-2" },
					anchor: { kind: "connectPoint", id: "leftCenter" },
				},
				endArrow: "FilledTriangle",
				stroke: "#555555",
				strokeWidth: 2,
			},
		],
	},
	null,
	2,
);

const VALID_EXTENSIONS = [".jis.json", ".jiscribe.json", ".jis.jsonc", ".jiscribe.jsonc"];

function stripJisExtension(name: string): string {
	for (const ext of VALID_EXTENSIONS) {
		if (name.endsWith(ext)) return name.slice(0, -ext.length);
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

async function createCanvas(
	content: string,
	folderUri: vscode.Uri | undefined,
): Promise<void> {
	let targetFolder: vscode.Uri | undefined = folderUri;

	if (!targetFolder) {
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (workspaceFolders && workspaceFolders.length === 1) {
			targetFolder = workspaceFolders[0].uri;
		} else if (workspaceFolders && workspaceFolders.length > 1) {
			const picked = await vscode.window.showWorkspaceFolderPick({
				placeHolder: "Select a workspace folder to create the file in",
			});
			targetFolder = picked?.uri;
		}
	}

	if (!targetFolder) {
		const selected = await vscode.window.showOpenDialog({
			canSelectFiles: false,
			canSelectFolders: true,
			canSelectMany: false,
			openLabel: "Select Folder",
		});
		targetFolder = selected?.[0];
	}

	if (!targetFolder) return;

	const defaultName = await findAvailableFileName(targetFolder, "untitled.jis.json");

	const fileName = await vscode.window.showInputBox({
		prompt: "Enter a file name",
		value: defaultName,
		validateInput: (value) => {
			if (!value.trim()) return "File name is required";
			if (!VALID_EXTENSIONS.some((ext) => value.endsWith(ext)))
				return `File name must end with one of: ${VALID_EXTENSIONS.join(", ")}`;
			return null;
		},
	});

	if (!fileName) return;

	const fileUri = vscode.Uri.joinPath(targetFolder, fileName);

	try {
		try {
			await vscode.workspace.fs.stat(fileUri);
			const answer = await vscode.window.showWarningMessage(
				`"${fileName}" already exists. Overwrite it?`,
				{ modal: true },
				"Overwrite",
			);
			if (answer !== "Overwrite") return;
		} catch {
			// stat failed — file does not exist, proceed normally
		}

		await vscode.workspace.fs.writeFile(
			fileUri,
			new TextEncoder().encode(content),
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
			(uri?: vscode.Uri) => createCanvas(EMPTY_CONTENT, uri),
		),
		vscode.commands.registerCommand(
			"jiscribe.newCanvasFromTemplate",
			(uri?: vscode.Uri) => createCanvas(SAMPLE_CONTENT, uri),
		),
	);
}
