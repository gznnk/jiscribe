import * as vscode from "vscode";

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
 * - Only files we generate are overwritten; user-managed files (CLAUDE.md,
 *   .gitignore, etc.) are never touched.
 *
 * NOTE: auto-generating MCP server config is deferred
 * (docs/03_ai-integration/mcp_design.md).
 */

// Header marking a generated file (discourages manual edits).
const GENERATED_NOTICE =
	"<!-- Generated and managed by the Jiscribe extension's “Set up AI” command. Manual edits are overwritten on re-run. -->";

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

		// Canonical copy: .jiscribe/ (referenced by every adapter).
		const jiscribeDir = vscode.Uri.joinPath(root, ".jiscribe");
		await vscode.workspace.fs.createDirectory(jiscribeDir);
		const guideUri = vscode.Uri.joinPath(jiscribeDir, "ai-guide.md");
		const schemaUri = vscode.Uri.joinPath(jiscribeDir, "jiscribe.schema.json");
		// Prepend the generated header to Markdown (not the JSON schema).
		const withNotice = (asset: Uint8Array): Uint8Array =>
			new TextEncoder().encode(
				`${GENERATED_NOTICE}\n\n${new TextDecoder().decode(asset)}`,
			);
		await writeFile(guideUri, withNotice(guide));
		await writeFile(schemaUri, schema);
		// reference.md was ours until the guide absorbed it. A copy left from an
		// earlier run is never refreshed again, so drop it rather than let an AI
		// find a stale spec beside the current one. Absent is the normal case.
		try {
			await vscode.workspace.fs.delete(
				vscode.Uri.joinPath(jiscribeDir, "reference.md"),
				{ useTrash: false },
			);
		} catch {
			// Nothing to remove.
		}

		// Place the adapter for each selected agent.
		for (const target of targets) {
			const dir = vscode.Uri.joinPath(root, ...target.adapterPath.slice(0, -1));
			await vscode.workspace.fs.createDirectory(dir);
			const fileUri = vscode.Uri.joinPath(root, ...target.adapterPath);
			await writeFile(fileUri, new TextEncoder().encode(target.content));
		}

		const names = targets.map((t) => t.label).join(", ");
		const action = await vscode.window.showInformationMessage(
			`Set up AI: Created .jiscribe/ and config for ${names}. Ask your AI assistant to draw a Jiscribe diagram.`,
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
