import { basename, dirname, isAbsolute, resolve } from "node:path";

import {
	createCanvasToolDescriptors,
	isAiDocOp,
	type AiCanvasOpOutcome,
	type AiDocOp,
	type CanvasToolArgs,
} from "@jiscribe/ai-tools";
import {
	applyCanvasOp,
	createCanvasOpHistory,
	type CanvasOpHistory,
} from "@jiscribe/ai-tools/apply";
import { DocOperationError, type CanvasDoc } from "@jiscribe/doc";
import type { Diagnostic } from "@jiscribe/doc-tools";
import {
	resolveContentBox,
	diagnoseDoc,
	measureWrappedText,
	validateDoc,
} from "@jiscribe/doc-tools";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { canvasCapabilities, docOps } from "./canvasDefinitions";
import {
	CanvasFileError,
	ensureCanvasFile,
	loadCanvasFile,
	readCanvasFileText,
	saveCanvasFile,
} from "./canvasStore";
import { formatDiagnostics } from "./diagnosticReport";
import { startCanvasHost, type CanvasHost } from "./host/canvasHost";
import { CanvasHostError } from "./host/canvasHostError";
import { createPathLock, type PathLock } from "./pathLock";

/**
 * Jiscribe MCP サーバーのツール定義。stdio での起動は `./index` が受け持つ。
 *
 * 公開するツールは 3 系統ある。
 *
 * 1. このサーバー独自のもの（下に直接書いてある）
 *    - `open_canvas`: ローカルにビューアを立ててブラウザで開く。以後は同じファイルを
 *      AI が書き換え、人が画面で直す共同作業の場になる
 *    - `close_canvas`: その窓を閉じ、サーバーも畳む。人が窓を閉じたときも同じところへ
 *      行き着く（最後の窓が消えたらホストを畳む）
 *    - `validate_canvas` / `diagnose_canvas`: 検証と、はみ出しなど描画上の診断
 *    - `measure_text`: 図を持たずに、文字列が指定サイズの図形に収まるかを測る
 *    - `add_rect` / `add_ellipse`: 使用頻度の高い 2 つに既定サイズを与えた入口
 * 2. `@jiscribe/ai-tools` が宣言する、doc だけで答えられるもの（`registerDocTools`）。
 *    追加・移動・整列・グループ化・スタイル・キャンバス面の色・表示の宣言・読み取り・
 *    undo など。
 *    宣言は「今開いている
 *    doc」を前提に書かれているので、対象を選ぶ `path` を足してファイル操作に読み替える
 * 3. 同じく ai-tools の、マウント済みキャンバスが要るもの（`registerHandleTools`）。
 *    撮影・カメラ・選択・計測。実行は open_canvas で立てたビューアへの往復になる
 *
 * 1 と 2・3 で名前がぶつかると後勝ちで片方が黙って消えるため、登録は `registerName`
 * を通して起動時に落とす。
 *
 * 引数スキーマはどれも `.strict()` で閉じる。zod は既定で未知のキーを黙って捨てるので、
 * ellipse を `cx` / `rx` で置こうとした呼び出しが、原点の既定サイズの図形として成功して
 * しまう。`additionalProperties: false` は JSON Schema にも出るため、AI は呼ぶ前に読める。
 *
 * 扱う図形の集合は `./canvasDefinitions` の 1 箇所（組み込み＋プラグイン）で決まる。
 */

// ツール既定の寸法。addObject は factory 既定（rect 100x100 等）へ落ちるので、
// これまでのツール挙動を保つため境界で明示する。add_ellipse は中心基準
// （cx/cy/rx/ry）入力を保ち、addObject の左上基準へ変換する。
const DEFAULT_RECT_WIDTH = 160;
const DEFAULT_RECT_HEIGHT = 80;
const DEFAULT_ELLIPSE_RX = 80;
const DEFAULT_ELLIPSE_RY = 50;

/**
 * フォント指定の無い文書が描かれるフォントスタック（キャンバスの sans と同じ）。
 * measure_text は文書を持たないので、ここに書き下すしかない。
 */
const DEFAULT_FONT_FAMILY = '"Source Sans 3", "Noto Sans JP", sans-serif';

