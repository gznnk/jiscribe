// 引数スキーマが未知のキーを黙って捨てないことを、実際の `tools/call` の往復で見る。
//
// zod の既定（strip）に戻ると、綴りを間違えた引数も、その型が持たない引数も、
// 成功したという応答とともに消える。ここが落ちるときは strict が外れている。

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import type { McpTestClient } from "./mcpTestClient";
import { connectMcpTestClient } from "./mcpTestClient";
import type {
	CanvasFileContent,
	TempCanvasWorkspace,
} from "./tempCanvasWorkspace";
import { createTempCanvasWorkspace } from "./tempCanvasWorkspace";

const emptyDoc: CanvasFileContent = { version: 1, root: [] };

/** 断り文句が挙げうるスタイルキーごとの、宣言を満たす見本の値。 */
const STYLE_SAMPLE_VALUES: Record<string, unknown> = {
	fill: "#e3f2fd",
	stroke: "#1565c0",
	strokeWidth: 2,
	strokeDashType: "dashed",
	textAlign: "center",
	verticalAlign: "middle",
	fontColor: "#102a43",
	fontSize: 16,
	fontFamily: '"Source Serif 4", "Noto Serif JP", serif',
	fontWeight: "bold",
	fontStyle: "italic",
	textDecoration: "underline",
};

let client: McpTestClient;
let workspace: TempCanvasWorkspace;
/** テストごとに書き直す変更対象。名前を分けるのは書き戻し先を取り違えないため。 */
let targetPath: string;
let testIndex = 0;

beforeAll(async () => {
	client = await connectMcpTestClient();
	workspace = await createTempCanvasWorkspace();
});

afterAll(async () => {
	await client.close();
	await workspace.remove();
});

beforeEach(async () => {
	targetPath = await workspace.writeDoc(
		`strict-${testIndex++}.jis.json`,
		emptyDoc,
	);
});

describe("配列要素の未知キー", () => {
	it("add_objects の要素に文書側の座標を書くと、図形を作らずに落ちる", async () => {
		// 実際に起きた事故そのもの。ツールは全型を外接矩形で置くので cx / cy / ry は
		// 黙って捨てられ、楕円 4 つが原点に既定サイズで積み上がった
		const result = await client.callTool("add_objects", {
			path: targetPath,
			objects: [{ type: "ellipse", x: 0, y: 0, cx: 39, cy: 126, rx: 5, ry: 5 }],
		});

		expect(result.isError).toBe(true);
		expect(result.text).toContain("Unrecognized keys");
		expect(result.text).toContain("cx");
		expect(await workspace.readDoc(targetPath)).toEqual(emptyDoc);
	});

	it("connect_many の要素の未知キーも同じく落ちる", async () => {
		const result = await client.callTool("connect_many", {
			path: targetPath,
			entries: [{ sourceId: "a", targetId: "b", arrow: "end" }],
		});

		expect(result.isError).toBe(true);
		expect(result.text).toContain('Unrecognized key: "arrow" at entries[0]');
	});
});

