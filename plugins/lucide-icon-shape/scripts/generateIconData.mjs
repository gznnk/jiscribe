// Generates src/schema/icon/iconData.generated.ts from the `lucide` devDependency.
// Run it after changing that dependency's version; the output is committed, so nothing
// but this script ever reads the icon set.
//
//   pnpm --filter @jiscribe/plugin-lucide-icon-shape generate:icons
//
// The output is not formatted here (that would mean pinning prettier in this package as
// well), so run `pnpm format` from the repository root afterwards.
//
// Everything comes out of `lucide`'s `iconsAndAliases` barrel, whose every line names one
// icon file and every name that file answers to:
//
//   export { default as AlarmCheck, default as AlarmClockCheck } from './icons/alarm-clock-check.mjs';
//
// The file name is the icon's current name. An exported name that spells that same name
// (casing and separators aside) is just its PascalCase form; any other is a superseded
// name, and mapping those back is what lets a name learned from an older lucide still
// resolve.
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ENTRY_PATTERN = /export \{([^}]*)\} from '\.\/icons\/([a-z0-9-]+)\.mjs'/g;
const EXPORT_NAME_PATTERN = /default as (\w+)/g;

/** Collapses a name to letters and digits, so spellings of one name compare equal. */
const toComparable = (name) => name.toLowerCase().replaceAll("-", "");

/**
 * Rewrites an exported PascalCase name as the kebab-case name it was known by.
 *
 * A trailing run of digits was a word of its own ("Edit2" was `edit-2`), which is how
 * most of the superseded names are spelled. Digits anywhere else cannot be placed this
 * way ("Grid2x2" is `grid-2x2`, not `grid-2x-2`), so those throw rather than guess —
 * they only ever occur in a name that spells its own icon, which is filtered out before
 * reaching here.
 *
 * Not to be confused with the runtime's `normalizeIconName`, which rewrites the same
 * casing but deliberately leaves every digit where it is: it rewrites names a caller
 * wrote, and `grid-2x2` is one of them.
 */
const pascalToKebab = (name) => {
	if (/\d/.test(name) && !/^\D+\d+$/.test(name)) {
		throw new Error(
			`cannot spell "${name}" as kebab-case: its digits are not a trailing run`,
		);
	}
	return name
		.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
		.replace(/^-/, "")
		.replace(/([a-z])(\d+)$/, "$1-$2");
};

/** Locates the installed `lucide`, which is a devDependency of this package alone. */
const resolveLucide = () => {
	const require = createRequire(import.meta.url);
	const packageJsonPath = require.resolve("lucide/package.json");
	return {
		packageJsonPath,
		barrelPath: join(
			dirname(packageJsonPath),
			"dist",
			"esm",
			"iconsAndAliases.mjs",
		),
	};
};

/**
 * Splits the barrel into the icons and the superseded names pointing at them. The
 * drawings come from importing the barrel, so no icon file is read or parsed.
 */
const collectIcons = async ({ barrelPath }) => {
	const barrelSource = await readFile(barrelPath, "utf8");
	const drawingByExportName = await import(pathToFileURL(barrelPath).href);

	const nodesByName = new Map();
	const aliases = new Map();

	for (const [, exportList, name] of barrelSource.matchAll(ENTRY_PATTERN)) {
		const exportNames = [...exportList.matchAll(EXPORT_NAME_PATTERN)].map(
			([, exportName]) => exportName,
		);
		const ownName = exportNames.find(
			(exportName) => toComparable(exportName) === toComparable(name),
		);
		if (ownName === undefined) {
			throw new Error(
				`no export of ./icons/${name}.mjs spells its own name (${exportNames.join(", ")})`,
			);
		}
		const drawing = drawingByExportName[ownName];
		if (!Array.isArray(drawing)) {
			throw new Error(`export "${ownName}" is not an icon drawing`);
		}
		nodesByName.set(name, drawing);

		for (const exportName of exportNames) {
			if (toComparable(exportName) === toComparable(name)) {
				continue;
			}
			aliases.set(pascalToKebab(exportName), name);
		}
	}

	for (const [alias, target] of aliases) {
		// A name that became an icon of its own is not a superseded name any more.
		if (nodesByName.has(alias)) {
			aliases.delete(alias);
			continue;
		}
		if (!nodesByName.has(target)) {
			throw new Error(`alias "${alias}" points at unknown icon "${target}"`);
		}
	}

	return { nodesByName, aliases };
};

const formatNodes = (nodes) =>
	nodes
		.map(([tag, attrs]) => {
			const entries = Object.entries(attrs)
				.map(([attrName, value]) => `${attrName}: ${JSON.stringify(value)}`)
				.join(", ");
			return `\t\t[${JSON.stringify(tag)}, { ${entries} }],`;
		})
		.join("\n");

const formatModule = ({ nodesByName, aliases }, version) => {
	const nodeEntries = [...nodesByName.keys()]
		.sort()
		.map(
			(name) =>
				`\t${JSON.stringify(name)}: [\n${formatNodes(nodesByName.get(name))}\n\t],`,
		)
		.join("\n");
	const aliasEntries = [...aliases.keys()]
		.sort()
		.map(
			(alias) =>
				`\t${JSON.stringify(alias)}: ${JSON.stringify(aliases.get(alias))},`,
		)
		.join("\n");

	return `// Generated by scripts/generateIconData.mjs from lucide ${version} (ISC).
// Do not edit by hand; re-run the script to bump the icon set.
import type { IconNode } from "./IconNode";

/** Drawing of every current icon name, keyed by that name. */
export const ICON_NODES: Readonly<Record<string, readonly IconNode[]>> = {
${nodeEntries}
};

/**
 * Superseded names mapped to the current one, as lucide's own deprecated exports
 * declare them (\`user-circle\` → \`circle-user\`, \`edit\` → \`square-pen\`). This is what
 * lets a name an AI learned from an older lucide still resolve.
 */
export const ICON_ALIASES: Readonly<Record<string, string>> = {
${aliasEntries}
};

/**
 * The \`lucide\` release the data above was taken from. A test pins this to the version
 * actually installed, so bumping the dependency without regenerating fails.
 */
export const LUCIDE_VERSION = ${JSON.stringify(version)};
`;
};

const main = async () => {
	const lucide = resolveLucide();
	const { version } = JSON.parse(
		await readFile(lucide.packageJsonPath, "utf8"),
	);
	const collected = await collectIcons(lucide);

	const outputPath = join(
		dirname(fileURLToPath(import.meta.url)),
		"..",
		"src",
		"schema",
		"icon",
		"iconData.generated.ts",
	);
	await writeFile(outputPath, formatModule(collected, version), "utf8");

	console.log(
		`lucide ${version}: ${collected.nodesByName.size} icons, ${collected.aliases.size} superseded names → ${outputPath}`,
	);
};

await main();
