import * as vscode from "vscode";

import { classifyExistingFile } from "./existingFileOwnership";
import { GENERATED_NOTICE } from "./generatedFileNotice";
import { removeGeneratedReference } from "./staleReferenceRemoval";
import { collectDirectoryPrefixes } from "./writeDestinationPaths";

/**
 * "Set up AI" command.
 *
 * Places the guide/schema plus per-agent adapters (Skill / rules /
 * instructions) so a workspace's AI agents can generate and edit `.jis`
 * correctly. See docs/03_ai-integration/setup_ai_design.md.
 *
 * - The canonical copy lives once in `.jiscribe/` (ai-guide.md +
 *   jiscribe.schema.json).
 * - Each agent's own-file adapter is a thin pointer to `.jiscribe/ai-guide.md`,
 *   which is the single entry point to the schema beside it.
 * - A file carrying the generated notice is ours and is overwritten. A file at
 *   one of those paths without it is the user's own, and is replaced only after
 *   they confirm. Files outside the set (CLAUDE.md, .gitignore, etc.) are never
 *   touched.
 * - Nothing is written through a symbolic link: a destination, or any directory
 *   on the way to one, that is a link aborts the command.
 *
 * NOTE: auto-generating MCP server config is deferred
 * (docs/03_ai-integration/mcp_design.md).
 */

// Shared adapter body (excluding frontmatter). It names where to go and nothing
// else: an adapter that also summarised what the guide holds would be a copy that
// goes stale the next time the guide changes, and each of these files is written
// once into a workspace we never see again.
const ADAPTER_INSTRUCTION = `When generating or editing Jiscribe diagram data (\`.jis\` / \`.jiscribe\` / \`.jis.json\` / \`.jiscribe.json\`), read \`.jiscribe/ai-guide.md\` at the workspace root and follow it.
`;

/** Claude Code Skill: .claude/skills/jiscribe/SKILL.md */
const CLAUDE_SKILL = `---
name: jiscribe
description: Use when creating or editing Jiscribe .jis canvas diagrams (flowcharts, architecture diagrams, sticky notes, etc.).
---

${GENERATED_NOTICE}

${ADAPTER_INSTRUCTION}`;

/** Cursor rule: .cursor/rules/jiscribe.mdc (globs auto-attach it when editing a canvas file). */
const CURSOR_RULE = `---
description: Jiscribe .jis canvas diagrams
globs: *.jis,*.jiscribe,*.jis.json,*.jiscribe.json
alwaysApply: false
---

${GENERATED_NOTICE}

${ADAPTER_INSTRUCTION}`;

/** GitHub Copilot: .github/instructions/jiscribe.instructions.md (applyTo scopes when it fires). */
const COPILOT_INSTRUCTIONS = `---
applyTo: "**/*.jis,**/*.jiscribe,**/*.jis.json,**/*.jiscribe.json"
---

${GENERATED_NOTICE}

${ADAPTER_INSTRUCTION}`;

type AgentId = "claude" | "cursor" | "copilot";

interface AgentTarget {
	id: AgentId;
	label: string;
	detail: string;
	/** Marker directory (at workspace root) used to detect existing use. */
	markerDir: string;
	/** Adapter destination, as path segments relative to the workspace root. */
	adapterPath: string[];
	/** Adapter contents. */
	content: string;
}

const TARGETS: AgentTarget[] = [
	{
		id: "claude",
		label: "Claude Code",
		detail: ".claude/skills/jiscribe/SKILL.md",
		markerDir: ".claude",
		adapterPath: [".claude", "skills", "jiscribe", "SKILL.md"],
		content: CLAUDE_SKILL,
	},
	{
		id: "cursor",
		label: "Cursor",
		detail: ".cursor/rules/jiscribe.mdc",
		markerDir: ".cursor",
		adapterPath: [".cursor", "rules", "jiscribe.mdc"],
		content: CURSOR_RULE,
	},
	{
		id: "copilot",
		label: "GitHub Copilot",
		detail: ".github/instructions/jiscribe.instructions.md",
		markerDir: ".github",
		adapterPath: [".github", "instructions", "jiscribe.instructions.md"],
		content: COPILOT_INSTRUCTIONS,
	},
];

/** Read an asset bundled into dist. */
async function readDistAsset(
	context: vscode.ExtensionContext,
	fileName: string,
): Promise<Uint8Array> {
	const uri = vscode.Uri.joinPath(context.extensionUri, "dist", fileName);
	return vscode.workspace.fs.readFile(uri);
}

