// jiscribe-mcp のビルドスクリプト。
//
// 4 つのことをする。
//   1. vite が出したビューアの JS と CSS を index.html の中へ畳む（単一 HTML 化）。
//      フォントだけは畳まない（全部で 50MB あり、しかも unicode-range 分割なので
//      ブラウザは実際に描く範囲しか取りに来ない）。
//   2. doc-tools が実行時に読むもの（JSON スキーマと計測用フォント）を
//      dist/node_modules へ写し、写し漏れが無いか検証する。
//   3. esbuild で src/index.ts を単一ファイル dist/index.mjs にバンドルする（Node・ESM）。
//   4. できた成果物に tools/list を投げ、ツール定義の分量を報告する。
//
// 通常ビルド: node build.mjs / 監視: node build.mjs --watch
// （--watch は 3 だけを監視する。ビューアを触るなら vite の dev サーバーを使う）

import { spawn } from "child_process";
import { cp, mkdir, readdir, readFile, rm, writeFile } from "fs/promises";
import { createRequire } from "module";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

import * as esbuild from "esbuild";

const __dirname = dirname(fileURLToPath(import.meta.url));
const isWatch = process.argv.includes("--watch");
const clientDir = join(__dirname, "dist", "client");

/**
 * インラインする中身が、埋め込み先のタグを閉じてしまわないようにする。
 * `</script>` や `</style>` が本文に現れると、そこで要素が終わってしまう。
 */
const escapeForInlineTag = (source, tagName) =>
	source.replaceAll(new RegExp(`</(${tagName})`, "gi"), String.raw`<\/$1`);

/** vite が出した index.html へ、参照している JS と CSS を畳み込む */
const inlineViewerHtml = async () => {
	const htmlPath = join(clientDir, "index.html");
	let html = await readFile(htmlPath, "utf8");
	const inlinedFiles = [];

	const scriptPattern =
		/<script\b[^>]*\bsrc="\/assets\/([^"]+)"[^>]*><\/script>/g;
	for (const [tag, fileName] of [...html.matchAll(scriptPattern)]) {
		const code = await readFile(join(clientDir, "assets", fileName), "utf8");
		// 置換文字列ではなく関数を渡す。文字列だと minify 済みコードに含まれる
		// `$&` や `` $` `` が置換パターンとして解釈され、JS が壊れる
		html = html.replace(
			tag,
			() =>
				`<script type="module">${escapeForInlineTag(code, "script")}</script>`,
		);
		inlinedFiles.push(fileName);
	}

	const stylePattern = /<link\b[^>]*\bhref="\/assets\/([^"]+\.css)"[^>]*>/g;
	for (const [tag, fileName] of [...html.matchAll(stylePattern)]) {
		const css = await readFile(join(clientDir, "assets", fileName), "utf8");
		html = html.replace(
			tag,
			() => `<style>${escapeForInlineTag(css, "style")}</style>`,
		);
		inlinedFiles.push(fileName);
	}

	await writeFile(htmlPath, html, "utf8");
	// 畳んだ元ファイルは配らない（残すと同じものを二重に持つことになる）
	await Promise.all(
		inlinedFiles.map((fileName) =>
			rm(join(clientDir, "assets", fileName), { force: true }),
		),
	);

	const remaining = await readdir(join(clientDir, "assets"));
	console.log(
		`Viewer inlined: index.html (${(html.length / 1024).toFixed(0)} kB), ${remaining.length} asset files left (fonts)`,
	);
};

// ここから下は「リポジトリの外へ持ち出しても同じ答えを返す」ための staging。
//
// doc-tools は JSON スキーマとフォントを、バンドルされたコードからではなく
// node の解決規則で実行時に読む（validateDoc の require.resolve と
// fontSourcePackages の resolveFontSourceDir）。基準は dist/index.mjs 自身なので、
// その隣に node_modules を作って必要なファイルだけ置けば、周りにリポジトリが
// 無くても同じものが見つかる。
//
// フォントを置かずに済ませることはできない。doc-tools は見つからない families を
// 「文字数からの推定」へ黙って落とすので、日本語の計測だけが静かにずれる。

const require = createRequire(import.meta.url);
const stagedModulesDir = join(__dirname, "dist", "node_modules");

