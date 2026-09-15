import { fileURLToPath } from "node:url";

/** Absolute path of a template file under generator/templates/. */
export function templatePath(fileName: string): string {
	return fileURLToPath(new URL(`../templates/${fileName}`, import.meta.url));
}

/** Absolute path under assets/, the canonical output directory of this package. */
export function assetsPath(fileName: string): string {
	return fileURLToPath(new URL(`../../assets/${fileName}`, import.meta.url));
}

/** Absolute path under parts/, where the hand-written guide sources live. */
export function partsPath(fileName: string): string {
	return fileURLToPath(new URL(`../../parts/${fileName}`, import.meta.url));
}

/**
 * Absolute path under @jiscribe/ai-tools' src/, the one output of this package
 * that lands outside it (the canvas prompt, shipped as TypeScript so hosts get it
 * without reading a file at run time).
 */
export function aiToolsSrcPath(fileName: string): string {
	return fileURLToPath(
		new URL(`../../../ai-tools/src/${fileName}`, import.meta.url),
	);
}

/**
 * Absolute path under apps/claude-plugin/, the Claude Code plugin. Its skill is
 * generated here, so that what Claude Code reads cannot drift from the shape
 * manifest; everything else in that directory is hand-written.
 */
export function claudePluginPath(fileName: string): string {
	return fileURLToPath(
		new URL(`../../../../apps/claude-plugin/${fileName}`, import.meta.url),
	);
}

/** Absolute path under this package's own root, for reading its package.json. */
export function packageRootPath(fileName: string): string {
	return fileURLToPath(new URL(`../../${fileName}`, import.meta.url));
}
