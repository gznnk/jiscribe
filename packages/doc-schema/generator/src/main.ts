import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

import prettier from "prettier";

import { generateCanvasPromptModule } from "./generateCanvasPromptModule";
import { loadGuideParts } from "./generateParts";
import { generateSchema } from "./generateSchema";
import { loadManifest } from "./manifest";
import { aiToolsSrcPath, assetsPath, templatePath } from "./paths";

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
 * Short digest naming one generation of the guides, stamped into all three so a
 * copy can be told apart from another copy.
 *
 * The same guides reach a reader through channels that pin their versions
 * independently — the VSCode extension writes .jiscribe/ai-guide.md at its own
 * release, jiscribe-mcp serves them at the npm package's — and nothing else
 * would say which generation a copy came from. Derived from the content rather
 * than from a version or a commit, so regenerating an unchanged tree keeps the
 * same stamp and `--check` stays a drift test.
 *
 * @param documents every composed guide, unstamped, in a fixed order
 * @returns the first 8 hex characters of the SHA-256 over them
 */
function guideStamp(documents: readonly string[]): string {
	return createHash("sha256")
		.update(documents.join("\u0000"))
		.digest("hex")
		.slice(0, 8);
}

/** Prefix a guide with the generation stamp, as a comment markdown does not render. */
function stampGuide(stamp: string, document: string): string {
	return `<!-- jiscribe guide ${stamp} -->\n\n${document}`;
}

/**
 * Generate everything derived from the shape manifest and the guide parts: the
 * JSON schema, the three composed guides (ai-guide.md for a reader writing JSON
 * by hand, canvas-prompt.md for one holding the canvas tools, authoring-json.md
 * for the file format alone) and the TypeScript module @jiscribe/ai-tools ships
 * the canvas prompt as. With `--check` nothing is
 * written; the output is compared against the committed content instead (drift
 * detection, run by CI).
 */
async function main(): Promise<void> {
	const checkOnly = process.argv.includes("--check");
	const manifest = loadManifest();
	const parts = loadGuideParts(manifest);

	const canvasPromptPath = assetsPath("canvas-prompt.md");

	// Every guide, composed but not yet stamped. The stamp is taken over all of
	// them at once, so listing a guide here is what puts it into the stamp — one
	// appended straight to `outputs` instead would leave the stamp unmoved when
	// its text changes, and a copy of it could then never be told apart.
	const guides = [
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
			path: assetsPath("authoring-json.md"),
			body: composeDocument([
				readFileSync(templatePath("authoringJsonIntro.md"), "utf8"),
				parts.authoringJson,
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
			content: await formatFor(guide.path, stampGuide(stamp, guide.body)),
		})),
	);
	const canvasPrompt = guideOutputs.find(
		(output) => output.path === canvasPromptPath,
	)!.content;

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