/**
 * doc-tools が要求しうる font-weight の全体。ブラウザ側が出荷するウェイトの梯子
 * （packages/canvas/build/generateFontsCss.ts の SHIPPED_FONT_STACKS が正本）と
 * 同じ 400/500/600/700。ここが欠けると、その段だけ計測が最寄りへ寄って描画と
 * ずれる。**調整値ではなく仕様**なので、写す量を減らす目的で削らないこと
 * （下の検証はこの配列を基準に staging を測るため、ここを削ると検証も一緒に緩む）。
 */
const REQUESTABLE_WEIGHTS = [400, 500, 600, 700];

/**
 * イタリックを写すウェイト。ブラウザ側の fonts.css はイタリックを 400/700 しか
 * 出荷しないので、staging も同じ 2 段に絞る。500/600 のイタリックまで写すと、
 * 配布版の計測だけが本物の中間イタリックで測り、描画（最寄りの 400-italic）と
 * ずれる。
 */
const ITALIC_WEIGHTS = [400, 700];

/** 計測できる families の @fontsource パッケージ（doc-tools の PACKAGE_BY_FAMILY と同じ集合） */
const FONT_PACKAGES = [
	"@fontsource/source-sans-3",
	"@fontsource/noto-sans-jp",
	"@fontsource/source-serif-4",
	"@fontsource/noto-serif-jp",
	"@fontsource/source-code-pro",
	"@fontsource/caveat",
	"@fontsource/klee-one",
];

/**
 * doc-tools の findNearestWeight と同じ選び方。ここがずれると、staging した
 * ディレクトリで別のウェイトが選ばれ、計測結果が元と食い違う。
 */
const findNearestWeight = (available, weight) =>
	available.reduce((nearest, candidate) =>
		Math.abs(candidate - weight) < Math.abs(nearest - weight)
			? candidate
			: nearest,
	);

/** 1 つの @fontsource パッケージから、計測に要るファイルだけ写す */
const stageFontPackage = async (packageName) => {
	const sourceDir = dirname(require.resolve(`${packageName}/package.json`));
	const targetDir = join(stagedModulesDir, packageName);
	await mkdir(join(targetDir, "files"), { recursive: true });
	await cp(join(sourceDir, "package.json"), join(targetDir, "package.json"));

	const entries = await readdir(sourceDir);
	const availableWeights = entries
		.map((name) => /^(\d+)\.css$/.exec(name))
		.filter((matched) => matched !== null)
		.map((matched) => Number.parseInt(matched[1], 10));

	// 要求されうるウェイトの「元パッケージでの最寄り」だけを持ち込む。
	// 部分集合でも最寄りが含まれていれば、選ばれるものは変わらない
	const stagedWeights = new Set(
		REQUESTABLE_WEIGHTS.map((weight) =>
			findNearestWeight(availableWeights, weight),
		),
	);

	let woffCount = 0;
	for (const weight of stagedWeights) {
		const cssNames = ITALIC_WEIGHTS.includes(weight)
			? [`${weight}.css`, `${weight}-italic.css`]
			: [`${weight}.css`];
		for (const cssName of cssNames) {
			if (!entries.includes(cssName)) {
				continue;
			}
			const css = await readFile(join(sourceDir, cssName), "utf8");
			await writeFile(join(targetDir, cssName), css, "utf8");
			// woff2 は写さない（fontkit は brotli を持たないので読めない）
			for (const [, fileName] of css.matchAll(
				/url\(\.\/files\/([^)]+\.woff)\)/g,
			)) {
				await cp(
					join(sourceDir, "files", fileName),
					join(targetDir, "files", fileName),
				);
				woffCount += 1;
			}
		}
	}
	return woffCount;
};

/** 検証が読む JSON スキーマを写す（exports 経由で解決されるので package.json ごと） */
const stageDocSchema = async () => {
	// package.json 自身は exports に無いので、公開されている ./schema から辿る
	const sourceDir = dirname(
		dirname(require.resolve("@jiscribe/doc-schema/schema")),
	);
	const targetDir = join(stagedModulesDir, "@jiscribe", "doc-schema");
	await mkdir(join(targetDir, "assets"), { recursive: true });
	await cp(join(sourceDir, "package.json"), join(targetDir, "package.json"));
	await cp(
		join(sourceDir, "assets", "jiscribe.schema.json"),
		join(targetDir, "assets", "jiscribe.schema.json"),
	);
};

