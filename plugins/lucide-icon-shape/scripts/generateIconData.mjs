// Generates src/schema/icon/iconData.generated.ts from the `lucide` devDependency, and
// src/schema/icon/iconCategories.generated.ts from lucide's GitHub repository at the tag
// of that same version (the npm packages carry no categories). Run it after changing
// that dependency's version; the output is committed, so nothing but this script ever
// reads the icon set.
//
//   pnpm --filter @jiscribe/plugin-lucide-icon-shape generate:icons
//   pnpm --filter @jiscribe/plugin-lucide-icon-shape generate:icons -- --source <absolute dir>
//
// Without `--source` the tag is downloaded from codeload.github.com, so the network has
// to be reachable. `--source` names a checkout or unpacked archive of that tag instead
// (the directory holding `icons/` and `categories/`), and nothing is downloaded.
//
// Nothing is written until both modules are built and checked, so a failure never leaves
// one of them on a newer version than the other.
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
import { execFile } from "node:child_process";
import {
	mkdir,
	mkdtemp,
	readdir,
	readFile,
	rm,
	writeFile,
} from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs, promisify } from "node:util";

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

/** Reads `--source <dir>`; pnpm may pass the `--` that separates script arguments through. */
const readSourceOption = () => {
	const { values } = parseArgs({
		args: process.argv.slice(2).filter((arg) => arg !== "--"),
		options: { source: { type: "string" } },
	});
	return values.source;
};

/**
 * Downloads lucide's repository at the tag `version` and unpacks all of it into `tempDir`.
 * Unpacked whole: selecting members by pattern takes different arguments in GNU tar and
 * bsdtar.
 *
 * @returns The repository root, the archive's single top-level directory.
 */
const downloadLucideSource = async (version, tempDir) => {
	const url = `https://codeload.github.com/lucide-icons/lucide/tar.gz/refs/tags/${version}`;
	let response;
	try {
		response = await fetch(url);
	} catch (error) {
		throw new Error(
			`cannot reach ${url} (${error.cause?.message ?? error.message}); pass --source <dir> with lucide ${version} unpacked into it`,
			{ cause: error },
		);
	}
	if (!response.ok) {
		throw new Error(
			response.status === 404
				? `lucide has no tag "${version}" on GitHub (${url} answered 404)`
				: `downloading ${url} failed with HTTP ${response.status}`,
		);
	}

	const archivePath = join(tempDir, "lucide.tar.gz");
	await writeFile(archivePath, Buffer.from(await response.arrayBuffer()));
	const unpackDir = join(tempDir, "unpacked");
	await mkdir(unpackDir);
	await promisify(execFile)("tar", ["-xzf", archivePath, "-C", unpackDir]);

	const entries = await readdir(unpackDir, { withFileTypes: true });
	if (entries.length !== 1 || !entries[0].isDirectory()) {
		throw new Error(
			`expected one top-level directory in ${url}, found ${entries.map((entry) => entry.name).join(", ")}`,
		);
	}
	return join(unpackDir, entries[0].name);
};

const readJsonFiles = async (dir) => {
	let fileNames;
	try {
		fileNames = (await readdir(dir)).filter((fileName) =>
			fileName.endsWith(".json"),
		);
	} catch (error) {
		throw new Error(`cannot read ${dir}; is it a lucide checkout?`, {
			cause: error,
		});
	}
	return Promise.all(
		fileNames.map(async (fileName) => ({
			name: fileName.slice(0, -".json".length),
			content: JSON.parse(await readFile(join(dir, fileName), "utf8")),
		})),
	);
};

/**
 * Reads the categories and every icon's membership out of a lucide checkout, and checks
 * them against the icons `lucide` itself ships (`iconNames`): the same names on both
 * sides, every category an icon names declared, every icon in a category and every
 * category holding an icon.
 *
 * @returns Category id → title, and category id → icon names sorted by plain `sort()`.
 */
