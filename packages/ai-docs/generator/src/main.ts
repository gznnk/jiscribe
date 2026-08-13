import { readFileSync, writeFileSync } from "node:fs";

import prettier from "prettier";

import { generateGuide } from "./generateGuide";
import { generateReference } from "./generateReference";
import { generateSchema } from "./generateSchema";
import { loadManifest } from "./manifest";
import { assetsPath } from "./paths";

/**
 * Generate the three files under assets/ (jiscribe.schema.json /
 * ai-guide.md / reference.md) from the shape manifest. With `--check` nothing is
 * written; the output is compared against the committed content instead (drift
 * detection, run by CI).
 */
async function main(): Promise<void> {
	const checkOnly = process.argv.includes("--check");
	const manifest = loadManifest();

	const schemaPath = assetsPath("jiscribe.schema.json");
	const guidePath = assetsPath("ai-guide.md");
	const referencePath = assetsPath("reference.md");

	const outputs: Array<{ path: string; content: string }> = [
		{
			path: schemaPath,
			content: `${JSON.stringify(generateSchema(manifest), null, "\t")}\n`,
		},
		{
			path: guidePath,
			content: generateGuide(readFileSync(guidePath, "utf8"), manifest),
		},
		{
			path: referencePath,
			content: generateReference(readFileSync(referencePath, "utf8"), manifest),
		},
	];

	for (const output of outputs) {
		const config = (await prettier.resolveConfig(output.path)) ?? {};
		output.content = await prettier.format(output.content, {
			...config,
			filepath: output.path,
		});
	}

	if (checkOnly) {
		const stale = outputs.filter(
			(output) => readFileSync(output.path, "utf8") !== output.content,
		);
		if (stale.length > 0) {
			console.error(
				"❌ The generated files have drifted from the shape manifest. Run pnpm generate:ai and commit the result:",
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