/**
 * 写した結果が、元の node_modules と同じ答えを出せる形になっているかを確かめる。
 *
 * doc-tools はフォントが見つからない family を「文字数からの推定」へ黙って落とす
 * （エラーにならない）ので、staging が欠けた配布物は出荷されるまで気づけない。
 * ここで落として、壊れたものが dist に残らないようにする。
 *
 * 実測ではなく構造を見るのは、この場で測ってもリポジトリの node_modules へ
 * フォールバックしてしまい、staging を測ったことにならないため。
 *
 * @throws Error 欠けているものを列挙して落とす
 */
const verifyStagedRuntimeDependencies = async () => {
	const problems = [];

	const schemaDir = join(stagedModulesDir, "@jiscribe", "doc-schema");
	try {
		const manifest = JSON.parse(
			await readFile(join(schemaDir, "package.json"), "utf8"),
		);
		if (manifest.exports?.["./schema"] === undefined) {
			problems.push("doc-schema: package.json does not export ./schema");
		}
		JSON.parse(
			await readFile(join(schemaDir, "assets", "jiscribe.schema.json"), "utf8"),
		);
	} catch (error) {
		problems.push(`doc-schema: ${String(error)}`);
	}

	for (const packageName of FONT_PACKAGES) {
		const sourceDir = dirname(require.resolve(`${packageName}/package.json`));
		const targetDir = join(stagedModulesDir, packageName);
		let stagedEntries;
		try {
			stagedEntries = await readdir(targetDir);
		} catch {
			problems.push(`${packageName}: not staged at all`);
			continue;
		}

		const listWeights = (entries) =>
			entries
				.map((name) => /^(\d+)\.css$/.exec(name))
				.filter((matched) => matched !== null)
				.map((matched) => Number.parseInt(matched[1], 10));

		const originalWeights = listWeights(await readdir(sourceDir));
		const stagedWeights = listWeights(stagedEntries);
		if (stagedWeights.length === 0) {
			problems.push(`${packageName}: no weight stylesheet staged`);
			continue;
		}
		// 間引いたせいで doc-tools が別のウェイトを選ぶようになっていないか
		for (const weight of REQUESTABLE_WEIGHTS) {
			const before = findNearestWeight(originalWeights, weight);
			const after = findNearestWeight(stagedWeights, weight);
			if (before !== after) {
				problems.push(
					`${packageName}: weight ${weight} would resolve to ${after} instead of ${before}`,
				);
			}
		}

		// CSS が名指しする woff が 1 つでも欠けると、その範囲の文字だけ推定に落ちる
		const stagedFiles = new Set(
			await readdir(join(targetDir, "files")).catch(() => []),
		);
		let referencedCount = 0;
		for (const cssName of stagedEntries.filter((name) =>
			name.endsWith(".css"),
		)) {
			const css = await readFile(join(targetDir, cssName), "utf8");
			for (const [, fileName] of css.matchAll(
				/url\(\.\/files\/([^)]+\.woff)\)/g,
			)) {
				referencedCount += 1;
				if (!stagedFiles.has(fileName)) {
					problems.push(
						`${packageName}: ${cssName} names a missing ${fileName}`,
					);
				}
			}
		}
		if (referencedCount === 0) {
			problems.push(`${packageName}: staged stylesheets name no woff at all`);
		}
	}

	if (problems.length > 0) {
		throw new Error(
			[
				"Staged runtime dependencies are incomplete. Shipping this would make",
				"diagnose_canvas fail and silently degrade text measurement to estimates.",
				...problems.map((problem) => `  - ${problem}`),
			].join("\n"),
		);
	}
	console.log(
		`Runtime deps verified: ${FONT_PACKAGES.length} font packages + doc-schema`,
	);
};

const stageRuntimeDependencies = async () => {
	await rm(stagedModulesDir, { recursive: true, force: true });
	await stageDocSchema();
	let woffTotal = 0;
	for (const packageName of FONT_PACKAGES) {
		woffTotal += await stageFontPackage(packageName);
	}
	console.log(
		`Runtime deps staged: doc-schema + ${FONT_PACKAGES.length} font packages (${woffTotal} woff files)`,
	);
	await verifyStagedRuntimeDependencies();
};