const pathArg = z
	.string()
	.describe("Absolute path to the target .jis.json file.");

/**
 * ツールを登録済みの MCP サーバーを組み立てる。
 *
 * 呼び出しごとに新しいインスタンスを返す。McpServer は 1 つのトランスポートしか
 * 束ねられないため、接続先が別なら別インスタンスが要る。
 */
export function createJiscribeMcpServer(): McpServer {
	const server = new McpServer({
		name: "jiscribe",
		version: "0.1.0",
	});

	// ビューアは最初に open_canvas が呼ばれたときだけ立ち上げ、以後は使い回す。
	// 寿命は窓に合わせ、最後の窓が閉じたら畳んでポートを返す
	let host: CanvasHost | null = null;

	/**
	 * ホストを立て、窓が全て閉じたら畳むよう仕込む。
	 *
	 * @param workspaceRoot ファイル API の基準ディレクトリ（絶対パス）
	 * @returns 起動済みのホスト。表示対象は未指定なので、続けて openFile を呼ぶこと
	 */
	const startHost = async (workspaceRoot: string): Promise<CanvasHost> => {
		const started: CanvasHost = await startCanvasHost({
			workspaceRoot,
			onViewersGone: () => {
				void (async () => {
					// 既に別のホストへ入れ替わっていたら、こちらは用済みで畳まれている
					if (host !== started) {
						return;
					}
					host = null;
					await started.close();
				})();
			},
		});
		return started;
	};

	// 自前のツールと ai-tools 由来のツールで名前がぶつかっていないかを起動時に見る。
	// 同名を二度登録すると後勝ちで片方が黙って消えるので、通る前に落とす
	// 同じファイルへの手を 1 つずつ流す。読み込み → 変更 → 書き戻しの間に割り込まれると、
	// 後の書き戻しが先の変更ごと捨てるため
	const withPathLock = createPathLock();

	const registeredNames = new Set<string>();
	const registerName = (name: string): string => {
		if (registeredNames.has(name)) {
			throw new Error(`duplicate MCP tool name: ${name}`);
		}
		registeredNames.add(name);
		return name;
	};

	server.registerTool(
		registerName("open_canvas"),
		{
			description: [
				"Open a .jis.json file in a canvas viewer: starts a local web server inside this MCP process and opens the file in a browser window.",
				"The file stays the single source of truth. The editing tools below write to it and the viewer follows within a moment; when a person moves or retypes shapes in the viewer, it writes the file back, so reading the file again shows what they changed.",
				"A file that does not exist yet is created as an empty canvas, which is how a new diagram is started.",
				"Calling it again switches the viewer to another file. Naming a file outside the directory currently being served restarts the server on that file's directory, and the open viewer reconnects on its own.",
				"Returns the viewer URL, which is worth passing on to the user.",
			].join(" "),
			inputSchema: z.object({ path: pathArg }).strict(),
		},
		async ({ path }) =>
			runTool(async () => {
				if (!isAbsolute(path)) {
					throw new CanvasFileError(
						`path must be an absolute path, but got: ${path}`,
					);
				}
				const isCreated = await withPathLock(path, () =>
					ensureCanvasFile(path),
				);
				const workspaceRoot = resolve(dirname(path));

				// ファイル API はワークスペースの外へ出られないので、別ディレクトリを
				// 指されたらそのディレクトリで立て直す（ビューアは自力で繋ぎ直す）
				if (host !== null && host.workspaceRoot !== workspaceRoot) {
					await host.close();
					host = null;
				}
				host ??= await startHost(workspaceRoot);
				await host.openFile(basename(path));

				const state = isCreated ? "created and opened" : "opened";
				return `${state} ${basename(path)} — viewer: ${host.url}`;
			}),
	);

	server.registerTool(
		registerName("close_canvas"),
		{
			description: [
				"Close the canvas viewer window and stop the local web server that open_canvas started.",
				"Use it when the diagram is finished and the window is in the way; the .jis.json file is untouched and open_canvas brings it back.",
				"A window the browser refuses to close is reported as still open, and the server is left running for it.",
			].join(" "),
			inputSchema: z.object({}).strict(),
		},
		async () =>
			runTool(async () => {
				if (host === null) {
					return "no canvas viewer is open";
				}
				const { closedCount, remainingCount } = await host.closeViewers();
				if (remainingCount > 0) {
					// 窓が残るのにサーバーを止めると、その窓は繋ぎ直す先を探し続ける。
					// 次にこのポートを取ったホストへ合流してしまうので、止めない
					return `error: ${remainingCount} viewer window(s) refused to close, so the local server is left running; close the window(s) by hand`;
				}
				await host.close();
				host = null;
				return closedCount === 0
					? "no viewer window was open; stopped the local server"
					: `closed ${closedCount} viewer window(s) and stopped the local server`;
			}),
	);

	server.registerTool(
		registerName("validate_canvas"),
		{
			description:
				"Validate a Jiscribe .jis.json document against both the official JSON schema and the canvas parser. Returns whether it is valid and any diagnostics.",
			inputSchema: z
				.object({
					content: z
						.string()
						.describe(
							"The .jis.json document text (CanvasDoc JSON) to validate.",
						),
				})
				.strict(),
		},
		async ({ content }) =>
			textResult(formatDiagnostics(validateDoc(content).diagnostics)),
	);

	server.registerTool(
		registerName("diagnose_canvas"),
		{
			description: [
				"Check an existing .jis.json file: validation (schema + parser) plus a diagnosis of whether each shape's text actually fits inside it.",
				"Takes a path rather than the document text, so a large diagram never has to be sent through the conversation.",
				"Overflow is only diagnosed when the file itself validates, since a shape with an invalid size has no meaningful content box.",
				"Returns one line per finding, or valid: true when there is nothing to report.",
			].join(" "),
			inputSchema: z.object({ path: pathArg }).strict(),
		},
		async ({ path }) =>
			runTool(async () => {
				const text = await withPathLock(path, () => readCanvasFileText(path));
				const result = validateDoc(text);
				const diagnostics: Diagnostic[] = [...result.diagnostics];
				if (result.ok && result.doc !== undefined) {
					diagnostics.push(...diagnoseDoc(result.doc));
				}
				return formatDiagnostics(diagnostics);
			}),
	);

	server.registerTool(
		registerName("measure_text"),
		{
			description: [
				"Measure how a single string lays out inside a shape of a given size, without a document to put it in.",
				"width / height are the shape's own bounding box, the same numbers a document holds; the content box is what the outline and the shared text padding leave of them.",
				"height may be omitted only for rect, whose content width follows from its width alone, and for types that draw their label outside their box.",
				"Returns the line count, the box the wrapped lines take, the content box, and whether the text fits.",
				"Use this before sizing a shape, so a label is not written into a box too small for it.",
			].join(" "),
			inputSchema: z
				.object({
					text: z.string().describe("The text to lay out, newlines included."),
					fontSize: z.number().positive().describe("Font size in px."),
					shape: z
						.string()
						.default("rect")
						.describe(
							"Object type to measure against (rect, stadium, card, ...). A type that draws its label outside its outline is measured without a fit verdict, since its box does not constrain the text.",
						),
					width: z.number().positive().describe("Shape width in px."),
					height: z
						.number()
						.positive()
						.optional()
						.describe("Shape height in px (required for every type but rect)."),
					bold: z
						.boolean()
						.default(false)
						.describe("Whether the text is bold."),
				})
				.strict(),
		},
		async (params) => textResult(measureTextInShape(params)),
	);

	server.registerTool(
		registerName("add_rect"),
		{
			description:
				"Add a rectangle to a .jis.json file (read → modify → validate → write). Returns the new object id.",
			inputSchema: z
				.object({
					path: pathArg,
					x: z.number().describe("Top-left x in px."),
					y: z.number().describe("Top-left y in px."),
					width: z
						.number()
						.min(0)
						.optional()
						.describe("Width in px (default 160)."),
					height: z
						.number()
						.min(0)
						.optional()
						.describe("Height in px (default 80)."),
					text: z
						.string()
						.optional()
						.describe("Label text inside the rectangle."),
				})
				.strict(),
		},
		async ({ path, ...params }) =>
			runMutation(withPathLock, path, (doc) => {
				// ツール既定の 160x80 を境界で補い、addObject の factory 既定へは落とさない。
				const id = docOps.addObject(doc, "rect", {
					x: params.x,
					y: params.y,
					width: params.width ?? DEFAULT_RECT_WIDTH,
					height: params.height ?? DEFAULT_RECT_HEIGHT,
					...(params.text !== undefined ? { text: params.text } : {}),
				});
				return `added rect "${id}" at (${params.x}, ${params.y})`;
			}),
	);

	server.registerTool(
		registerName("add_ellipse"),
		{
			description:
				"Add an ellipse to a .jis.json file (read → modify → validate → write). Returns the new object id.",
			inputSchema: z
				.object({
					path: pathArg,
					cx: z.number().describe("Center x in px."),
					cy: z.number().describe("Center y in px."),
					rx: z
						.number()
						.min(0)
						.optional()
						.describe("X radius in px (default 80)."),
					ry: z
						.number()
						.min(0)
						.optional()
						.describe("Y radius in px (default 50)."),
					text: z
						.string()
						.optional()
						.describe("Label text inside the ellipse."),
				})
				.strict(),
		},
		async ({ path, ...params }) =>
			runMutation(withPathLock, path, (doc) => {
				const rx = params.rx ?? DEFAULT_ELLIPSE_RX;
				const ry = params.ry ?? DEFAULT_ELLIPSE_RY;
				const id = docOps.addObject(doc, "ellipse", {
					x: params.cx - rx,
					y: params.cy - ry,
					width: rx * 2,
					height: ry * 2,
					...(params.text !== undefined ? { text: params.text } : {}),
				});
				return `added ellipse "${id}" at (${params.cx}, ${params.cy})`;
			}),
	);

	// undo は「AI が置いたまま」のときだけ戻せるので、履歴は編集対象ごとに持つ
	const historyByPath = new Map<string, CanvasOpHistory>();
	const takeHistory = (filePath: string): CanvasOpHistory => {
		const existing = historyByPath.get(filePath);
		if (existing !== undefined) {
			return existing;
		}
		const created = createCanvasOpHistory();
		historyByPath.set(filePath, created);
		return created;
	};

	/**
	 * ファイル 1 つを doc として操作へ渡す。読み取りだけの操作では replaceDoc が
	 * 呼ばれないので、そのときは書き戻しもしない（無用な更新でビューアを揺らさない）。
	 */
	const applyDocOpToFile = async (
		filePath: string,
		op: AiDocOp,
	): Promise<AiCanvasOpOutcome> => {
		const absolutePath = resolve(filePath);
		return await withPathLock(absolutePath, async () => {
			const loadedDoc = await loadCanvasFile(absolutePath);
			let nextDoc: CanvasDoc | null = null;
			const outcome = applyCanvasOp(
				op,
				{
					getDoc: () => nextDoc ?? loadedDoc,
					replaceDoc: (replacement) => {
						nextDoc = replacement;
					},
				},
				takeHistory(absolutePath),
				docOps,
			);
			if (nextDoc !== null) {
				await saveCanvasFile(absolutePath, nextDoc);
			}
			return outcome;
		});
	};

	registerDocTools(server, registerName, applyDocOpToFile);
	registerHandleTools(server, registerName, () => host);

	return server;
}

