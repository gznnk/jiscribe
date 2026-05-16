import * as vscode from "vscode";

// ---- Content constants ----

const EMPTY_JSON_CONTENT = JSON.stringify(
	{ root: [], connectors: [] },
	null,
	2,
);

// prettier-ignore
const EMPTY_JSONC_CONTENT = `{
  // Canvas document — edit this file directly or open it with the Jiscribe canvas editor.
  //
  // Shape types for "root":
  //   rect     — rectangle   (required: id, type, x, y, width, height)
  //   ellipse  — oval        (required: id, type, cx, cy, rx, ry)
  //   sticky   — sticky note (required: id, type, x, y, width, height)
  //   polyline — open path   (required: id, type, points[])
  //   polygon  — closed path (required: id, type, points[])
  //   group    — group       (required: id, type, children[])
  //
  // Common optional fields:
  //   fill, stroke, strokeWidth, strokeDashType ("solid" | "dashed" | "dotted")
  //   text, textType ("text" | "markdown"), textAlign, fontColor, fontSize, fontWeight, rotation
  "root": [],

  // Connector (arrow) objects linking shapes on the canvas.
  //
  // Endpoint forms:
  //   owned — { owner: { type, id }, anchor: { kind: "connectPoint", id: "rightCenter" | "leftCenter" | "topCenter" | "bottomCenter" | "center" } }
  //   free  — { anchor: { kind: "free", point: { x, y } } }
  //
  // Arrow styles (endArrow / startArrow):
  //   "FilledTriangle" | "HollowTriangle" | "ConcaveTriangle" | "OpenArrow" |
  //   "FilledDiamond" | "HollowDiamond" | "Circle" | "None"
  "connectors": []
}`;

const SAMPLE_CONTENT = JSON.stringify(
	{
		root: [
			// Title
			{
				id: "title",
				type: "sticky",
				x: 40,
				y: 30,
				width: 460,
				height: 150,
				fill: "#EFF6FF",
				text: "## Feature Delivery Workflow\n\nA sample canvas demonstrating Jiscribe's shapes and connectors.\n\n**Shapes:** rect · ellipse · sticky　**Connectors:** solid arrow · dashed arrow",
				textType: "markdown",
				textAlign: "left",
				verticalAlign: "top",
			},
			// Workflow stages
			{
				id: "plan",
				type: "rect",
				x: 80,
				y: 230,
				width: 150,
				height: 65,
				rx: 8,
				fill: "#BFDBFE",
				stroke: "#1D4ED8",
				strokeWidth: 2,
				text: "Plan",
				textAlign: "center",
				fontWeight: "bold",
			},
			{
				id: "build",
				type: "rect",
				x: 360,
				y: 230,
				width: 150,
				height: 65,
				rx: 8,
				fill: "#FED7AA",
				stroke: "#C2410C",
				strokeWidth: 2,
				text: "Build",
				textAlign: "center",
				fontWeight: "bold",
			},
			{
				id: "review",
				type: "ellipse",
				cx: 690,
				cy: 262,
				rx: 95,
				ry: 48,
				fill: "#E9D5FF",
				stroke: "#7C3AED",
				strokeWidth: 2,
				text: "Review?",
				textAlign: "center",
				fontWeight: "bold",
			},
			{
				id: "release",
				type: "rect",
				x: 890,
				y: 230,
				width: 150,
				height: 65,
				rx: 8,
				fill: "#BBF7D0",
				stroke: "#15803D",
				strokeWidth: 2,
				text: "Release",
				textAlign: "center",
				fontWeight: "bold",
			},
			// Rejected sticky note
			{
				id: "sticky-rejected",
				type: "sticky",
				x: 500,
				y: 390,
				width: 220,
				height: 90,
				fill: "#FEE2E2",
				text: "**Rejected**\nReturn to Build with feedback.",
				textType: "markdown",
				textAlign: "left",
				verticalAlign: "top",
			},
		],
		connectors: [
			// Plan → Build
			{
				id: "c-plan-build",
				type: "connector",
				points: [
					{ x: 230, y: 262 },
					{ x: 360, y: 262 },
				],
				source: {
					owner: { type: "rect", id: "plan" },
					anchor: { kind: "connectPoint", id: "rightCenter" },
				},
				target: {
					owner: { type: "rect", id: "build" },
					anchor: { kind: "connectPoint", id: "leftCenter" },
				},
				endArrow: "FilledTriangle",
				stroke: "#555555",
				strokeWidth: 2,
			},
			// Build → Review
			{
				id: "c-build-review",
				type: "connector",
				points: [
					{ x: 510, y: 262 },
					{ x: 545, y: 262 },
				],
				source: {
					owner: { type: "rect", id: "build" },
					anchor: { kind: "connectPoint", id: "rightCenter" },
				},
				target: {
					owner: { type: "ellipse", id: "review" },
					anchor: { kind: "connectPoint", id: "leftCenter" },
				},
				endArrow: "FilledTriangle",
				stroke: "#555555",
				strokeWidth: 2,
			},
			// Review → Release (approved)
			{
				id: "c-review-release",
				type: "connector",
				points: [
					{ x: 735, y: 262 },
					{ x: 850, y: 262 },
				],
				source: {
					owner: { type: "ellipse", id: "review" },
					anchor: { kind: "connectPoint", id: "rightCenter" },
				},
				target: {
					owner: { type: "rect", id: "release" },
					anchor: { kind: "connectPoint", id: "leftCenter" },
				},
				endArrow: "FilledTriangle",
				stroke: "#15803D",
				strokeWidth: 2,
			},
			// Review → Rejected sticky (rejected)
			{
				id: "c-review-rejected",
				type: "connector",
				points: [
					{ x: 640, y: 310 },
					{ x: 640, y: 370 },
					{ x: 610, y: 370 },
					{ x: 610, y: 390 },
				],
				source: {
					owner: { type: "ellipse", id: "review" },
					anchor: { kind: "connectPoint", id: "bottomCenter" },
				},
				target: {
					owner: { type: "sticky", id: "sticky-rejected" },
					anchor: { kind: "connectPoint", id: "topCenter" },
				},
				endArrow: "OpenArrow",
				stroke: "#DC2626",
				strokeWidth: 1.5,
				strokeDashType: "dashed",
			},
			// Rejected sticky → Build (retry)
			{
				id: "c-rejected-build",
				type: "connector",
				points: [
					{ x: 500, y: 435 },
					{ x: 310, y: 435 },
					{ x: 310, y: 295 },
					{ x: 360, y: 295 },
				],
				source: {
					owner: { type: "sticky", id: "sticky-rejected" },
					anchor: { kind: "connectPoint", id: "leftCenter" },
				},
				target: {
					owner: { type: "rect", id: "build" },
					anchor: { kind: "connectPoint", id: "leftCenter" },
				},
				endArrow: "OpenArrow",
				stroke: "#DC2626",
				strokeWidth: 1.5,
				strokeDashType: "dashed",
			},
		],
	},
	null,
	2,
);

