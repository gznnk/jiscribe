import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** The contents of a `.jis.json`, left loose for writing broken ones too. */
export type CanvasFileContent = {
	version: number;
	root: Record<string, unknown>[];
};

/** A temporary directory to put real canvas files in. */
export type TempCanvasWorkspace = {
	/** The directory itself, for naming a file that is not to be written. */
	dirPath: string;
	/** Writes a `.jis.json` tab-indented and returns its absolute path. */
	writeDoc: (fileName: string, doc: CanvasFileContent) => Promise<string>;
	/**
	 * Writes a file verbatim and returns its absolute path, for text no
	 * `CanvasFileContent` can express (broken JSON, for instance).
	 */
	writeText: (fileName: string, text: string) => Promise<string>;
	/** Removes the whole directory. Does not fail if it is not there. */
	remove: () => Promise<void>;
};

/** Creates a temporary directory and returns the handle for filling it. */
export async function createTempCanvasWorkspace(): Promise<TempCanvasWorkspace> {
	const dir = await mkdtemp(join(tmpdir(), "jiscribe-doc-tools-"));
	return {
		dirPath: dir,
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
		remove: async () => {
			await rm(dir, { recursive: true, force: true });
		},
	};
}