/**
 * ai-tools が宣言するツールのうち、doc だけで答えられるものを登録する。
 *
 * 宣言側は「今開いている doc」を前提に書かれているので、対象を選ぶ `path` を足して
 * ファイルへの操作に読み替える。宣言に `path` を持つツールは無いので、この追加が
 * 既存の引数と衝突することはない。
 *
 * @param server 登録先
 * @param registerName 名前の重複を弾く登録口
 * @param applyToFile 1 ファイルへ 1 操作を適用する実体
 */
function registerDocTools(
	server: McpServer,
	registerName: (name: string) => string,
	applyToFile: (filePath: string, op: AiDocOp) => Promise<AiCanvasOpOutcome>,
): void {
	for (const descriptor of createCanvasToolDescriptors(canvasCapabilities)) {
		if (descriptor.drives.some((ref) => ref.startsWith("handle."))) {
			continue;
		}
		server.registerTool(
			registerName(descriptor.name),
			{
				description: descriptor.description,
				inputSchema: z
					.object({ path: pathArg, ...descriptor.inputSchema })
					.strict(),
			},
			async ({ path, ...args }: CanvasToolArgs & { path: string }) =>
				runTool(async () => {
					const op = descriptor.toOp(args);
					if (!isAiDocOp(op)) {
						// drives の宣言と toOp の行き先が食い違ったときだけ起きる
						return `internal error: ${descriptor.name} is declared to need only a document but produced a canvas-handle operation`;
					}
					const outcome = await applyToFile(path, op);
					return outcome.ok ? outcome.text : `error: ${outcome.text}`;
				}),
		);
	}
}

