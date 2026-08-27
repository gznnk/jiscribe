/**
 * Regenerates the parity fixture the measure suite pins the Node measurer
 * against: Chromium's own `measureText` widths under the canvas's sans stack.
 *
 * The Node measurer adds up glyph advances out of the font files; Chromium
 * additionally applies `text-spacing-trim`, which narrows adjacent CJK
 * punctuation. The fixture is what tells the two apart, so it has to come from a
 * browser rather than from the measurer being tested.
 *
 *   pnpm --filter @jiscribe/doc-tools generate:text-widths
 *
 * Re-run it when the case list below changes or the pinned @fontsource versions
 * move. A run needs the Chromium that playwright-core downloads.
 */
import { createReadStream } from "node:fs";
import { stat, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright-core";

const here = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(here, "..");
const FIXTURE = path.join(
	packageRoot,
	"src/measure/__tests__/fixtures/chromiumTextWidths.json",
);
const FONT_FAMILY = '"Source Sans 3", "Noto Sans JP", sans-serif';

/** The two named faces of that stack, which have to be the ones measured. */
const REQUIRED_FAMILIES = ["Source Sans 3", "Noto Sans JP"];

/** Adjacent-punctuation pairs, both the trimmed ones and the ones that must stay full width. */
const PAIRS = [
	"、「",
	"。「",
	"」「",
	"）（",
	"】【",
	"』『",
	"〕〔",
	"》《",
	"〉〈",
	"］［",
	"｝｛",
	"〟〝",
	"。」",
	"」。",
	"、、",
	"。。",
	"」）",
	"）」",
	"，「",
	"．「",
	"」・",
	"・「",
	"」　",
	"　「",
	"、・",
	"・。",
	"」，",
	"。，",
	"あ「",
	"「あ",
	"」あ",
	"あ」",
	"「」",
	"「・",
	"・・",
	"・あ",
	"　あ",
	"あ　",
	"！「",
	"「！",
	"」！",
	"？「",
	"、！",
	"！。",
	"：「",
	"」：",
	"；「",
	"」；",
	"、A",
	"A「",
	"」 ",
	" 「",
	"〜「",
	"」ー",
	"｢「",
	"。｢",
	"。｣",
	"｣「",
];

/** Chains, where every boundary is decided on its own. */
const CHAINS = [
	"）」「",
	"。」「",
	"、「「",
	"」」「",
	"「「あ",
	"あ」」",
	"、。、",
	"（（あ",
	"」）』】",
	"「（『【",
];

/** Whole lines, where the trims have to land in among ordinary text. */
const SENTENCES = [
	"図形の実装は 8 つのプラグイン（flowchart・general・container・annotation・uml・sticky・lucide-icon・markdown）に",
	"ベルの診断も doc-tools に 1 箇所書くだけで、CLI の diagnose と MCP の diagnose_canvas の両方に自動で載った — この伝播",
	"最後に、この整理で見つかった掃除候補を 1 つ記録しておく。doc-tools の package.json は @jiscribe/canvas に依存を宣言してい",
	"CLI・MCP）は描画せず、doc-tools の検証・計測だけを使う。MCP は診断に図形定義が要るため standard-shapes の doc 面も引くが",
	"前提として、パッケージ名には規約がある。@jiscribe/* は公開リポジトリ（engine、MIT）側、@workspace/* は private 側で、",
	"ど）の宣言をトランスポート非依存で持つ。private 側の canvas-agent がそれをチャット UI・Agent SDK と束ね、desktop と ",
	"彼は「そうか」と言った。「なるほど」と続けた。",
	"（注）『図形』・「線」・【枠】は、それぞれ別物である。",
	"「はい」「いいえ」「わからない」の 3 択（うち 1 つ）。",
	"エンジン（engine）・製品（web・desktop・studio・landing）、そして共有パッケージ。",
	"Hello, world!",
	"AI エージェント共有部",
	"チャットアシスタント",
];

/** A few chains at the other sizes and the bold weight, where rounding could differ. */
const VARIED_METRICS = ["」「", "。」「", "彼は「そうか」と言った。"].flatMap(
	(text) => [
		{ group: "chain", text, fontSize: 11, fontWeight: "normal" },
		{ group: "chain", text, fontSize: 13, fontWeight: "normal" },
		{ group: "chain", text, fontSize: 24, fontWeight: "normal" },
		{ group: "chain", text, fontSize: 14, fontWeight: "bold" },
	],
);

const CASES = [
	...PAIRS.map((text) => ({
		group: "pair",
		text,
		fontSize: 14,
		fontWeight: "normal",
	})),
	...CHAINS.map((text) => ({
		group: "chain",
		text,
		fontSize: 14,
		fontWeight: "normal",
	})),
	...SENTENCES.map((text) => ({
		group: "sentence",
		text,
		fontSize: 14,
		fontWeight: "normal",
	})),
	...VARIED_METRICS,
];

const MIME = {
	".html": "text/html; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".woff2": "font/woff2",
	".woff": "font/woff",
};

/**
 * Serves this package's directory so the probe page can link the @fontsource CSS
 * out of its node_modules. Paths that climb out of the package are refused: the
 * server exists for one page and lives as long as one run.
 */
const startFontServer = async () => {
	const server = createServer(async (request, response) => {
		const requested = decodeURIComponent(
			new URL(request.url, "http://localhost").pathname,
		);
		const file = path.join(packageRoot, requested);
		if (path.relative(packageRoot, file).startsWith("..")) {
			response.writeHead(403).end();
			return;
		}
		try {
			if (!(await stat(file)).isFile()) {
				throw new Error("not a file");
			}
		} catch {
			response.writeHead(404).end();
			return;
		}
		response.writeHead(200, {
			"content-type": MIME[path.extname(file)] ?? "application/octet-stream",
		});
		createReadStream(file).pipe(response);
	});
	await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
	return server;
};

const server = await startFontServer();
// Hinting is what stands between this and the measurer being pinned: left on,
// Chromium rounds every glyph advance to a whole pixel and the fixture comes out
// in integers, which no sum of font metrics can reproduce. The rest keep the
// rasterizer from having an opinion about the machine it runs on.
const browser = await chromium.launch({
	headless: true,
	args: [
		"--font-render-hinting=none",
		"--disable-font-subpixel-positioning",
		"--disable-lcd-text",
		"--force-color-profile=srgb",
		"--disable-gpu",
		"--disable-dev-shm-usage",
	],
});
try {
	const page = await browser.newPage();
	await page.goto(
		`http://127.0.0.1:${server.address().port}/scripts/probePage.html`,
	);

	const measured = await page.evaluate(
		async ({ cases, fontFamily, required }) => {
			// Every glyph the cases use, laid out once at a size that forces the real
			// faces to load: document.fonts.ready settles on what the page has asked
			// for, and a canvas context asks for nothing.
			const stage = document.getElementById("stage");
			const glyphs = [...new Set(cases.map((one) => one.text).join(""))].join(
				"",
			);
			stage.innerHTML =
				`<span class="probe" style="font-size:100px">${glyphs}</span>` +
				`<span class="probe" style="font-size:100px;font-weight:700">${glyphs}</span>`;
			await document.fonts.ready;
			stage.innerHTML = "";

			// A face that failed to load costs nothing here: the stack falls through
			// to whatever the machine has and the run writes those widths out as if
			// they were Chromium's under the canvas's own fonts. Nothing downstream
			// can tell the difference, so the check has to happen before measuring.
			const loaded = new Set(
				[...document.fonts]
					.filter((face) => face.status === "loaded")
					.map((face) => face.family),
			);
			const missing = required.filter((family) => !loaded.has(family));
			if (missing.length > 0) {
				throw new Error(
					`${missing.join(", ")} did not load; the probe page links them out of this package's node_modules`,
				);
			}

			const context = document.createElement("canvas").getContext("2d");
			return cases.map((one) => {
				context.font = `normal ${one.fontWeight} ${one.fontSize}px ${fontFamily}`;
				return {
					...one,
					width:
						Math.round(context.measureText(one.text).width * 10000) / 10000,
				};
			});
		},
		{ cases: CASES, fontFamily: FONT_FAMILY, required: REQUIRED_FAMILIES },
	);

	await writeFile(
		FIXTURE,
		`${JSON.stringify(
			{
				comment: `Chromium measureText widths under '${FONT_FAMILY}', generated by scripts/buildChromiumTextWidths.mjs (playwright-core bundled Chromium, text-spacing-trim at its default 'normal').`,
				fontFamily: FONT_FAMILY,
				cases: measured,
			},
			null,
			"\t",
		)}\n`,
	);
	console.log(`wrote ${measured.length} cases to ${FIXTURE}`);
} finally {
	await browser.close();
	server.close();
}