// ---- Helpers ----

const VALID_EXTENSIONS = [
	".jis.json",
	".jiscribe.json",
	".jis.jsonc",
	".jiscribe.jsonc",
];

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

type CanvasTemplate = "empty" | "spec" | "sample";

function buildContent(template: CanvasTemplate, fileName: string): string {
	if (template === "sample") return SAMPLE_CONTENT;
	if (template === "spec" && !fileName.endsWith(".json"))
		return EMPTY_JSONC_CONTENT;
	return EMPTY_JSON_CONTENT;
}

async function resolveTargetFolder(
	folderUri: vscode.Uri | undefined,
): Promise<vscode.Uri | undefined> {
	if (folderUri) return folderUri;

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

async function createCanvas(
	template: CanvasTemplate,
	folderUri: vscode.Uri | undefined,
): Promise<void> {
	const targetFolder = await resolveTargetFolder(folderUri);
	if (!targetFolder) return;

	const defaultExtension =
		template === "spec" ? ".jiscribe.jsonc" : ".jiscribe.json";
	const defaultName = await findAvailableFileName(
		targetFolder,
		`untitled${defaultExtension}`,
	);

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
			// File does not exist — proceed normally
		}

		const content = buildContent(template, fileName);
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

// ---- Registration ----

export function registerNewCanvasCommands(
	context: vscode.ExtensionContext,
): void {
	context.subscriptions.push(
		vscode.commands.registerCommand(
			"jiscribe.newEmptyCanvas",
			(uri?: vscode.Uri) => createCanvas("empty", uri),
		),
		vscode.commands.registerCommand(
			"jiscribe.newEmptyCanvasWithSpec",
			(uri?: vscode.Uri) => createCanvas("spec", uri),
		),
		vscode.commands.registerCommand(
			"jiscribe.newCanvasFromTemplate",
			(uri?: vscode.Uri) => createCanvas("sample", uri),
		),
	);
}
