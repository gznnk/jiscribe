/**
 * Keeping only the woff2 of each font face (`@jiscribe/canvas/build/woff2-only`).
 *
 * `@fontsource` and KaTeX name every face more than once, newest format first:
 * `src: url(...woff2) format('woff2'), url(...woff) format('woff')`. A bundler's asset
 * handling copies whatever a `url()` names, so all of them land in the output — 25 MB of
 * legacy woff for the shipped font set alone, none of it ever fetched, because every
 * browser these bundles run in has read woff2 since 2014.
 *
 * The rewrite has to happen before the bundler resolves those `url()`s, which is what
 * keeps the copies out: dropping them from the output afterwards would leave the emitted
 * CSS pointing at nothing. A face that offers no woff2 is left as it is, so a dependency
 * shipping only woff or ttf still resolves.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, posix, resolve, win32 } from "node:path";

import type { Plugin } from "vite";

/** Extensions of the formats a woff2 makes redundant. */
const LEGACY_FONT_EXTENSIONS = [".woff", ".ttf", ".otf", ".eot"];

/** Extensions of the emitted files that can still carry an `@font-face` src list. */
const STYLE_BEARING_EXTENSIONS = [".css", ".html"];

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
 * writes it that way), and reading it as something else would leave a legacy sibling in
 * place with nothing raised — the one outcome this module exists to prevent.
 */
