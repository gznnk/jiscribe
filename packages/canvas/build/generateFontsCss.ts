/**
 * Writes `src/fonts.css` from the `@fontsource` stylesheets (`pnpm generate:fonts`,
 * checked for drift by `pnpm check:fonts`).
 *
 * The stylesheet used to be a list of `@import`s, which pulled in whatever the imported
 * file named — two sources per face, woff2 and woff, of which only the woff2 is ever
 * fetched. Every bundle carried the woff halves, 26 MB of them. Naming the faces here
 * instead means the file states only what is shipped, so no bundler has to undo
 * anything downstream and a host gets the woff2-only set by importing the stylesheet,
 * with nothing to configure.
 *
 * Dependencies whose stylesheets are not written here still carry their own legacy
 * sources — `katex/dist/katex.min.css` names woff and ttf beside each woff2, about
 * 0.8 MB per bundle. Accepted: it is not this generator's stylesheet to write.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

/**
 * Matches one `src:` declaration and captures its value. The value is bounded at `;` or
 * `}` rather than at a comma, so the commas inside a neighbouring `unicode-range` are
 * out of reach; a declaration spanning several lines is covered because the negated
 * class matches newlines too.
 */
const SRC_DECLARATION = /src:\s*([^;}]+)/g;

/** Splits an src value on its top-level commas, leaving the ones inside `url(...)` alone. */
const TOP_LEVEL_COMMA = /,(?![^(]*\))/;

/**
 * Matches the woff2 marker in a single src entry, either quote style. `woff2-variations`
 * counts: that is how a variable font names the same container (`@fontsource-variable`
 * writes it that way), and reading it as something else would keep a legacy sibling in
 * the generated stylesheet — the one outcome this generator exists to prevent.
 */
