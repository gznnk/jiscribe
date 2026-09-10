import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

import prettier from "prettier";

import { generateCanvasPromptModule } from "./generateCanvasPromptModule";
import { loadGuideParts } from "./generateParts";
import { generateSchema } from "./generateSchema";
import { loadManifest } from "./manifest";
import {
	aiToolsSrcPath,
	assetsPath,
	claudePluginPath,
	packageRootPath,
	templatePath,
} from "./paths";

/** Run prettier over generated content, with the config that path resolves to. */
async function formatFor(filePath: string, content: string): Promise<string> {
	const config = (await prettier.resolveConfig(filePath)) ?? {};
	return prettier.format(content, { ...config, filepath: filePath });
}

/** Join document parts with one blank line between them, ending in a newline. */
function composeDocument(parts: readonly string[]): string {
	return `${parts.map((part) => part.trim()).join("\n\n")}\n`;
}

/**
 * Short digest naming one generation of the guides, stamped into every one of
 * them so a copy can be told apart from another copy.
 *
 * The same guides reach a reader through channels that pin their versions
 * independently — the VSCode extension writes .jiscribe/ai-guide.md at its own
 * release, jiscribe-mcp serves them at the npm package's, the Claude Code plugin
 * ships its skill at the marketplace's — and nothing else would say which
 * generation a copy came from.
 *
 * Two halves, because neither alone does the job. The version orders them — a
 * reader holding two copies has to know which one to trust, and a digest only
 * says they differ. The digest keeps the version honest — a release that edits
 * the guides and forgets to bump would otherwise have two different texts
 * claiming the same version, which is the one answer that must never be wrong.
 * Forgetting the bump then costs the ordering, not the truth.
 *
 * Neither half is derived from the commit, so regenerating an unchanged tree
 * keeps the same stamp and `--check` stays a drift test.
 *
 * @param documents every composed guide body, unstamped, in a fixed order
 * @returns `<version>+<8 hex characters of the SHA-256 over the bodies>`
 */
function guideStamp(documents: readonly string[]): string {
	const { version } = JSON.parse(
		readFileSync(packageRootPath("package.json"), "utf8"),
	) as { version: string };
	const digest = createHash("sha256")
		.update(documents.join("\u0000"))
		.digest("hex")
		.slice(0, 8);
	return `${version}+${digest}`;
}

/** Prefix a guide with the generation stamp, as a comment markdown does not render. */
function stampGuide(stamp: string, document: string): string {
	return `<!-- jiscribe guide ${stamp} -->\n\n${document}`;
}

/** One composed guide, before the stamp is known. */
interface Guide {
	/** Where the stamped file is written. */
	path: string;
	/**
	 * YAML front matter, for the guides that are read as something other than
	 * plain markdown. Kept out of the body because front matter only counts as
	 * front matter at the very start of the file, ahead of the stamp comment —
	 * and out of the stamp, which names a generation of the guide prose: a
	 * changed skill trigger would otherwise move the stamp in every document and
	 * make copies whose prose is identical look like they came from different
	 * releases. Drift is `--check`'s job, not the stamp's.
	 */
	frontMatter?: string;
	/** The composed body, h1 downwards. */
	body: string;
}

/** Lay a guide out as it is written: front matter, then the stamp, then the body. */
function composeGuideFile(stamp: string, guide: Guide): string {
	const stamped = stampGuide(stamp, guide.body);
	return guide.frontMatter
		? `${guide.frontMatter.trim()}\n\n${stamped}`
		: stamped;
}

/**
 * Generate everything derived from the shape manifest and the guide parts: the
 * JSON schema, the four composed guides (ai-guide.md for a reader writing JSON
 * by hand, canvas-prompt.md for one holding the canvas tools, authoring-json.md
 * for the file format alone, SKILL.md for the Claude Code plugin), the
 * TypeScript module @jiscribe/ai-tools ships the canvas prompt as, and the copy
 * of authoring-json.md the skill keeps beside itself as a reference. With
 * `--check` nothing is written; the output is compared against the committed
 * content instead (drift detection, run by CI).
 */
