// VSCode拡張機能のビルドスクリプト
// esbuild を使って TypeScript/TSX ソースを dist/ にまとめる
// 通常ビルド: node build.mjs
// 監視モード: node build.mjs --watch

import { copyFileSync, mkdirSync, rmSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

import * as esbuild from "esbuild";

// ESモジュール内では __dirname が使えないため、import.meta.url から求める
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// コマンド引数に --watch が含まれていれば監視モードで起動する
const isWatch = process.argv.includes("--watch");

// ── 拡張機能本体のビルド設定（Node.js 環境で動く）────────────────────────
// VSCode 拡張機能のメインプロセスは VSCode 組み込みの Node.js 上で動作する。
// src/extension.ts を単一ファイル dist/extension.js にバンドルする。
const extensionConfig = {
	// バンドルの起点となるファイル
	entryPoints: [join(__dirname, "src", "extension.ts")],
	// import している他ファイルやライブラリを1ファイルにまとめる
	bundle: true,
	// 出力先
	outfile: join(__dirname, "dist", "extension.js"),
	// バンドルに含めず実行時に require() で解決するモジュール
	// vscode: VSCode が実行環境として提供するため同梱不要
	external: ["vscode"],
	// CommonJS 形式で出力（VSCode 拡張機能が require() で読み込むため）
	format: "cjs",
	// Node.js 向けのビルド（グローバル変数 process や __dirname などが使える）
	platform: "node",
	// 対象 Node.js バージョン（VSCode 1.85 が搭載している Node.js に合わせる）
	target: "node18",
	// ソースマップを生成（エラー発生時にどの TypeScript ファイルの何行目かを示す）
	sourcemap: true,
	// 監視モード以外（=本番ビルド）のときだけ minify（ファイルサイズ削減）を有効化
	minify: !isWatch,
};

// ── Webview のビルド設定（ブラウザ環境で動く）────────────────────────────
// VSCode のパネル内に表示される UI（SVGキャンバス）は Webview という仕組みで動く。
// Webview はブラウザと同じ環境なので、ブラウザ向けにバンドルする必要がある。
// src/webview/index.tsx を単一ファイル dist/webview.js にバンドルする。
const webviewConfig = {
	// バンドルの起点となるファイル（React コンポーネントのルート）
	entryPoints: [join(__dirname, "src", "webview", "index.tsx")],
	bundle: true,
	// 出力先
	outfile: join(__dirname, "dist", "webview.js"),
	// IIFE（即時実行関数）形式で出力（グローバル変数を汚染せず Webview に読み込める）
	format: "iife",
	// ブラウザ向けのビルド（window や document などが使える）
	platform: "browser",
	// 対応ブラウザの最小バージョン（VSCode の Webview は Chromium ベースのため余裕がある）
	target: "es2020",
	sourcemap: true,
	minify: !isWatch,
	// React の新しい JSX 変換（automatic）を使用する
	// これにより各ファイルで "import React from 'react'" を書かずに JSX が使える
	jsx: "automatic",
	// 拡張子ごとのファイルの扱い方
	loader: {
		".tsx": "tsx",
		".ts": "ts",
	},
};

// ── AI アセットのコピー ──────────────────────────────────────────────────
// canvas パッケージの配布アセット（ai/）を dist/ に配置する。
// - jiscribe.schema.json: VSCode の jsonValidation が参照し、.jis.json の補完・検証を提供する。
// - ai-guide.md: 「Set up AI」がワークスペースへ配置する AI オーサリングガイド（入口）。
// - reference.md: ai-guide が参照する詳細リファレンス（同じ .jiscribe/ に置くためリンクが解決する）。
// 配布元は packages/canvas/ai/（配布アセット正本）。
function copyAiAssets() {
	const aiDir = join(__dirname, "../../packages/canvas/ai");
	const distDir = join(__dirname, "dist");
	mkdirSync(distDir, { recursive: true });

	for (const fileName of [
		"jiscribe.schema.json",
		"ai-guide.md",
		"reference.md",
	]) {
		copyFileSync(join(aiDir, fileName), join(distDir, fileName));
		console.log(`✅ AI asset copied: ${fileName}`);
	}
}

// ── メインのビルド処理 ───────────────────────────────────────────────────
async function build() {
	try {
		// 過去のビルドの残骸（古い成果物や実験時のファイル）が vsix に混入しないよう、
		// 監視モード以外では dist を空にしてからビルドする
		if (!isWatch) {
			rmSync(join(__dirname, "dist"), { recursive: true, force: true });
		}

		copyAiAssets();

		if (isWatch) {
			// 監視モード: ファイル変更を検知して自動的に再ビルドする
			// esbuild.context() でビルド設定を登録し、watch() で監視を開始する
			// 拡張機能本体と Webview を並列で監視する
			const extensionCtx = await esbuild.context(extensionConfig);
			const webviewCtx = await esbuild.context(webviewConfig);

			await Promise.all([extensionCtx.watch(), webviewCtx.watch()]);

			console.log("Watching for changes...");
		} else {
			// 通常ビルド: 一度だけビルドして終了する
			// 拡張機能本体と Webview を順番にビルドする
			await esbuild.build(extensionConfig);
			await esbuild.build(webviewConfig);

			console.log("Build completed successfully");
		}
	} catch (error) {
		console.error("Build failed:", error);
		// ビルド失敗時は終了コード 1 で終了（CI や vscode:prepublish でエラーとして検知させる）
		process.exit(1);
	}
}

build();