const WOFF2_FORMAT = /format\(\s*['"]woff2(?:-variations)?['"]\s*\)/;

/**
 * The rule, over the value of one `src` declaration: keep the woff2 entries and nothing
 * else.
 *
 * @param value Comma-separated src entries without the `src:` prefix.
 * @returns The kept entries joined by ", ", or null when there is nothing to drop — no woff2 among the entries, or nothing but woff2.
 */
function keepWoff2Entries(value: string): string | null {
	const entries = value.split(TOP_LEVEL_COMMA);
	const woff2Entries = entries.filter((entry) => WOFF2_FORMAT.test(entry));
	if (woff2Entries.length === 0 || woff2Entries.length === entries.length) {
		return null;
	}
	return woff2Entries.map((entry) => entry.trim()).join(", ");
}

/**
 * Drops every source but the woff2 from each `@font-face` src list in a stylesheet.
 *
 * A face whose list holds no woff2 at all is returned untouched, so a family shipping
 * woff or ttf only would keep working.
 *
 * @param css Stylesheet text, any syntax — minified included.
 * @returns The same text with the redundant src entries removed; identical to the input when no face declares both a woff2 and something else.
 */
export function dropLegacyFontSources(css: string): string {
	return css.replace(SRC_DECLARATION, (declaration, value: string) => {
		const kept = keepWoff2Entries(value);
		return kept === null ? declaration : `src: ${kept}`;
	});
}

/** One `@fontsource` package, and which of its stylesheets are taken. */
interface ShippedFontFamily {
	/** Package name; also the specifier every generated `url()` is written against, so the bundler resolves it rather than the emitting file's directory. */
	packageName: string;
	/** Upright weights to take, named the way `@fontsource` names its stylesheets (`400` for `400.css`). */
	weights: readonly number[];
	/** Weights whose drawn italic to take as well (`400-italic.css`); empty for a family that draws no italic. */
	italicWeights: readonly number[];
}

/** One entry of `CANVAS_FONT_FAMILIES`, and the packages that draw it. */
interface ShippedFontStack {
	/** The `CanvasFontFamilyId` this covers. */
	id: string;
	/** Why these packages sit together; written above the stack's faces in the generated stylesheet. */
	note: string;
	/** The packages drawing the stack, in the order the stack itself lists them: Latin first, JP behind it. */
	families: readonly ShippedFontFamily[];
}

/**
 * What `fonts.css` ships, and the only place that is decided.
 *
 * Weights are limited to the two `fontWeight` exposes (normal/bold) because a document
 * cannot ask for a third, and italics to the Latin faces, which are the ones with a
 * drawn italic — the JP faces are left to the browser's synthetic oblique. Anything
 * added here lands in every bundle that imports the stylesheet, at roughly 3 MB per JP
 * weight and 100 KB per Latin one.
 *
 * Two other places restate this list against a different host and have to be moved with
 * it: `apps/cli/preview/previewBridge.ts` asks Google Fonts for the same faces, and
 * `apps/mcp/build.mjs` stages the weights the Node text measurer can be asked for.
 */
const SHIPPED_FONT_STACKS: readonly ShippedFontStack[] = [
	{
		id: "sans",
		note: "Source Sans is the Latin that Source Han Sans (= Noto Sans JP) draws its own from",
		families: [
			{
				packageName: "@fontsource/source-sans-3",
				weights: [400, 700],
				italicWeights: [400, 700],
			},
			{
				packageName: "@fontsource/noto-sans-jp",
				weights: [400, 700],
				italicWeights: [],
			},
		],
	},
	{
		id: "serif",
		note: "the same pairing one step over: Source Serif and Source Han Serif",
		families: [
			{
				packageName: "@fontsource/source-serif-4",
				weights: [400, 700],
				italicWeights: [400, 700],
			},
			{
				packageName: "@fontsource/noto-serif-jp",
				weights: [400, 700],
				italicWeights: [],
			},
		],
	},
	{
		id: "mono",
		note: "Source Code Pro over the sans JP face; no JP monospace ships on this registry",
		families: [
			{
				packageName: "@fontsource/source-code-pro",
				weights: [400, 700],
				italicWeights: [400, 700],
			},
		],
	},
	{
		id: "hand",
		note: "Klee One's heaviest drawn weight is 600, which \"bold\" resolves to",
		families: [
			{
				packageName: "@fontsource/caveat",
				weights: [400, 700],
				italicWeights: [],
			},
			{
				packageName: "@fontsource/klee-one",
				weights: [400, 600],
				italicWeights: [],
			},
		],
	},
];

/** Header of the generated stylesheet, ahead of the first face. */
const GENERATED_HEADER = `/*
 * GENERATED FILE — do not edit. Run \`pnpm generate:fonts\` to rebuild it; CI fails
 * through \`pnpm check:fonts\` when it has drifted. Which faces are shipped is decided
 * in build/generateFontsCss.ts, and everything below is copied from the @fontsource
 * stylesheets that table names, with every src but the woff2 dropped.
 *
 * The faces behind CANVAS_FONT_FAMILIES, for hosts that want the fonts a doc names to
 * actually be present. Import once at the host's entry point:
 *
 *   import "@jiscribe/canvas/fonts.css";
 *
 * Optional, not required: every stack ends in a generic keyword, so a host that skips
 * this still draws. What it loses is agreement between viewers — a box derived from its
 * content is measured against the family the doc names, so a viewer falling back to a
 * different face gets a different box.
 *
 * Each face below is one weight split by unicode-range, so a page fetches only the
 * ranges it actually draws; the JP faces cost nothing until JP text is on screen.
 * Weights are limited to the two \`fontWeight\` exposes (normal/bold), and italics to the
 * Latin faces, which are the ones with a drawn italic — the JP faces are left to the
 * browser's synthetic oblique.
 */`;

/** Matches one `url(./files/<name>)` as `@fontsource` writes it, either quote style or none. */
const FONTSOURCE_FILE_URL = /url\(\s*['"]?\.\/files\/([^'")\s]+)['"]?\s*\)/g;

const require = createRequire(import.meta.url);

/** Absolute path of `src/fonts.css`, the one file this generator owns. */
const outputPath = fileURLToPath(new URL("../src/fonts.css", import.meta.url));

/**
 * The `@font-face` blocks of one `@fontsource` stylesheet, ready to be emitted from
 * inside this package.
 *
 * @param packageName The `@fontsource` package, used both to find the stylesheet and to write the `url()`s against.
 * @param styleSheetName File name within the package, without the directory (`400-italic.css`).
 * @returns The stylesheet's text with every legacy src dropped and every `url()` turned into a bare specifier; the per-subset comments and `unicode-range` values are carried over untouched.
 */
function readFontFaces(packageName: string, styleSheetName: string): string {
	const sourcePath = require.resolve(`${packageName}/${styleSheetName}`);
	const woff2Only = dropLegacyFontSources(readFileSync(sourcePath, "utf8"));
	return woff2Only
		.replace(
			FONTSOURCE_FILE_URL,
			(_match, fileName: string) => `url("${packageName}/files/${fileName}")`,
		)
		.trim();
}

/** The stylesheet names one family contributes, upright weights first. */
function listStyleSheetNames(family: ShippedFontFamily): string[] {
	return [
		...family.weights.map((weight) => `${weight}.css`),
		...family.italicWeights.map((weight) => `${weight}-italic.css`),
	];
}

/** The whole of `src/fonts.css`, header included, ending in a newline. */
function generateFontsCss(): string {
	const sections = [GENERATED_HEADER];
	for (const stack of SHIPPED_FONT_STACKS) {
		sections.push(`/* ${stack.id} — ${stack.note} */`);
		for (const family of stack.families) {
			for (const styleSheetName of listStyleSheetNames(family)) {
				sections.push(readFontFaces(family.packageName, styleSheetName));
			}
		}
	}
	return `${sections.join("\n\n")}\n`;
}

const generated = generateFontsCss();

if (process.argv.includes("--check")) {
	if (readFileSync(outputPath, "utf8") !== generated) {
		console.error(
			"❌ src/fonts.css has drifted from build/generateFontsCss.ts. Run pnpm generate:fonts and commit the result.",
		);
		process.exit(1);
	}
	console.log("✅ src/fonts.css matches the shipped face table");
} else {
	writeFileSync(outputPath, generated);
	const faceCount = generated.split("@font-face").length - 1;
	console.log(`generated: ${outputPath} (${faceCount} @font-face)`);
}