/**
 * `measure_text` は自前のもの（図に置く前に、寸法だけで測る）と ai-tools のもの
 * （画面に描かれたスロットを測る）で名前がぶつかる。別物なので、後から入る方を
 * 改名して両方残す。
 */
const HANDLE_TOOL_RENAMES: Readonly<Record<string, string>> = {
	measure_text: "measure_rendered_text",
};

/** 改名したツールに、どちらを使えばよいか分かる一文を足す */
const HANDLE_TOOL_DESCRIPTION_NOTES: Readonly<Record<string, string>> = {
	measure_text:
		"This measures a slot as it is actually drawn on the open canvas; to size a shape before putting it in the document, use measure_text instead.",
};

/**
 * ai-tools が宣言するツールのうち、マウント済みキャンバスが要るものを登録する。
 *
 * 引数スキーマも説明文も宣言をそのまま使い、実行だけをビューアへの往復に差し替える。
 * 対象は `drives` が canvas ハンドルを名指しするもの（宣言なので引数を組まずに判る）。
 *
 * @param registerTool 名前の重複を弾く登録口
 * @param getHost 現在のホスト。open_canvas より前に呼ばれると null
 */
function registerHandleTools(
	server: McpServer,
	registerName: (name: string) => string,
	getHost: () => CanvasHost | null,
): void {
	for (const descriptor of createCanvasToolDescriptors(canvasCapabilities)) {
		if (!descriptor.drives.some((ref) => ref.startsWith("handle."))) {
			continue;
		}
		const note = HANDLE_TOOL_DESCRIPTION_NOTES[descriptor.name];
		server.registerTool(
			registerName(HANDLE_TOOL_RENAMES[descriptor.name] ?? descriptor.name),
			{
				description:
					note === undefined
						? descriptor.description
						: `${descriptor.description} ${note}`,
				inputSchema: z.object(descriptor.inputSchema).strict(),
			},
			async (args: CanvasToolArgs) => {
				const host = getHost();
				if (host === null) {
					return textResult(
						"error: no canvas is open, so there is nothing on screen to capture, move, select, or measure; call open_canvas first",
					);
				}
				const op = descriptor.toOp(args);
				if (isAiDocOp(op)) {
					// drives の宣言と toOp の行き先が食い違ったときだけ起きる
					return textResult(
						`internal error: ${descriptor.name} is declared to drive the canvas handle but produced a document operation`,
					);
				}
				const outcome = await host.runHandleOp(op);
				if (outcome.imagePngBase64 !== undefined) {
					return {
						content: [
							{
								type: "image" as const,
								data: outcome.imagePngBase64,
								mimeType: "image/png",
							},
							{ type: "text" as const, text: outcome.text },
						],
					};
				}
				return textResult(outcome.ok ? outcome.text : `error: ${outcome.text}`);
			},
		);
	}
}

