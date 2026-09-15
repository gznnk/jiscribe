// Generates src/schema/icon/iconData.generated.ts from an unpacked AWS
// Architecture Icons asset package. The output is committed, so this script is
// the only thing that ever reads the zip.
//
//   pnpm --filter @jiscribe/plugin-aws-shapes generate:icons -- <unpacked directory>
//
// The output is unformatted (prettier is not pinned in this package). Run
// `pnpm format` from the repository root afterwards.
//
// What is taken: every Group icon, every 48px Service icon, every Resource icon
// (General included). Category-Icons are branding, not diagram parts.
//
// Nothing here changes what is drawn. The drawings are AWS's and are
// redistributed unmodified (LICENSE-ICONS.md): no coordinate is rounded and no
// fill is substituted. Only the embedding is adjusted — `<title>`, `xmlns` and
// clipPaths that clip the whole viewBox (no-ops) are dropped, ids are rewritten
// to ones that stay unique once several icons share a document, and attribute
// names carry React's spelling.
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** Where the assets came from, recorded in the generated header. Changes each quarter. */
const SOURCE_ZIP_URL =
	"https://d1.awsstatic.com/onedam/marketing-channels/website/public/shared/architecture-icon-release/Icon-package_07312026.5846e92413caa21490223536cc97f1269e44fa92.zip";

/** Asset release, matching the MMDDYYYY suffix of the unpacked directory names. */
const ASSET_RELEASE = "07312026";

/**
 * Attributes dropped as embedding noise. `id` would collide once several icons
 * are drawn in one document, so the only ones that survive are rewritten by
 * {@link planClipPathIds}; `clip-rule` is inert here (no clipPath in the set
 * holds a path); `xmlns` belongs to the `<svg>` element that is not kept.
 */
const DROPPED_ATTRIBUTES = new Set(["id", "clip-rule", "xmlns", "xmlns:xlink"]);

/** The only character a kebab-case name segment joins words with. */
const NAME_SEPARATOR = "-";

const TAG_PATTERN =
	/<(\/?)([A-Za-z][\w:-]*)((?:\s+[\w:.-]+\s*=\s*"[^"]*")*)\s*(\/?)>/g;
const ATTRIBUTE_PATTERN = /([\w:.-]+)\s*=\s*"([^"]*)"/g;

/** Walks a directory tree and returns the path of every file under it. */
const listFiles = (dir) =>
	readdirSync(dir).flatMap((entry) => {
		const path = join(dir, entry);
		return statSync(path).isDirectory() ? listFiles(path) : [path];
	});

/**
 * Lowercases one name segment into kebab-case. Punctuation (`.NET`) collapses
 * into the separator, and runs of separators collapse into one.
 */
const toKebab = (segment) =>
	segment
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, NAME_SEPARATOR)
		.replace(/^-+|-+$/g, "");

/**
 * Strips the `Arch_` / `Res_` prefix and then every trailing size and
 * light/dark marker from a file stem, whichever order the asset package put
 * them in (`User_48_Light` and `AWS-Marketplace_Light_48` both occur).
 */
const stripFileDecorations = (stem) => {
	let stripped = stem.replace(/^(Arch|Res)_/, "");
	for (;;) {
		const shorter = stripped.replace(/_(16|32|48|64|Light|Dark)$/, "");
		if (shorter === stripped) {
			return stripped;
		}
		stripped = shorter;
	}
};

/** Which of the two renditions a file holds. */
const readVariant = (filePath) =>
	filePath.includes("_Dark") ? "dark" : "light";

/** Display label. `-` opens into a space, `_` into ` / `. */
const toLabel = (stem) =>
	stem
		.split("_")
		.map((segment) => segment.replaceAll(NAME_SEPARATOR, " "))
		.join(" / ");

/** Category name, from a directory name minus its `Arch_` / `Res_` prefix. */
const toCategory = (directoryName) =>
	directoryName.replace(/^(Arch|Res)_/, "").replaceAll(NAME_SEPARATOR, " ");

/**
 * Reads an SVG into an element tree. The assets hold only `<rect>` / `<path>` /
 * `<polygon>` / `<g>` and a handful of `<defs><clipPath>`, and the sole text
 * node is inside `<title>`, so scanning tags alone rebuilds the tree.
 */