const config = {
	entryPoints: [join(__dirname, "src", "index.ts")],
	bundle: true,
	outfile: join(__dirname, "dist", "index.mjs"),
	platform: "node",
	format: "esm",
	target: "node22",
	// npx / bin から直接実行できるように shebang を付ける。
	// 併せて CJS 由来の依存（ws）が `require("events")` などを呼べるよう、
	// ESM バンドル内に createRequire ベースの require を定義しておく
	banner: {
		js: [
			"#!/usr/bin/env node",
			'import { createRequire as __createRequire } from "node:module";',
			"const require = __createRequire(import.meta.url);",
		].join("\n"),
	},
	sourcemap: true,
	minify: !isWatch,
};

// ツール定義は AI のコンテキストに載る。deferred loading を持つクライアントなら
// 実際に載るのは使う分だけだが、持たないクライアントでは毎ターン全部が乗るので、
// 増えていることに気づけるようビルドのたびに量を出す。
//
// 数えるのはビルドした成果物そのもの。宣言が増えればそのまま数字に出るうえ、
// 起動して JSON-RPC に答えるところまで通るので、成果物の煙感知器も兼ねる
// （答えなければビルドが失敗する）。

/** これを超えたら警告する。増やすこと自体は正当なので、落としはしない */
const TOOL_PAYLOAD_WARN_TOKENS = 32_000;

/** 英語主体の JSON スキーマの目安として 4 文字 ≒ 1 トークンで換算する */
const approxTokens = (charCount) => Math.round(charCount / 4);

const reportToolPayload = async () => {
	const child = spawn(
		process.execPath,
		[join(__dirname, "dist", "index.mjs")],
		{
			stdio: ["pipe", "pipe", "ignore"],
			env: { ...process.env, JISCRIBE_MCP_NO_OPEN: "1" },
		},
	);
	const responseById = new Map();
	let buffer = "";
	child.stdout.on("data", (chunk) => {
		buffer += String(chunk);
		let lineEnd = buffer.indexOf("\n");
		while (lineEnd !== -1) {
			const line = buffer.slice(0, lineEnd).trim();
			buffer = buffer.slice(lineEnd + 1);
			if (line !== "") {
				const message = JSON.parse(line);
				if (message.id !== undefined) {
					responseById.set(message.id, message);
				}
			}
			lineEnd = buffer.indexOf("\n");
		}
	});
	const send = (message) => child.stdin.write(`${JSON.stringify(message)}\n`);
	const waitFor = async (id) => {
		const deadline = Date.now() + 20_000;
		while (Date.now() < deadline) {
			if (responseById.has(id)) {
				return responseById.get(id);
			}
			await new Promise((resolve) => setTimeout(resolve, 30));
		}
		throw new Error("the built server did not answer tools/list");
	};

	try {
		send({
			jsonrpc: "2.0",
			id: 1,
			method: "initialize",
			params: {
				protocolVersion: "2024-11-05",
				capabilities: {},
				clientInfo: { name: "build-report", version: "0.0.0" },
			},
		});
		await waitFor(1);
		send({ jsonrpc: "2.0", method: "notifications/initialized" });
		send({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
		const tools = (await waitFor(2)).result.tools;

		const fullTokens = approxTokens(JSON.stringify(tools).length);
		const listingTokens = approxTokens(
			tools.reduce(
				(sum, tool) => sum + tool.name.length + (tool.description?.length ?? 0),
				0,
			),
		);
		console.log(
			`Tools: ${tools.length} — ~${fullTokens} tokens of definitions (~${listingTokens} for names and descriptions alone)`,
		);
		if (fullTokens > TOOL_PAYLOAD_WARN_TOKENS) {
			console.warn(
				`  warning: over ${TOOL_PAYLOAD_WARN_TOKENS} tokens. A client without deferred tool loading carries all of this every turn.`,
			);
		}
	} finally {
		child.kill();
	}
};

if (isWatch) {
	const ctx = await esbuild.context(config);
	await ctx.watch();
	console.log("Watching for changes...");
} else {
	await inlineViewerHtml();
	await stageRuntimeDependencies();
	await esbuild.build(config);
	console.log("Build completed: dist/index.mjs");
	await reportToolPayload();
}