/** Resolve the target workspace folder (prompting to pick if there are several). */
async function resolveTargetFolder(): Promise<vscode.Uri | undefined> {
	const folders = vscode.workspace.workspaceFolders;
	if (!folders || folders.length === 0) {
		vscode.window.showErrorMessage(
			"Set up AI: Open a workspace folder before running this command.",
		);
		return undefined;
	}
	if (folders.length === 1) {
		return folders[0].uri;
	}
	const picked = await vscode.window.showWorkspaceFolderPick({
		placeHolder: "Select the workspace folder to set up AI in",
	});
	return picked?.uri;
}

/** Guess whether an agent is already in use from the presence of its marker dir. */
async function detectAgent(
	root: vscode.Uri,
	markerDir: string,
): Promise<boolean> {
	try {
		await vscode.workspace.fs.stat(vscode.Uri.joinPath(root, markerDir));
		return true;
	} catch {
		return false;
	}
}

/** Let the user pick which agents to set up via a multi-select UI. */
async function pickTargets(
	root: vscode.Uri,
): Promise<AgentTarget[] | undefined> {
	const detected = await Promise.all(
		TARGETS.map((t) => detectAgent(root, t.markerDir)),
	);
	// Default ON for detected markers; if none are detected, all ON (first run).
	const anyDetected = detected.some(Boolean);
	const items = TARGETS.map((target, i) => ({
		label: target.label,
		detail: target.detail,
		target,
		picked: anyDetected ? detected[i] : true,
	}));

	const picked = await vscode.window.showQuickPick(items, {
		canPickMany: true,
		placeHolder: "Select the AI agents to set up for this workspace",
	});
	return picked?.map((item) => item.target);
}

async function writeFile(uri: vscode.Uri, content: Uint8Array): Promise<void> {
	await vscode.workspace.fs.writeFile(uri, content);
}

/** A file to write, held until every destination has been judged safe. */
interface PlannedWrite {
	/** Destination, as path segments relative to the workspace root. */
	path: string[];
	/** Bytes to write, carrying {@link GENERATED_NOTICE} on the first line. */
	content: Uint8Array;
}

/** Workspace-relative path, as the messages spell it. */
function toRelativePath(segments: readonly string[]): string {
	return segments.join("/");
}

/**
 * The outermost component of the destinations that is a symbolic link.
 *
 * A repository can ship `.jiscribe` or `.claude/skills/jiscribe` as a link
 * pointing out of the workspace, and `vscode.workspace.fs` follows it, so the
 * command would write into whatever it names. A component that is not there is
 * fine: the command creates it, and creation does not follow anything.
 *
 * @param root - workspace folder every path is resolved against
 * @param destinationPaths - the files about to be written, as segments relative to `root`
 * @returns the workspace-relative path of the first link found, walking directories before files; undefined when the way is clear
 */
async function findSymbolicLinkOnTheWay(
	root: vscode.Uri,
	destinationPaths: readonly string[][],
): Promise<string | undefined> {
	const components = [
		...collectDirectoryPrefixes(destinationPaths),
		...destinationPaths,
	];
	for (const segments of components) {
		let entry: vscode.FileStat;
		try {
			entry = await vscode.workspace.fs.stat(
				vscode.Uri.joinPath(root, ...segments),
			);
		} catch {
			// Not there, so there is nothing to follow.
			continue;
		}
		if ((entry.type & vscode.FileType.SymbolicLink) !== 0) {
			return toRelativePath(segments);
		}
	}
	return undefined;
}

/**
 * Ask what to do about destinations holding a file the command did not write.
 *
 * @param foreignPaths - the workspace-relative paths in question, at least one
 * @returns the paths to leave alone (empty when the user takes the overwrite), or undefined when they dismissed the dialog and the command must write nothing at all
 */
async function askAboutForeignFiles(
	foreignPaths: readonly string[],
): Promise<readonly string[] | undefined> {
	const listed = foreignPaths.join(", ");
	const subject = foreignPaths.length === 1 ? "was" : "were";
	const choice = await vscode.window.showWarningMessage(
		`Set up AI: ${listed} ${subject} not generated by this command. Overwriting replaces what is there.`,
		{ modal: true },
		"Overwrite",
		"Skip Them",
	);
	if (choice === undefined) {
		return undefined;
	}
	return choice === "Overwrite" ? [] : foreignPaths;
}