const parseSvgTree = (source, filePath) => {
	const root = { tag: "#root", attrs: {}, children: [] };
	const stack = [root];
	for (const match of source.matchAll(TAG_PATTERN)) {
		const [, closing, tag, attributeSource, selfClosing] = match;
		if (tag === "svg") {
			continue;
		}
		if (closing === "/") {
			const open = stack.pop();
			if (open === undefined || open.tag !== tag) {
				throw new Error(
					`${filePath}: </${tag}> does not close its opening tag`,
				);
			}
			continue;
		}
		const attrs = {};
		for (const [, name, value] of attributeSource.matchAll(ATTRIBUTE_PATTERN)) {
			attrs[name] = value;
		}
		const element = { tag, attrs, children: [] };
		stack[stack.length - 1].children.push(element);
		if (selfClosing !== "/") {
			stack.push(element);
		}
	}
	if (stack.length !== 1) {
		throw new Error(`${filePath}: an element is left unclosed`);
	}
	return root;
};

/** Every element of a tree, parents before children. */
const walkElements = function* (element) {
	for (const child of element.children) {
		yield child;
		yield* walkElements(child);
	}
};

/**
 * Whether a clipPath clips nothing at all: one untransformed rect over the whole
 * viewBox. Those are Figma's artboard bounds and can go; anything else clips for
 * real and is kept, or the picture would change. An empty clipPath is the
 * opposite of a no-op (it hides everything it is applied to), so it is kept too.
 */
const isFullViewBoxClip = (element, viewBoxSize) =>
	element.children.length > 0 &&
	element.children.every((child) => {
		const { x = "0", y = "0", width, height, transform } = child.attrs;
		return (
			child.tag === "rect" &&
			transform === undefined &&
			Number(x) === 0 &&
			Number(y) === 0 &&
			Number(width) === viewBoxSize.width &&
			Number(height) === viewBoxSize.height
		);
	});

/**
 * Decides what becomes of every clipPath in one file: absent from the map means
 * it clips nothing and is dropped, present means it is kept under the id given,
 * which carries the icon's own name so two icons in one document cannot collide.
 */
const planClipPathIds = (root, viewBoxSize, name) => {
	const idByOldId = new Map();
	for (const element of walkElements(root)) {
		if (element.tag !== "clipPath" || isFullViewBoxClip(element, viewBoxSize)) {
			continue;
		}
		idByOldId.set(
			element.attrs.id,
			`aws-${name.replaceAll("/", "-")}-clip-${idByOldId.size}`,
		);
	}
	return idByOldId;
};

/** Rewrites an attribute name into React's spelling (`fill-rule` → `fillRule`). */
const toReactAttributeName = (name) =>
	name.replace(/-([a-z])/g, (_match, letter) => letter.toUpperCase());

/**
 * Rewrites a `clip-path` value onto the kept id, or answers undefined when it
 * names a clipPath that was dropped (the attribute goes with it).
 */