/** 表示上の桁を 0.1px に丸める。px 未満の差は AI にとって判断材料にならない。 */
function round(value: number): number {
	return Math.round(value * 10) / 10;
}

/**
 * 1 つの文字列を指定型・指定サイズの図形へ流し込んだ結果を測る。CLI の
 * `jiscribe measure` と同じ意味論（width / height は図形自身の外形、判定は
 * content box に対して行い、height 未指定なら高さは判定しない）。文言も CLI と
 * 揃える（engine/apps/cli/src/measureCommand.ts）: 箱の外に描く型は測るだけで
 * 収まり判定を出さず、出荷セットに無い型はエラーとして返す。
 */
function measureTextInShape(params: {
	text: string;
	fontSize: number;
	shape: string;
	width: number;
	height?: number;
	bold: boolean;
}): string {
	const { text, fontSize, shape, width, height, bold } = params;
	const resolution = resolveContentBox({
		type: shape,
		width,
		height: height ?? 0,
	});
	if (resolution.kind === "unknown") {
		return `error: unknown shape type "${shape}" (not in the standard set)`;
	}

	const font = {
		fontSize,
		fontFamily: DEFAULT_FONT_FAMILY,
		fontWeight: bold ? "bold" : "normal",
	};

	// 箱が文字を縛らないので、折り返さずそのまま測る（図形が自動サイズで描く姿）。
	if (resolution.kind === "outside") {
		const metrics = measureWrappedText(text, font);
		return [
			`shape ${shape} ${width}x${height ?? "-"}`,
			`lines ${metrics.lines}`,
			`text ${round(metrics.width)}x${round(metrics.height)}`,
			`note: shape ${shape} draws its label outside the box; the box size does not constrain the text`,
		].join("\n");
	}

	// rect 以外の外形は上下からも削られるため、高さ無しでは誰も指定していない箱を
	// 測ることになる。rect だけは高さが content 幅に効かないので省略を許す。
	if (shape !== "rect" && height === undefined) {
		return `error: height is required for shape ${shape}`;
	}

	const box = resolution.rect;
	const metrics = measureWrappedText(text, font, box.width);
	// 折り返し幅を超えるのは 1 文字が箱より広いときだけ。丸め差 0.5px を許容する。
	const fits =
		metrics.width <= box.width + 0.5 &&
		(height === undefined || metrics.height <= box.height);

	return [
		`shape ${shape} ${width}x${height ?? "-"}`,
		`lines ${metrics.lines}`,
		`text ${round(metrics.width)}x${round(metrics.height)}`,
		`content ${round(box.width)}x${height === undefined ? "-" : round(box.height)}`,
		`fits ${fits ? "yes" : "no"}`,
	].join("\n");
}

