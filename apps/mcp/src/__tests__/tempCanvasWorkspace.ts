import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * The contents of the `.jis.json` the tools read and write. The individual
 * fields are left untyped: the shape is loose on purpose, for seeing what was
 * written or removed.
 */
export type CanvasFileContent = {
	version: number;
	root: Record<string, unknown>[];
};

/**
 * The temporary directory holding the real files handed to the path-based
 * tools.
 */
export type TempCanvasWorkspace = {
	/**
	 * Writes a `.jis.json` and returns its absolute path (the tools refuse a
	 * relative one).
	 */
	writeDoc: (fileName: string, doc: CanvasFileContent) => Promise<string>;
	/**
	 * Writes a file verbatim and returns its absolute path, for text no
	 * `CanvasFileContent` can express (broken JSON, for instance).
	 */
	writeText: (fileName: string, text: string) => Promise<string>;
	/** Re-reads a `.jis.json` that was written back. */
	readDoc: (path: string) => Promise<CanvasFileContent>;
	/** Removes the whole directory. Does not fail if it is not there. */
	remove: () => Promise<void>;
};

/**
 * Creates a temporary directory and returns the handle for moving `.jis.json`
 * files in and out of it.
 */
export async function createTempCanvasWorkspace(): Promise<TempCanvasWorkspace> {
	const dir = await mkdtemp(join(tmpdir(), "jiscribe-mcp-"));
	return {
		writeDoc: async (fileName, doc) => {
			const path = join(dir, fileName);
			await writeFile(path, `${JSON.stringify(doc, null, "\t")}\n`, "utf8");
			return path;
		},
		writeText: async (fileName, text) => {
			const path = join(dir, fileName);
			await writeFile(path, text, "utf8");
			return path;
		},
		readDoc: async (path) =>
			JSON.parse(await readFile(path, "utf8")) as CanvasFileContent,
		remove: async () => {
			await rm(dir, { recursive: true, force: true });
		},
	};
}