const remapClipPathValue = (value, context) => {
	const oldId = /^url\(#([^)]+)\)$/.exec(value)?.[1];
	const newId =
		oldId === undefined ? undefined : context.clipPathIds.get(oldId);
	return newId === undefined ? undefined : `url(#${newId})`;
};

/**
 * Flattens an element tree into the output node list: drops what the header
 * lists, lifts a `<defs>`'s surviving clipPaths into its parent (a clipPath
 * draws nothing wherever it sits), and lifts the children of a `<g>` left with
 * no attributes (an empty group draws nothing either).
 */
const buildNodes = (element, context) =>
	element.children.flatMap((child) => {
		if (child.tag === "title") {
			return [];
		}
		if (child.tag === "defs") {
			const foreign = child.children.find((node) => node.tag !== "clipPath");
			if (foreign !== undefined) {
				throw new Error(
					`${context.filePath}: <defs> holds a <${foreign.tag}>, which lifting it out would strand`,
				);
			}
			return buildNodes(child, context);
		}
		if (child.tag === "clipPath") {
			const id = context.clipPathIds.get(child.attrs.id);
			return id === undefined
				? []
				: [["clipPath", { id }, buildNodes(child, context)]];
		}
		const attrs = {};
		for (const [name, value] of Object.entries(child.attrs)) {
			if (DROPPED_ATTRIBUTES.has(name)) {
				continue;
			}
			if (name === "clip-path") {
				const remapped = remapClipPathValue(value, context);
				if (remapped !== undefined) {
					attrs.clipPath = remapped;
				}
				continue;
			}
			attrs[toReactAttributeName(name)] = value;
		}
		const children = buildNodes(child, context);
		if (child.tag === "g" && Object.keys(attrs).length === 0) {
			return children;
		}
		return [
			children.length === 0 ? [child.tag, attrs] : [child.tag, attrs, children],
		];
	});

/**
 * Reads one file into its viewBox and its drawing.
 *
 * @param filePath - the .svg to read
 * @param name - the entry's layer-prefixed name, which any surviving clipPath id
 *   is built from
 */
const readDrawing = (filePath, name) => {
	const source = readFileSync(filePath, "utf8");
	const viewBox = /viewBox="([^"]+)"/.exec(source)?.[1];
	if (viewBox === undefined) {
		throw new Error(`${filePath}: no viewBox`);
	}
	const [, , width, height] = viewBox.split(/\s+/).map(Number);
	const viewBoxSize = { width, height };
	const root = parseSvgTree(source, filePath);
	const nodes = buildNodes(root, {
		filePath,
		clipPathIds: planClipPathIds(root, viewBoxSize, name),
	});
	return { viewBox, nodes };
};

/** Group icons (`group/<stem>`). */
const collectGroupFiles = (root) =>
	listFiles(join(root, `Architecture-Group-Icons_${ASSET_RELEASE}`))
		.filter((path) => path.endsWith(".svg"))
		.map((path) => {
			const stem = stripFileDecorations(
				path
					.split("/")
					.pop()
					.replace(/\.svg$/, ""),
			);
			return {
				path,
				name: `group/${toKebab(stem)}`,
				label: toLabel(stem),
				category: "Group",
				tier: "group",
			};
		});

/** Service icons (`service/<stem>`). Only the 48px size is taken. */
const collectServiceFiles = (root) =>
	listFiles(join(root, `Architecture-Service-Icons_${ASSET_RELEASE}`))
		.filter((path) => path.endsWith(".svg") && path.includes("/48/"))
		.map((path) => {
			const segments = path.split("/");
			const stem = stripFileDecorations(
				segments[segments.length - 1].replace(/\.svg$/, ""),
			);
			return {
				path,
				name: `service/${toKebab(stem)}`,
				label: toLabel(stem),
				category: toCategory(segments[segments.length - 3]),
				tier: "service",
			};
		});

/**
 * Resource icons. The `_` of a stem opens into `/`, giving
 * `resource/<service>/<resource>`. General icons sit in a layer of their own
 * (`general/<stem>`) and are the one place a whole directory of Light / Dark
 * pairs lives.
 */
const collectResourceFiles = (root) =>
	listFiles(join(root, `Resource-Icons_${ASSET_RELEASE}`))
		.filter((path) => path.endsWith(".svg"))
		.map((path) => {
			const segments = path.split("/");
			const stem = stripFileDecorations(
				segments[segments.length - 1].replace(/\.svg$/, ""),
			);
			const isGeneral = path.includes("Res_General-Icons");
			return {
				path,
				name: isGeneral
					? `general/${toKebab(stem)}`
					: `resource/${stem.split("_").map(toKebab).join("/")}`,
				label: toLabel(stem),
				category: isGeneral
					? "General"
					: toCategory(segments[segments.length - 2]),
				tier: isGeneral ? "general" : "resource",
			};
		});

/**
 * Folds the files into one entry per name, pairing a Light file with its Dark
 * counterpart. AWS files the same service under two categories now and then
 * (Compute Optimizer, Kinesis Video Streams) with different background colours,
 * so the first file in path order settles which category the name carries; the
 * rest are reported and dropped.
 */