/** ツールが返せる内容。テキストと、撮影が返す PNG */
type ToolContent =
	| { type: "text"; text: string }
	| { type: "image"; data: string; mimeType: string };

/** ツール 1 回分の応答 */
type ToolReply = { content: ToolContent[] };

/** MCP ツールの戻り値（テキスト 1 件）を組み立てる。 */
function textResult(text: string): ToolReply {
	return { content: [{ type: "text", text }] };
}

/**
 * ツール本体を実行し、例外を AI へ返せるテキストへ落とす共通処理。
 *
 * CanvasFileError・CanvasHostError・DocOperationError は利用者向けメッセージとして
 * そのまま返し、それ以外は内部エラーとして整形する。
 */
async function runTool(
	handler: () => Promise<string>,
): Promise<ReturnType<typeof textResult>> {
	try {
		return textResult(await handler());
	} catch (error) {
		if (
			error instanceof CanvasFileError ||
			error instanceof CanvasHostError ||
			error instanceof DocOperationError
		) {
			return textResult(`error: ${error.message}`);
		}
		const reason = error instanceof Error ? error.message : String(error);
		return textResult(`internal error: ${reason}`);
	}
}

/**
 * 「読み込み → 変更 → 検証付き書き戻し」の共通処理。
 *
 * `mutate` は doc を直接変更し、AI へ返す短い要約を返す。
 */
async function runMutation(
	withPathLock: PathLock,
	path: string,
	mutate: (doc: Awaited<ReturnType<typeof loadCanvasFile>>) => string,
): Promise<ReturnType<typeof textResult>> {
	return runTool(async () =>
		withPathLock(path, async () => {
			const doc = await loadCanvasFile(path);
			const summary = mutate(doc);
			await saveCanvasFile(path, doc);
			return summary;
		}),
	);
}