async function runSetupAi(context: vscode.ExtensionContext): Promise<void> {
	const root = await resolveTargetFolder();
	if (!root) {
		return;
	}

	const targets = await pickTargets(root);
	if (!targets || targets.length === 0) {
		return;
	}

	try {
		const [guide, schema] = await Promise.all([
			readDistAsset(context, "ai-guide.md"),
			readDistAsset(context, "jiscribe.schema.json"),
		]);

		// Prepend the generated header to Markdown (not the JSON schema).
		const withNotice = (asset: Uint8Array): Uint8Array =>
			new TextEncoder().encode(
				`${GENERATED_NOTICE}\n\n${new TextDecoder().decode(asset)}`,
			);
		// The canonical guide plus each selected agent's adapter: every file that
		// carries the notice, and so every file whose ownership can be read back.
		const plannedWrites: PlannedWrite[] = [
			{ path: [".jiscribe", "ai-guide.md"], content: withNotice(guide) },
			...targets.map((target) => ({
				path: target.adapterPath,
				content: new TextEncoder().encode(target.content),
			})),
		];
		const jiscribeDir = vscode.Uri.joinPath(root, ".jiscribe");
		const guideUri = vscode.Uri.joinPath(jiscribeDir, "ai-guide.md");
		const schemaPath = [".jiscribe", "jiscribe.schema.json"];

		const linkedPath = await findSymbolicLinkOnTheWay(root, [
			...plannedWrites.map((planned) => planned.path),
			schemaPath,
		]);
		if (linkedPath) {
			vscode.window.showErrorMessage(
				`Set up AI: ${linkedPath} is a symbolic link, and this command does not write through one. Replace it with a real file or directory, then run the command again.`,
			);
			return;
		}

		const ownerships = await Promise.all(
			plannedWrites.map((planned) =>
				classifyExistingFile(async () =>
					vscode.workspace.fs.readFile(
						vscode.Uri.joinPath(root, ...planned.path),
					),
				),
			),
		);
		const foreignPaths = plannedWrites
			.filter((_, index) => ownerships[index] === "foreign")
			.map((planned) => toRelativePath(planned.path));
		let skippedPaths: readonly string[] = [];
		if (foreignPaths.length > 0) {
			const answer = await askAboutForeignFiles(foreignPaths);
			if (answer === undefined) {
				return;
			}
			skippedPaths = answer;
		}

		for (const planned of plannedWrites) {
			if (skippedPaths.includes(toRelativePath(planned.path))) {
				continue;
			}
			const directory = vscode.Uri.joinPath(root, ...planned.path.slice(0, -1));
			await vscode.workspace.fs.createDirectory(directory);
			await writeFile(
				vscode.Uri.joinPath(root, ...planned.path),
				planned.content,
			);
		}

		// The schema carries no notice to read ownership off, and it is this
		// command's own output rather than anything a user would write by hand,
		// so it goes down unconditionally.
		await vscode.workspace.fs.createDirectory(jiscribeDir);
		await writeFile(vscode.Uri.joinPath(root, ...schemaPath), schema);

		// A reference.md left by an earlier version goes, but only the copy we
		// wrote (see removeGeneratedReference). Absent is the normal case.
		const referenceUri = vscode.Uri.joinPath(jiscribeDir, "reference.md");
		const referenceOutcome = await removeGeneratedReference({
			read: async () => vscode.workspace.fs.readFile(referenceUri),
			delete: async (useTrash) =>
				vscode.workspace.fs.delete(referenceUri, { useTrash }),
		});

		const names = targets.map((t) => t.label).join(", ");
		// A reference.md we did not write is the one thing the command leaves as it
		// found it, so say so rather than let it look like a file we forgot.
		const keptNote =
			referenceOutcome === "kept"
				? " Left .jiscribe/reference.md as it is: it is not a generated file, and the setup no longer uses it."
				: "";
		const skippedNote =
			skippedPaths.length > 0
				? ` Left ${skippedPaths.join(", ")} as ${skippedPaths.length === 1 ? "it is" : "they are"}: not generated by this command.`
				: "";
		const action = await vscode.window.showInformationMessage(
			`Set up AI: Created .jiscribe/ and config for ${names}.${keptNote}${skippedNote} Ask your AI assistant to draw a Jiscribe diagram.`,
			"Open Guide",
		);
		if (action === "Open Guide") {
			await vscode.window.showTextDocument(guideUri);
		}
	} catch (err) {
		vscode.window.showErrorMessage(
			`Set up AI failed: ${err instanceof Error ? err.message : String(err)}`,
		);
	}
}

export function registerSetupAiCommand(context: vscode.ExtensionContext): void {
	context.subscriptions.push(
		vscode.commands.registerCommand("jiscribe.setupAi", () =>
			runSetupAi(context),
		),
	);
}
