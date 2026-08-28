// ビルド済みビューアの在り処を解く。
//
// vite build が出すのは 2 つだけ。JS と CSS を 1 枚に畳んだ index.html と、
// その CSS が参照するフォント（assets/）。前者は起動時に読み切ってメモリに載せ、
// 後者はディレクトリのまま配る（全部で 50MB あり、畳める量ではない）。

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { CanvasHostError } from "./canvasHostError";

export type ViewerAssets = {
	/** `/` で返す HTML の全文 */
	viewerHtml: string;
	/** `/assets/` 以下で配るディレクトリ（絶対パス） */
	assetRootPath: string;
};

/**
 * ビューアの置き場の候補を、探す順に返す。
 *
 * バンドル後は dist/index.mjs の隣の client/。tsx で src から起動したときは
 * そこに何も無いので、パッケージの dist/client へ落ちる（ビルド済みなら
 * 開発起動でも画面が出る）。
 */
const calcViewerRootCandidates = (): readonly string[] => {
	const override = process.env.JISCRIBE_MCP_VIEWER_ROOT;
	if (override !== undefined && override !== "") {
		return [path.resolve(override)];
	}
	return [
		fileURLToPath(new URL("./client/", import.meta.url)),
		fileURLToPath(new URL("../../dist/client/", import.meta.url)),
	];
};

/**
 * ビューアの HTML を読み、アセットの置き場と併せて返す。
 *
 * @returns 読み込み済みの HTML と、フォントを配るディレクトリ
 * @throws CanvasHostError ビルドされていないとき。黙って 404 を返し続けると
 *   「画面が真っ白」としか分からないので、起動時に落とす
 */
export function resolveViewerAssets(): ViewerAssets {
	const candidates = calcViewerRootCandidates();
	for (const rootPath of candidates) {
		const htmlPath = path.join(rootPath, "index.html");
		if (existsSync(htmlPath)) {
			return {
				viewerHtml: readFileSync(htmlPath, "utf8"),
				assetRootPath: path.join(rootPath, "assets"),
			};
		}
	}
	throw new CanvasHostError(
		`canvas viewer is not built (looked for index.html in ${candidates.join(", ")}). Run \`pnpm --filter @workspace/mcp build\`, or set JISCRIBE_MCP_VIEWER_ROOT to a directory holding one.`,
	);
}