async function main(): Promise<void> {
	const checkOnly = process.argv.includes("--check");
	const manifest = loadManifest();
	const parts = loadGuideParts(manifest);

	const canvasPromptPath = assetsPath("canvas-prompt.md");
	const authoringJsonPath = assetsPath("authoring-json.md");

	// Every guide, composed but not yet stamped. The stamp is taken over all of
	// them at once, so listing a guide here is what puts it into the stamp — one
	// appended straight to `outputs` instead would leave the stamp unmoved when
	// its text changes, and a copy of it could then never be told apart.
	const guides: Guide[] = [
		{
			path: assetsPath("ai-guide.md"),
			body: composeDocument([
				readFileSync(templatePath("aiGuideIntro.md"), "utf8"),
				parts.canvasModel,
				parts.shapeCatalog,
				parts.drawingPractice,
				parts.authoringJson,
			]),
		},
		{
			path: canvasPromptPath,
			body: composeDocument([
				readFileSync(templatePath("canvasPromptIntro.md"), "utf8"),
				parts.canvasModel,
				parts.shapeCatalog,
				parts.drawingPractice,
			]),
		},
		{
			path: authoringJsonPath,
			body: composeDocument([
				readFileSync(templatePath("authoringJsonIntro.md"), "utf8"),
				parts.authoringJson,
			]),
		},
		{
			path: claudePluginPath("skills/jiscribe/SKILL.md"),
			frontMatter: readFileSync(templatePath("skillFrontmatter.md"), "utf8"),
			body: composeDocument([
				readFileSync(templatePath("skillIntro.md"), "utf8"),
				parts.canvasModel,
				parts.shapeCatalog,
				parts.drawingPractice,
			]),
		},
	];
	const stamp = guideStamp(guides.map((guide) => guide.body));

	// Formatted here rather than with the rest, because the TypeScript module
	// below embeds the canvas prompt verbatim: formatting it afterwards would only
	// reach the .md copy and leave the two out of step.
	const guideOutputs = await Promise.all(
		guides.map(async (guide) => ({
			path: guide.path,
			content: await formatFor(guide.path, composeGuideFile(stamp, guide)),
		})),
	);
	const findGuide = (path: string): string =>
		guideOutputs.find((output) => output.path === path)!.content;
	const canvasPrompt = findGuide(canvasPromptPath);

	const outputs: Array<{ path: string; content: string }> = [
		{
			path: assetsPath("jiscribe.schema.json"),
			content: `${JSON.stringify(generateSchema(manifest), null, "\t")}\n`,
		},
		...guideOutputs,
		{
			path: aiToolsSrcPath("prompt/generatedCanvasPrompt.ts"),
			content: generateCanvasPromptModule(canvasPrompt),
		},
		// The same text as assets/authoring-json.md, reused rather than composed a
		// second time: two builds of one document could disagree.
		{
			path: claudePluginPath("skills/jiscribe/references/authoring-json.md"),
			content: findGuide(authoringJsonPath),
		},
	];

	for (const output of outputs) {
		output.content = await formatFor(output.path, output.content);
	}

	if (checkOnly) {
		const stale = outputs.filter(
			(output) => readFileSync(output.path, "utf8") !== output.content,
		);
		if (stale.length > 0) {
			console.error(
				"❌ The generated files have drifted from the shape manifest. Run pnpm generate:schema and commit the result:",
			);
			for (const output of stale) {
				console.error(`  - ${output.path}`);
			}
			process.exit(1);
		}
		console.log("✅ The schema and AI documentation match the manifest");
		return;
	}

	for (const output of outputs) {
		writeFileSync(output.path, output.content);
		console.log(`generated: ${output.path}`);
	}
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