describe("型が持てないスタイルキー", () => {
	it("add_objects で楕円に rx を書くと、図形を作らずに落ちる", async () => {
		// rx は styleSchema の正規のキーなので strict を素通りする。楕円に丸める角が
		// 無いと言えるのは、型の features を知っている doc 層だけ
		const result = await client.callTool("add_objects", {
			path: targetPath,
			objects: [
				{ type: "rect", x: 0, y: 0 },
				{ type: "ellipse", x: 200, y: 0, rx: 5 },
			],
		});

		// スキーマは通るので、断るのは doc 層。応答は isError ではなく "error:" で返る
		expect(result.text).toContain(
			'entries[1] (ellipse): object type "ellipse" cannot be styled with "rx"',
		);
		expect(await workspace.readDoc(targetPath)).toEqual(emptyDoc);
	});

	// doc は ai-tools より広いスタイル語彙を持つので、断り文句が挙げる名前が
	// ツールに無いということが起こりうる。そうなると AI は言われたとおりに
	// 書き直して二度落ちる。断り文句は導線なので、名指しした名前は必ず通ること
	it("断り文句が挙げる名前は、どれもそのまま渡せる", async () => {
		const refused = await client.callTool("add_object", {
			path: targetPath,
			type: "ellipse",
			x: 0,
			y: 0,
			rx: 5,
		});
		const advertised = [...refused.text.matchAll(/"([a-zA-Z]+)"/g)]
			.map(([, name]) => name)
			.filter((name) => name !== "ellipse" && name !== "rx");
		expect(advertised.length).toBeGreaterThan(0);

		for (const name of advertised) {
			const value = STYLE_SAMPLE_VALUES[name];
			// 見本の無い名前はテストの穴。doc に増えたキーをここで気付くための失敗
			expect(value, `no sample value for "${name}"`).toBeDefined();
			const result = await client.callTool("add_object", {
				path: targetPath,
				type: "ellipse",
				x: 0,
				y: 0,
				[name]: value,
			});

			expect(result.text, name).not.toContain("Unrecognized key");
			expect(result.text, name).not.toContain("cannot be styled with");
		}
	});
});

describe("トップレベルの未知キー", () => {
	it("自前のツールでも落ちる", async () => {
		const result = await client.callTool("add_rect", {
			path: targetPath,
			x: 0,
			y: 0,
			w: 200,
		});

		expect(result.isError).toBe(true);
		expect(result.text).toContain('Unrecognized key: "w"');
		expect(await workspace.readDoc(targetPath)).toEqual(emptyDoc);
	});

	it("ai-tools 由来の doc ツールでも落ちる", async () => {
		const result = await client.callTool("add_object", {
			path: targetPath,
			type: "rect",
			x: 0,
			y: 0,
			cy: 40,
		});

		expect(result.isError).toBe(true);
		expect(result.text).toContain('Unrecognized key: "cy"');
		expect(await workspace.readDoc(targetPath)).toEqual(emptyDoc);
	});

	it("画面が要るツールでも、ビューアの有無より先に落ちる", async () => {
		const result = await client.callTool("capture_canvas", { zoom: 2 });

		expect(result.isError).toBe(true);
		expect(result.text).toContain('Unrecognized key: "zoom"');
	});
});

describe("正しい引数", () => {
	it("宣言どおりの引数はこれまでどおり通る", async () => {
		const added = await client.callTool("add_objects", {
			path: targetPath,
			objects: [
				{ type: "ellipse", x: 39, y: 126, width: 10, height: 10 },
				{ type: "rect", x: 0, y: 0, width: 160, height: 80, text: "箱" },
			],
		});

		expect(added.isError).toBe(false);
		const doc = await workspace.readDoc(targetPath);
		expect(doc.root).toHaveLength(2);
		expect(doc.root[0]).toMatchObject({
			type: "ellipse",
			cx: 44,
			cy: 131,
			rx: 5,
			ry: 5,
		});
	});

	it("型が自分で宣言するプロパティは extraProps を通って届く", async () => {
		const added = await client.callTool("add_object", {
			path: targetPath,
			type: "lucideIcon",
			x: 0,
			y: 0,
			width: 40,
			height: 40,
			extraProps: { icon: "star" },
		});

		expect(added.isError).toBe(false);
		expect((await workspace.readDoc(targetPath)).root[0]).toMatchObject({
			type: "lucideIcon",
			icon: "star",
		});
	});
});

describe("JSON Schema", () => {
	it("additionalProperties: false を載せるので、AI は呼ぶ前に契約を読める", async () => {
		expect(await client.getToolInputSchema("add_objects")).toMatchObject({
			additionalProperties: false,
			properties: { objects: { items: { additionalProperties: false } } },
		});
	});
});