const collectCategories = async (sourceRoot, iconNames) => {
	const categoryFiles = await readJsonFiles(join(sourceRoot, "categories"));
	const iconFiles = await readJsonFiles(join(sourceRoot, "icons"));

	const titles = new Map();
	for (const { name, content } of categoryFiles) {
		if (typeof content.title !== "string") {
			throw new Error(`categories/${name}.json has no title`);
		}
		titles.set(name, content.title);
	}

	const sourceNames = new Set(iconFiles.map(({ name }) => name));
	const onlyInSource = [...sourceNames].filter((name) => !iconNames.has(name));
	const onlyInPackage = [...iconNames].filter((name) => !sourceNames.has(name));
	if (onlyInSource.length > 0 || onlyInPackage.length > 0) {
		throw new Error(
			`the repository's icons/ and the lucide package disagree; only in icons/: [${onlyInSource.join(", ")}], only in the package: [${onlyInPackage.join(", ")}]`,
		);
	}

	const namesByCategory = new Map(
		[...titles.keys()].map((categoryId) => [categoryId, []]),
	);
	for (const { name, content } of iconFiles) {
		const categoryIds = content.categories;
		if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
			throw new Error(`icons/${name}.json belongs to no category`);
		}
		for (const categoryId of categoryIds) {
			const names = namesByCategory.get(categoryId);
			if (names === undefined) {
				throw new Error(
					`icons/${name}.json names category "${categoryId}", which categories/ does not declare`,
				);
			}
			names.push(name);
		}
	}
	for (const [categoryId, names] of namesByCategory) {
		if (names.length === 0) {
			throw new Error(`category "${categoryId}" holds no icon`);
		}
		names.sort();
	}

	return { titles, namesByCategory };
};

const formatCategoryModule = ({ titles, namesByCategory }, version) => {
	const categoryIds = [...titles.keys()].sort();
	const unionMembers = categoryIds
		.map((categoryId) => `\t| ${JSON.stringify(categoryId)}`)
		.join("\n");
	const titleEntries = categoryIds
		.map(
			(categoryId) =>
				`\t${JSON.stringify(categoryId)}: ${JSON.stringify(titles.get(categoryId))},`,
		)
		.join("\n");
	const nameEntries = categoryIds
		.map(
			(categoryId) =>
				`\t${JSON.stringify(categoryId)}: [\n${namesByCategory
					.get(categoryId)
					.map((name) => `\t\t${JSON.stringify(name)},`)
					.join("\n")}\n\t],`,
		)
		.join("\n");

	return `// Generated by scripts/generateIconData.mjs from lucide ${version} (ISC).
// Do not edit by hand; re-run the script to bump the icon set.

/** Id of one of lucide's own icon categories (\`categories/<id>.json\` in its repository). */
export type IconCategoryId =
${unionMembers};

/** English title of every category, as lucide names it. */
export const ICON_CATEGORY_TITLES: Readonly<Record<IconCategoryId, string>> = {
${titleEntries}
};

/**
 * Current icon names in every category, sorted by code unit. An icon belongs to one
 * category or more, and is listed under each.
 */
export const ICON_NAMES_BY_CATEGORY: Readonly<
	Record<IconCategoryId, readonly string[]>
> = {
${nameEntries}
};

/**
 * The lucide release the categories above were taken from. A test pins this to
 * \`LUCIDE_VERSION\`, so regenerating one module without the other fails.
 */
export const LUCIDE_CATEGORIES_VERSION = ${JSON.stringify(version)};
`;
};

const main = async () => {
	const sourceOption = readSourceOption();
	const lucide = resolveLucide();
	const { version } = JSON.parse(
		await readFile(lucide.packageJsonPath, "utf8"),
	);
	const collected = await collectIcons(lucide);
	const iconNames = new Set(collected.nodesByName.keys());

	let categories;
	if (sourceOption === undefined) {
		const tempDir = await mkdtemp(join(tmpdir(), "lucide-categories-"));
		try {
			const sourceRoot = await downloadLucideSource(version, tempDir);
			categories = await collectCategories(sourceRoot, iconNames);
		} finally {
			await rm(tempDir, { recursive: true, force: true });
		}
	} else {
		categories = await collectCategories(sourceOption, iconNames);
	}

	const outputDir = join(
		dirname(fileURLToPath(import.meta.url)),
		"..",
		"src",
		"schema",
		"icon",
	);
	const iconDataPath = join(outputDir, "iconData.generated.ts");
	const categoriesPath = join(outputDir, "iconCategories.generated.ts");
	const iconDataModule = formatModule(collected, version);
	const categoriesModule = formatCategoryModule(categories, version);
	await writeFile(iconDataPath, iconDataModule, "utf8");
	await writeFile(categoriesPath, categoriesModule, "utf8");

	console.log(
		`lucide ${version}: ${collected.nodesByName.size} icons, ${collected.aliases.size} superseded names → ${iconDataPath}`,
	);
	console.log(
		`lucide ${version}: ${categories.titles.size} categories → ${categoriesPath}`,
	);
};

await main();