const WOFF2_FORMAT = /format\(\s*['"]woff2(?:-variations)?['"]\s*\)/;

/** Matches the target of one `url(...)` in a src entry. */
const URL_TARGET = /url\(\s*['"]?([^'")]+)['"]?\s*\)/;

/**
 * The rule itself, over the value of one `src` declaration: keep the woff2 entries and
 * nothing else. Every entry point below goes through here, so there is one rule.
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
 * Text in, text out, for the bundlers that hand a stylesheet over as a string. A face
 * whose list holds no woff2 at all is returned untouched, so a dependency that ships
 * woff or ttf only keeps working.
 *
 * @param css Stylesheet text as the bundler is about to read it, before any `url()` has been rewritten to an output path. Any syntax is accepted, minified included.
 * @returns The same text with the redundant src entries removed; identical to the input when no face declares both a woff2 and something else.
 */
export function dropLegacyFontSources(css: string): string {
	return css.replace(SRC_DECLARATION, (declaration, value: string) => {
		const kept = keepWoff2Entries(value);
		return kept === null ? declaration : `src: ${kept}`;
	});
}

/**
 * Collects the legacy font files an output directory still names beside a woff2 of the
 * same face.
 *
 * The emitted stylesheets are what is read, not the file listing: an `@font-face` src
 * list states which files belong to one face, where the file names cannot (a bundler
 * inserts a content hash of its own into each, and the two formats of a face hash
 * differently).
 *
 * @param dir Absolute path of the directory a build has just written; walked recursively, and a missing directory yields an empty result rather than throwing.
 * @returns The file names — basenames, not paths — of the redundant sources, sorted and deduplicated. Empty when the rewrite did its work.
 */
export function findLegacyFontDuplicates(dir: string): string[] {
	const duplicates = new Set<string>();
	for (const filePath of listFilesRecursively(dir)) {
		if (!STYLE_BEARING_EXTENSIONS.some((one) => filePath.endsWith(one))) {
			continue;
		}
		for (const [, value] of readFileSync(filePath, "utf8").matchAll(
			SRC_DECLARATION,
		)) {
			const entries = value.split(TOP_LEVEL_COMMA);
			if (!entries.some((entry) => WOFF2_FORMAT.test(entry))) {
				continue;
			}
			for (const entry of entries) {
				const target = URL_TARGET.exec(entry)?.[1];
				if (target !== undefined && isLegacyFontTarget(target)) {
					duplicates.add(toFileName(target));
				}
			}
		}
	}
	return [...duplicates].sort();
}

/** The slice of postcss's `Root` the rule touches, so canvas takes no postcss dependency. */
interface PostcssRoot {
	walkDecls(
		prop: string,
		callback: (declaration: { value: string }) => void,
	): void;
}

/**
 * The rule as a postcss plugin. Vite is given this rather than a `transform` hook: the
 * shipped font set is a list of `@import`s, and postcss-import inlines those by reading
 * the files itself, so a stylesheet reaching `transform` is the list and not the faces.
 * Vite runs the configured plugins after that inlining and before it turns `url()` into
 * an emitted asset, which is exactly the window this rewrite needs.
 *
 * The work is done in `Once` rather than in a declaration visitor: vite's own url
 * rewriting is an `Once` too, and postcss runs every `Once` before the first visitor, so
 * a visitor here would drop the entries only after each of them had already been turned
 * into an emitted file.
 */
const woff2OnlyPostcssPlugin = {
	postcssPlugin: "woff2-only",
	Once: (root: PostcssRoot) => {
		root.walkDecls("src", (declaration) => {
			const kept = keepWoff2Entries(declaration.value);
			if (kept !== null) {
				declaration.value = kept;
			}
		});
	},
};

/** Names postcss searches for a config at, from `postcss-load-config`'s search places. */
const POSTCSS_CONFIG_NAMES = [
	".postcssrc",
	".postcssrc.json",
	".postcssrc.yaml",
	".postcssrc.yml",
	".postcssrc.js",
	".postcssrc.cjs",
	".postcssrc.mjs",
	".postcssrc.ts",
	".postcssrc.cts",
	".postcssrc.mts",
	"postcss.config.js",
	"postcss.config.cjs",
	"postcss.config.mjs",
	"postcss.config.ts",
	"postcss.config.cts",
	"postcss.config.mts",
];

/** Files that mark the workspace root, which is where vite stops searching for a postcss config. */
const WORKSPACE_ROOT_MARKERS = [
	"pnpm-workspace.yaml",
	"pnpm-lock.yaml",
	"package-lock.json",
	"yarn.lock",
	".git",
];

/**
 * Vite plugin that rewrites every stylesheet on the way in and checks the finished
 * build.
 *
 * The check exists because the rewrite is silent by nature: word `src` differently in a
 * future `@fontsource` release and nothing matches any more, the legacy copies come
 * back, and no one is told — which is exactly how 25 MB of them went unnoticed. So the
 * build fails on the one condition the plugin exists to prevent.
 *
 * The rewrite is contributed as a postcss plugin through `css.postcss`, so a project
 * that resolves its own postcss config from a file has to pass that config inline
 * instead of leaving it to be discovered; the plugin refuses to start rather than
 * shadow it.
 *
 * @returns A plugin to put in `plugins`; it needs no options and is the whole of the setup, rewrite and check alike.
 */
export function woff2OnlyVitePlugin(): Plugin {
	let outDir = "";
	return {
		name: "woff2-only",
		config(userConfig) {
			assertPostcssConfigIsNotShadowed(
				userConfig.css?.postcss,
				userConfig.root ?? process.cwd(),
			);
			// Merged into whatever the project already declares: vite concatenates the
			// plugin arrays, and postcss visits in that order, so the rewrite lands
			// before vite's own url rewriting either way.
			return { css: { postcss: { plugins: [woff2OnlyPostcssPlugin] } } };
		},
		configResolved(config) {
			if (config.css.transformer === "lightningcss") {
				throw new Error(
					"woff2-only rewrites through postcss, which css.transformer: 'lightningcss' switches off. " +
						"Remove one of the two.",
				);
			}
			outDir = resolve(config.root, config.build.outDir);
		},
		closeBundle() {
			assertNoLegacyFontDuplicates(findLegacyFontDuplicates(outDir));
		},
	};
}

/** The slice of esbuild's `PluginBuild` this plugin uses, so canvas takes no esbuild dependency. */
interface EsbuildPluginBuild {
	initialOptions: { outdir?: string; outfile?: string };
	onLoad(
		options: { filter: RegExp },
		callback: (args: {
			path: string;
		}) => { contents: string; loader: "css"; resolveDir: string },
	): void;
	onEnd(callback: () => void): void;
}

/** The shape esbuild's `Plugin` requires, narrowed to what is declared here. */
export interface EsbuildLikePlugin {
	name: string;
	setup(build: EsbuildPluginBuild): void;
}

/**
 * esbuild plugin that rewrites every stylesheet on the way in and checks the finished
 * build. The counterpart of {@link woff2OnlyVitePlugin}, with the same guarantee.
 *
 * Here the rewrite is an `onLoad` over the file text: esbuild bundles `@import` by
 * loading each stylesheet as a module of its own, so every face passes through.
 *
 * @returns A plugin to put in `plugins`; typed structurally, so it is assignable to esbuild's `Plugin` without this package depending on esbuild. The build must name its output through `outdir` or `outfile`, since that is where the check looks; one writing in memory is refused rather than passed unchecked, and has to call {@link findLegacyFontDuplicates} over whatever it writes itself.
 */
export function woff2OnlyEsbuildPlugin(): EsbuildLikePlugin {
	return {
		name: "woff2-only",
		setup(build) {
			build.onLoad({ filter: /\.css$/ }, (args) => ({
				contents: dropLegacyFontSources(readFileSync(args.path, "utf8")),
				loader: "css",
				resolveDir: dirname(args.path),
			}));
			build.onEnd(() => {
				const { outdir, outfile } = build.initialOptions;
				const outDir = outdir ?? (outfile === undefined ? "" : dirname(outfile));
				if (outDir === "") {
					throw new Error(
						"woff2-only checks the finished build on disk, and this one names neither outdir nor outfile. " +
							"A build writing in memory has to run findLegacyFontDuplicates over what it writes itself.",
					);
				}
				assertNoLegacyFontDuplicates(findLegacyFontDuplicates(outDir));
			});
		},
	};
}

/** Fails the build, naming the files that came back, when the rewrite stopped taking effect. */
function assertNoLegacyFontDuplicates(duplicates: string[]): void {
	if (duplicates.length === 0) {
		return;
	}
	throw new Error(
		`woff2-only stopped stripping the legacy src: ${duplicates.length} file(s) ` +
			`duplicate a face that also ships woff2, starting with ${duplicates[0]}. ` +
			`Check how the @font-face src is written in the CSS it comes from.`,
	);
}

/**
 * Refuses to run where contributing `css.postcss` would cost the project the postcss
 * config it means to use: vite skips its file search the moment that option is set.
 *
 * @param inlinePostcss The project's own `css.postcss`, before vite merges anything into it.
 * @param root The project's vite root, which is where the file search would have started.
 */
function assertPostcssConfigIsNotShadowed(
	inlinePostcss: unknown,
	root: string,
): void {
	if (typeof inlinePostcss === "string") {
		throw new Error(
			`woff2-only contributes a postcss plugin, which cannot be added to the config file css.postcss names ("${inlinePostcss}"). ` +
				"Pass that config inline as css.postcss: { plugins: [...] }.",
		);
	}
	if (inlinePostcss !== undefined) {
		return;
	}
	const configPath = findPostcssConfigFile(resolve(root));
	if (configPath !== null) {
		throw new Error(
			`woff2-only contributes a postcss plugin, and setting css.postcss is what stops vite finding ${configPath}. ` +
				"Pass that config inline as css.postcss: { plugins: [...] }.",
		);
	}
}

/**
 * Path of the postcss config vite would have found, or null. Searched upwards from the
 * root and stopped at the workspace root, the way vite's own search is bounded.
 */
function findPostcssConfigFile(root: string): string | null {
	let dir = root;
	for (;;) {
		for (const name of POSTCSS_CONFIG_NAMES) {
			const candidate = join(dir, name);
			if (existsSync(candidate)) {
				return candidate;
			}
		}
		const parent = dirname(dir);
		if (
			parent === dir ||
			WORKSPACE_ROOT_MARKERS.some((name) => existsSync(join(dir, name)))
		) {
			return null;
		}
		dir = parent;
	}
}

/** Whether a url() target names one of the formats a woff2 makes redundant. */
function isLegacyFontTarget(target: string): boolean {
	const withoutQuery = target.split(/[?#]/)[0].toLowerCase();
	return LEGACY_FONT_EXTENSIONS.some((one) => withoutQuery.endsWith(one));
}

/** Last segment of a url() target, which is the emitted file's name. */
function toFileName(target: string): string {
	const withoutQuery = target.split(/[?#]/)[0];
	return withoutQuery.split(posix.sep).pop()?.split(win32.sep).pop() ?? target;
}

/** Absolute paths of every file under a directory; an absent directory yields none. */
function listFilesRecursively(dir: string): string[] {
	let dirEntries;
	try {
		dirEntries = readdirSync(dir, { withFileTypes: true });
	} catch {
		return [];
	}
	const filePaths: string[] = [];
	for (const dirEntry of dirEntries) {
		const entryPath = join(dir, dirEntry.name);
		if (dirEntry.isDirectory()) {
			filePaths.push(...listFilesRecursively(entryPath));
		} else {
			filePaths.push(entryPath);
		}
	}
	return filePaths;
}