const collectEntries = (files) => {
	const entries = new Map();
	const dropped = [];
	for (const file of files) {
		const variant = readVariant(file.path);
		const existing = entries.get(file.name);
		if (existing === undefined) {
			entries.set(file.name, {
				name: file.name,
				label: file.label,
				category: file.category,
				tier: file.tier,
				[variant]: readDrawing(file.path, file.name),
			});
			continue;
		}
		if (existing[variant] !== undefined) {
			dropped.push(file);
			continue;
		}
		existing[variant] = readDrawing(file.path, file.name);
	}

	for (const entry of entries.values()) {
		if (entry.light === undefined) {
			throw new Error(`${entry.name}: a Dark file with no Light counterpart`);
		}
		if (
			entry.dark !== undefined &&
			entry.dark.viewBox !== entry.light.viewBox
		) {
			throw new Error(
				`${entry.name}: the Light and Dark renditions disagree on the viewBox`,
			);
		}
	}
	return { entries: [...entries.values()], dropped };
};

const formatNodes = (nodes, indent) => {
	const pad = "\t".repeat(indent);
	return nodes
		.map((node) => {
			const [tag, attrs, children] = node;
			const entries = Object.entries(attrs)
				.map(([name, value]) => `${name}: ${JSON.stringify(value)}`)
				.join(", ");
			const head = `${pad}[${JSON.stringify(tag)}, { ${entries} }`;
			return children === undefined
				? `${head}],`
				: `${head}, [\n${formatNodes(children, indent + 1)}\n${pad}]],`;
		})
		.join("\n");
};

const formatEntry = (entry) =>
	[
		`\t${JSON.stringify(entry.name)}: {`,
		`\t\tviewBox: ${JSON.stringify(entry.light.viewBox)},`,
		`\t\tlabel: ${JSON.stringify(entry.label)},`,
		`\t\tcategory: ${JSON.stringify(entry.category)},`,
		`\t\ttier: ${JSON.stringify(entry.tier)},`,
		`\t\tnodes: [`,
		formatNodes(entry.light.nodes, 3),
		`\t\t],`,
		...(entry.dark === undefined
			? []
			: [`\t\tdarkNodes: [`, formatNodes(entry.dark.nodes, 3), `\t\t],`]),
		`\t},`,
	].join("\n");

const formatModule = (
	entries,
) => `// Generated by scripts/generateIconData.mjs from the AWS Architecture Icons
// asset package (${ASSET_RELEASE}). Do not edit by hand; re-run the script to bump the set.
//
// Source: ${SOURCE_ZIP_URL}
// The drawings are AWS Architecture Icons, (c) Amazon Web Services, Inc. or its
// affiliates, used under AWS's terms (https://aws.amazon.com/architecture/icons/)
// and redistributed unmodified — see LICENSE-ICONS.md. No coordinate is rounded
// and no fill is substituted; only <title>, id, xmlns and full-viewBox clipPath
// no-ops are dropped, and attribute names carry React's spelling.
import type { AwsIconEntry } from "./AwsIconNode";

/** Where the assets came from. The release changes each quarter, and so does this. */
export const AWS_ICON_SOURCE_URL = ${JSON.stringify(SOURCE_ZIP_URL)};

/** Asset release (the MMDDYYYY the asset package's directory names carry). */
export const AWS_ICON_RELEASE = ${JSON.stringify(ASSET_RELEASE)};

/** Every icon, keyed by its layer-prefixed name. */
export const AWS_ICON_ENTRIES: Readonly<Record<string, AwsIconEntry>> = {
${entries.map(formatEntry).join("\n")}
};
`;

const main = () => {
	const root = process.argv[2];
	if (root === undefined) {
		throw new Error("pass the directory the asset package was unpacked into");
	}
	const outputPath =
		process.argv[3] ??
		join(
			dirname(fileURLToPath(import.meta.url)),
			"..",
			"src",
			"schema",
			"icon",
			"iconData.generated.ts",
		);

	const files = [
		...collectGroupFiles(root),
		...collectServiceFiles(root),
		...collectResourceFiles(root),
	].sort(
		(left, right) =>
			left.name.localeCompare(right.name) ||
			left.path.localeCompare(right.path),
	);
	const { entries, dropped } = collectEntries(files);

	writeFileSync(outputPath, formatModule(entries), "utf8");
	const paired = entries.filter((entry) => entry.dark !== undefined).length;
	console.log(
		`${entries.length} icons (${paired} with a Dark rendition) → ${outputPath}`,
	);
	for (const file of dropped) {
		console.log(`  dropped a duplicate: ${file.name} (${file.category})`);
	}
};

main();
