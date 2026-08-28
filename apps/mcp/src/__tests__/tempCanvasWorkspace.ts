import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * ツールが読み書きする `.jis.json` の中身。個々のフィールドまで型を付けず、
 * 書かれた/消えたを見るための緩い形にしてある。
 */
export type CanvasFileContent = {
	version: number;
	root: Record<string, unknown>[];
};

/** path-based ツールに渡す実ファイルを置く一時ディレクトリ。 */
export type TempCanvasWorkspace = {
	/** `.jis.json` を書き、その絶対パスを返す（ツールは相対パスを拒む）。 */
	writeDoc: (fileName: string, doc: CanvasFileContent) => Promise<string>;
	/** 書き戻された `.jis.json` を読み直す。 */
	readDoc: (path: string) => Promise<CanvasFileContent>;
	/** ディレクトリごと消す。存在しなくても失敗しない。 */
	remove: () => Promise<void>;
};

/** 一時ディレクトリを作り、その中で `.jis.json` を出し入れする窓口を返す。 */
export async function createTempCanvasWorkspace(): Promise<TempCanvasWorkspace> {
	const dir = await mkdtemp(join(tmpdir(), "jiscribe-mcp-"));
	return {
		writeDoc: async (fileName, doc) => {
			const path = join(dir, fileName);
			await writeFile(path, `${JSON.stringify(doc, null, "\t")}\n`, "utf8");
			return path;
		},
		readDoc: async (path) =>
			JSON.parse(await readFile(path, "utf8")) as CanvasFileContent,
		remove: async () => {
			await rm(dir, { recursive: true, force: true });
		},
	};
}
