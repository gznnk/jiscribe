import {
	createCanvasParser,
	createDocOps,
	type CanvasDoc,
	type CanvasDocPlugin,
	type ObjectDoc,
} from "@jiscribe/doc";
import { containerDocPlugin } from "@jiscribe/plugin-container-shapes/doc";
import { flowchartDocPlugin } from "@jiscribe/plugin-flowchart-shapes/doc";
import { markdownDocPlugin } from "@jiscribe/plugin-markdown-shape/doc";
import { umlDocPlugin } from "@jiscribe/plugin-uml-shapes/doc";
import { describe, expect, it } from "vitest";

import type { AiDocOp } from "../../canvasOps";
import { applyCanvasOp } from "../applyCanvasOp";
import { createCanvasOpHistory } from "../canvasOpHistory";
import type { AiDocBridge } from "../docBridge";

/** 出荷構成（desktop / web）と同じ 4 プラグインで docOps を組む */
const docPlugins: readonly CanvasDocPlugin[] = [
	flowchartDocPlugin,
	containerDocPlugin,
	markdownDocPlugin,
	umlDocPlugin,
];

const docOps = createDocOps({ plugins: docPlugins });

/** ホストの docBridge を模した最小実装。差し替え結果を保持して検査する */
const createFakeDocBridge = (
	initialDoc: CanvasDoc = { version: 1, root: [] },
) => {
	let doc = initialDoc;
	const replacedDocs: CanvasDoc[] = [];
	const bridge: AiDocBridge = {
		getDoc: () => doc,
		replaceDoc: (nextDoc) => {
			replacedDocs.push(nextDoc);
			doc = nextDoc;
		},
	};
	const history = createCanvasOpHistory();
	return {
		bridge,
		history,
		replacedDocs,
		currentDoc: () => doc,
		apply: (op: AiDocOp) => applyCanvasOp(op, bridge, history, docOps),
	};
};

/** doc から 1 オブジェクトを引く。グループの中までは辿らない */
const rootObject = (doc: CanvasDoc, id: string): Record<string, unknown> =>
	doc.root.find((object) => object.id === id) as unknown as Record<
		string,
		unknown
	>;

describe("applyCanvasOp", () => {
	it("describeCanvas は doc を変更せず JSON を返す", () => {
		const { apply, replacedDocs } = createFakeDocBridge();

		const result = apply({ kind: "describeCanvas" });

		expect(result.ok).toBe(true);
		expect(JSON.parse(result.text)).toEqual({ version: 1, root: [] });
		expect(replacedDocs).toHaveLength(0);
	});

	it("addObject は新しい doc 実体を渡す（同一実体だと Canvas が同期しない）", () => {
		const { apply, replacedDocs, currentDoc } = createFakeDocBridge();
		const docBeforeOp = currentDoc();

		const result = apply({
			kind: "addObject",
			type: "rect",
			x: 10,
			y: 20,
			text: "step",
		});

		expect(result.ok).toBe(true);
		expect(replacedDocs).toHaveLength(1);
		expect(replacedDocs[0]).not.toBe(docBeforeOp);
		// 元の doc は破壊されない（docOps は in-place なので複製が要る）
		expect(docBeforeOp.root).toHaveLength(0);
		expect(currentDoc().root).toHaveLength(1);
		expect(result.text).toContain("rect-1");
	});

	it("addObject はスタイル指定をそのまま反映する", () => {
		const { apply, currentDoc } = createFakeDocBridge();

		apply({
			kind: "addObject",
			type: "rect",
			x: 0,
			y: 0,
			fill: "#e3f2fd",
			fontColor: "#0d47a1",
		});

		expect(rootObject(currentDoc(), "rect-1")).toMatchObject({
			fill: "#e3f2fd",
			fontColor: "#0d47a1",
		});
	});

	it("プラグイン図形も追加できる（doc プラグインの登録漏れ検出）", () => {
		const { apply, currentDoc } = createFakeDocBridge();

		const result = apply({ kind: "addObject", type: "diamond", x: 0, y: 0 });

		expect(result.ok).toBe(true);
		expect(currentDoc().root[0]?.type).toBe("diamond");
	});

	it("addObjects は全件を 1 度に追加し、id を順番どおり返す", () => {
		const { apply, replacedDocs, currentDoc } = createFakeDocBridge();

		const result = apply({
			kind: "addObjects",
			objects: [
				{ type: "stadium", x: 0, y: 0, text: "開始" },
				{ type: "diamond", x: 0, y: 200, fill: "#fff3cd" },
				{ type: "rect", x: 0, y: 400 },
			],
		});

		expect(result.ok).toBe(true);
		expect(result.text).toBe(
			'added 3 objects: stadium "stadium-1", diamond "diamond-1", rect "rect-1"',
		);
		// 追加の数によらず doc の差し替えは 1 回（＝ undo 1 手で戻せる）
		expect(replacedDocs).toHaveLength(1);
		expect(currentDoc().root).toHaveLength(3);
		expect(rootObject(currentDoc(), "diamond-1")).toMatchObject({
			fill: "#fff3cd",
		});
	});

	it("addObjects は 1 件でも失敗したら何も追加しない", () => {
		const { apply, replacedDocs, currentDoc } = createFakeDocBridge();

		const result = apply({
			kind: "addObjects",
			objects: [
				{ type: "rect", x: 0, y: 0 },
				{ type: "nonexistent", x: 200, y: 0 },
			],
		});

		expect(result.ok).toBe(false);
		// docOps.addObjects が全件不採用にした旨を、要素の位置つきで返す
		expect(result.text).toContain("entries[1]");
		expect(replacedDocs).toHaveLength(0);
		expect(currentDoc().root).toHaveLength(0);
	});

	it("addObjects は groupNewObjects で追加ぶんをそのままグループにする", () => {
		const { apply, replacedDocs, currentDoc } = createFakeDocBridge();

		const result = apply({
			kind: "addObjects",
			groupNewObjects: true,
			objects: [
				{ type: "rect", x: 0, y: 0 },
				{ type: "rect", x: 200, y: 0 },
			],
		});

		expect(result.ok).toBe(true);
		expect(result.text).toContain('group "group-1"');
		// 追加とグループ化で doc の差し替えは 1 回（＝ undo 1 手で戻せる）
		expect(replacedDocs).toHaveLength(1);
		expect(currentDoc().root.map((object) => object.id)).toEqual(["group-1"]);
	});

	it("addObjects は parentGroupId で既存グループの中に追加する", () => {
		const { apply, currentDoc } = createFakeDocBridge();
		apply({
			kind: "addObjects",
			groupNewObjects: true,
			objects: [
				{ type: "rect", x: 0, y: 0 },
				{ type: "rect", x: 200, y: 0 },
			],
		});

		const result = apply({
			kind: "addObjects",
			parentGroupId: "group-1",
			objects: [{ type: "rect", x: 400, y: 0 }],
		});

		expect(result.ok).toBe(true);
		expect(currentDoc().root.map((object) => object.id)).toEqual(["group-1"]);
		expect(
			(rootObject(currentDoc(), "group-1").children as ObjectDoc[]).map(
				(child) => child.id,
			),
		).toEqual(["rect-1", "rect-2", "rect-3"]);
	});

	it("addObjects は行き先の指定が 2 つあると ok:false で返す", () => {
		const { apply, replacedDocs } = createFakeDocBridge();

		const result = apply({
			kind: "addObjects",
			groupNewObjects: true,
			parentGroupId: "group-1",
			objects: [{ type: "rect", x: 0, y: 0 }],
		});

		expect(result.ok).toBe(false);
		expect(replacedDocs).toHaveLength(0);
	});

	it("addToGroup / removeFromGroup はグループの出し入れをする", () => {
		const { apply, currentDoc } = createFakeDocBridge();
		apply({
			kind: "addObjects",
			groupNewObjects: true,
			objects: [
				{ type: "rect", x: 0, y: 0 },
				{ type: "rect", x: 200, y: 0 },
			],
		});
		apply({ kind: "addObject", type: "rect", x: 400, y: 0 });

		const added = apply({
			kind: "addToGroup",
			groupId: "group-1",
			ids: ["rect-3"],
		});
		expect(added.ok).toBe(true);
		expect(currentDoc().root.map((object) => object.id)).toEqual(["group-1"]);

		const removed = apply({ kind: "removeFromGroup", ids: ["rect-1"] });
		expect(removed.ok).toBe(true);
		expect(currentDoc().root.map((object) => object.id)).toEqual([
			"group-1",
			"rect-1",
		]);
	});

	it("最後の 1 つを取り出すとグループごと消えたことを結果文で知らせる", () => {
		const { apply } = createFakeDocBridge();
		apply({
			kind: "addObjects",
			groupNewObjects: true,
			objects: [
				{ type: "rect", x: 0, y: 0 },
				{ type: "rect", x: 200, y: 0 },
			],
		});

		const result = apply({
			kind: "removeFromGroup",
			ids: ["rect-1", "rect-2"],
		});

		expect(result.ok).toBe(true);
		expect(result.text).toContain("group-1");
	});

	it("connect は追加済みの 2 つを結ぶ", () => {
		const { apply, currentDoc } = createFakeDocBridge();
		apply({ kind: "addObject", type: "rect", x: 0, y: 0 });
		apply({ kind: "addObject", type: "rect", x: 300, y: 0 });

		const result = apply({
			kind: "connect",
			sourceId: "rect-1",
			targetId: "rect-2",
			endArrow: "FilledTriangle",
			label: "yes",
		});

		expect(result.ok).toBe(true);
		expect(currentDoc().root).toHaveLength(3);
		expect(rootObject(currentDoc(), "connector-1")).toMatchObject({
			type: "connector",
			label: { text: "yes" },
		});
	});

	it("未知の型は ok:false で返し、doc を変更しない", () => {
		const { apply, replacedDocs } = createFakeDocBridge();

		const result = apply({
			kind: "addObject",
			type: "nonexistent",
			x: 0,
			y: 0,
		});

		expect(result.ok).toBe(false);
		expect(result.text).toContain("nonexistent");
		expect(replacedDocs).toHaveLength(0);
	});

	// AI が作った doc はファイル保存・下書き復元でパーサーを通る。
	// ここが落ちると「描けたのに開き直せない」になる
	it("AI が組み立てた doc はパーサーを通る", () => {
		const { apply, currentDoc } = createFakeDocBridge();
		apply({ kind: "addObject", type: "stadium", x: 0, y: 0, text: "開始" });
		apply({ kind: "addObject", type: "diamond", x: 0, y: 200 });
		apply({
			kind: "connect",
			sourceId: "stadium-1",
			targetId: "diamond-1",
			sourceAnchor: "bottomCenter",
			targetAnchor: "topCenter",
			endArrow: "FilledTriangle",
			label: "はい",
		});
		apply({ kind: "setStyle", ids: ["diamond-1"], style: { fill: "#fff3cd" } });
		apply({ kind: "setText", id: "diamond-1", text: "2FA 有効？" });
		apply({ kind: "setPosition", id: "diamond-1", x: 40 });

		const parseResult = createCanvasParser({ plugins: docPlugins }).parse(
			JSON.stringify(currentDoc()),
		);

		expect(parseResult.kind).toBe("ok");
	});

	it("存在しない id への connect は ok:false で返す", () => {
		const { apply, replacedDocs } = createFakeDocBridge();

		const result = apply({
			kind: "connect",
			sourceId: "rect-1",
			targetId: "rect-2",
		});

		expect(result.ok).toBe(false);
		expect(result.text).toContain("rect-1");
		expect(replacedDocs).toHaveLength(0);
	});

	it("deleteObjects は巻き添えで消えたコネクターも結果文に載せる", () => {
		const { apply, currentDoc } = createFakeDocBridge();
		apply({ kind: "addObject", type: "rect", x: 0, y: 0 });
		apply({ kind: "addObject", type: "rect", x: 300, y: 0 });
		apply({ kind: "connect", sourceId: "rect-1", targetId: "rect-2" });

		const result = apply({ kind: "deleteObjects", ids: ["rect-2"] });

		expect(result.ok).toBe(true);
		expect(result.text).toContain("connector-1");
		expect(currentDoc().root.map((object) => object.id)).toEqual(["rect-1"]);
	});

	it("setStyle は型が受け取れなかったプロパティを結果文で知らせる", () => {
		const { apply, currentDoc } = createFakeDocBridge();
		apply({ kind: "addObject", type: "rect", x: 0, y: 0 });
		apply({ kind: "addObject", type: "rect", x: 300, y: 0 });
		apply({ kind: "connect", sourceId: "rect-1", targetId: "rect-2" });

		const result = apply({
			kind: "setStyle",
			ids: ["connector-1"],
			style: { stroke: "#c62828", fill: "#ffffff" },
		});

		expect(result.ok).toBe(true);
		expect(result.text).toContain("fill");
		expect(rootObject(currentDoc(), "connector-1")).toMatchObject({
			stroke: "#c62828",
		});
	});
});

describe("配置を変える操作", () => {
	/** 100x100 の rect を 3 つ、横に間を空けて置いた doc */
	const threeRects = () => {
		const fake = createFakeDocBridge();
		for (const x of [0, 200, 500]) {
			fake.apply({
				kind: "addObject",
				type: "rect",
				x,
				y: 0,
				width: 100,
				height: 100,
			});
		}
		return fake;
	};

	it("setPosition は省いた軸を「そのまま」と結果文に書く", () => {
		const { apply, currentDoc } = threeRects();

		const result = apply({ kind: "setPosition", id: "rect-1", y: 300 });

		expect(result.text).toBe('moved "rect-1" to (unchanged, 300)');
		expect(rootObject(currentDoc(), "rect-1")).toMatchObject({ x: 0, y: 300 });
	});

	it("translateObjects はまとめてずらし、図形どうしの間隔を保つ", () => {
		const { apply, currentDoc } = threeRects();

		const result = apply({
			kind: "translateObjects",
			ids: ["rect-1", "rect-2"],
			deltaX: 50,
			deltaY: -10,
		});

		expect(result.ok).toBe(true);
		expect(rootObject(currentDoc(), "rect-1")).toMatchObject({ x: 50, y: -10 });
		expect(rootObject(currentDoc(), "rect-2")).toMatchObject({
			x: 250,
			y: -10,
		});
	});

	it("resizeObject は省いた軸を「そのまま」と結果文に書く", () => {
		const { apply, currentDoc } = threeRects();

		const result = apply({ kind: "resizeObject", id: "rect-1", width: 240 });

		expect(result.text).toBe('resized "rect-1" to 240 x unchanged');
		expect(rootObject(currentDoc(), "rect-1")).toMatchObject({
			width: 240,
			height: 100,
		});
	});

	it("setHeightMode auto は height を doc から外す", () => {
		const { apply, currentDoc } = threeRects();

		const result = apply({
			kind: "setHeightMode",
			ids: ["rect-1"],
			mode: "auto",
		});

		expect(result.ok).toBe(true);
		expect(rootObject(currentDoc(), "rect-1")).not.toHaveProperty("height");
	});

	it("setHeightMode fixed は渡された height を書き戻す", () => {
		const { apply, currentDoc } = threeRects();
		apply({ kind: "setHeightMode", ids: ["rect-1"], mode: "auto" });

		const result = apply({
			kind: "setHeightMode",
			ids: ["rect-1"],
			mode: "fixed",
			height: 160,
		});

		expect(result.text).toBe('set the height of "rect-1" to 160');
		expect(rootObject(currentDoc(), "rect-1")).toMatchObject({ height: 160 });
	});

	// ツール宣言では height が任意なので、fixed で欠けたときの断り方を固定する
	it("setHeightMode fixed は height 無しを断る", () => {
		const { apply } = threeRects();

		const result = apply({
			kind: "setHeightMode",
			ids: ["rect-1"],
			mode: "fixed",
		});

		expect(result.ok).toBe(false);
		expect(result.text).toContain("a fixed height needs the height to write");
	});

	it("alignObjects / distributeObjects は片方の軸だけを動かす", () => {
		const { apply, currentDoc } = threeRects();
		apply({ kind: "setPosition", id: "rect-2", y: 40 });

		expect(
			apply({ kind: "alignObjects", ids: ["rect-1", "rect-2"], edge: "top" }),
		).toMatchObject({ ok: true });
		expect(rootObject(currentDoc(), "rect-2")).toMatchObject({ x: 200, y: 0 });

		const spread = apply({
			kind: "distributeObjects",
			ids: ["rect-1", "rect-2", "rect-3"],
			axis: "horizontal",
			spacing: 20,
		});

		expect(spread.text).toContain("horizontally");
		expect(rootObject(currentDoc(), "rect-2")).toMatchObject({ x: 120 });
		expect(rootObject(currentDoc(), "rect-3")).toMatchObject({ x: 240 });
	});

	it("失敗した操作は doc を差し替えない（描きかけが残らない）", () => {
		const { apply, replacedDocs } = threeRects();
		const replacedCountBeforeFailure = replacedDocs.length;

		const result = apply({
			kind: "translateObjects",
			ids: ["rect-1", "rect-9"],
			deltaX: 10,
			deltaY: 0,
		});

		expect(result.ok).toBe(false);
		expect(result.text).toContain("rect-9");
		expect(replacedDocs).toHaveLength(replacedCountBeforeFailure);
	});
});

describe("テキストとコネクターを直す操作", () => {
	const connectedPair = () => {
		const fake = createFakeDocBridge();
		fake.apply({ kind: "addObject", type: "rect", x: 0, y: 0 });
		fake.apply({ kind: "addObject", type: "rect", x: 300, y: 0 });
		fake.apply({ kind: "connect", sourceId: "rect-1", targetId: "rect-2" });
		return fake;
	};

	it("setText は空文字での消去を書き分ける", () => {
		const { apply } = connectedPair();

		expect(apply({ kind: "setText", id: "rect-1", text: "開始" }).text).toBe(
			'set the text of "rect-1" to "開始"',
		);
		expect(apply({ kind: "setText", id: "rect-1", text: "" }).text).toBe(
			'cleared the text of "rect-1"',
		);
	});

	it("updateConnector は端の付け替えを doc に反映する", () => {
		const { apply, currentDoc } = connectedPair();
		apply({ kind: "addObject", type: "rect", x: 600, y: 0 });

		const result = apply({
			kind: "updateConnector",
			id: "connector-1",
			targetId: "rect-3",
			targetAnchor: "leftCenter",
		});

		expect(result.ok).toBe(true);
		expect(rootObject(currentDoc(), "connector-1")).toMatchObject({
			target: { owner: { id: "rect-3" } },
		});
	});

	it("コネクター以外への updateConnector は ok:false で返す", () => {
		const { apply, replacedDocs } = connectedPair();
		const replacedCountBeforeFailure = replacedDocs.length;

		const result = apply({
			kind: "updateConnector",
			id: "rect-1",
			targetId: "rect-2",
		});

		expect(result.ok).toBe(false);
		expect(replacedDocs).toHaveLength(replacedCountBeforeFailure);
	});
});

describe("回転・頂点・重なり順を変える操作", () => {
	/** rect と polyline を 1 つずつ持つ doc。polyline は回らない型の代表 */
	const rectAndPolyline = () => {
		const fake = createFakeDocBridge();
		fake.apply({ kind: "addObject", type: "rect", x: 0, y: 0 });
		fake.apply({ kind: "addObject", type: "polyline", x: 300, y: 0 });
		return fake;
	};

	it("setRotation は回した id と角度を結果文に書く", () => {
		const { apply, currentDoc } = rectAndPolyline();

		const result = apply({
			kind: "setRotation",
			ids: ["rect-1"],
			rotation: 45,
		});

		expect(result.ok).toBe(true);
		expect(result.text).toBe('turned "rect-1" to 45°');
		expect(rootObject(currentDoc(), "rect-1")).toMatchObject({ rotation: 45 });
	});

	// 「回したつもりで回っていない」を AI に気付かせる
	it("setRotation は回らなかった id を結果文に載せる", () => {
		const { apply, currentDoc } = rectAndPolyline();

		const result = apply({
			kind: "setRotation",
			ids: ["rect-1", "polyline-1"],
			rotation: 90,
		});

		expect(result.ok).toBe(true);
		expect(result.text).toBe(
			'turned "rect-1" to 90° ("polyline-1" stayed as they were: their type has no rotation)',
		);
		expect(rootObject(currentDoc(), "polyline-1")).not.toHaveProperty(
			"rotation",
		);
	});

	it("setRotation は 1 つも回らなかったらそう書く", () => {
		const { apply } = rectAndPolyline();

		const result = apply({
			kind: "setRotation",
			ids: ["polyline-1"],
			rotation: 90,
		});

		expect(result.ok).toBe(true);
		expect(result.text).toBe(
			'nothing turned: none of "polyline-1" has a rotation of its own',
		);
	});

	it("角度でない値の setRotation は ok:false で返す", () => {
		const { apply, replacedDocs } = rectAndPolyline();
		const replacedCountBeforeFailure = replacedDocs.length;

		const result = apply({
			kind: "setRotation",
			ids: ["rect-1"],
			rotation: Number.NaN,
		});

		expect(result.ok).toBe(false);
		expect(result.text).toContain("finite");
		expect(replacedDocs).toHaveLength(replacedCountBeforeFailure);
	});

	it("setPoints は頂点を丸ごと差し替える", () => {
		const { apply, currentDoc } = rectAndPolyline();

		const result = apply({
			kind: "setPoints",
			id: "polyline-1",
			points: [
				{ x: 0, y: 0 },
				{ x: 40, y: 80 },
				{ x: 120, y: 20 },
			],
		});

		expect(result.ok).toBe(true);
		expect(result.text).toBe('reshaped "polyline-1" to 3 vertices');
		expect(rootObject(currentDoc(), "polyline-1").points).toEqual([
			{ x: 0, y: 0 },
			{ x: 40, y: 80 },
			{ x: 120, y: 20 },
		]);
	});

	it("頂点を持たない型への setPoints は ok:false で返す", () => {
		const { apply, replacedDocs } = rectAndPolyline();
		const replacedCountBeforeFailure = replacedDocs.length;

		const result = apply({
			kind: "setPoints",
			id: "rect-1",
			points: [
				{ x: 0, y: 0 },
				{ x: 10, y: 10 },
			],
		});

		expect(result.ok).toBe(false);
		expect(result.text).toContain("rect-1");
		expect(replacedDocs).toHaveLength(replacedCountBeforeFailure);
	});

	it("addObject は points で好きな形の poly を作る", () => {
		const { apply, currentDoc } = createFakeDocBridge();

		const result = apply({
			kind: "addObject",
			type: "polygon",
			x: 999,
			y: 999,
			points: [
				{ x: 0, y: 0 },
				{ x: 60, y: 0 },
				{ x: 30, y: 50 },
			],
			rotation: 30,
		});

		expect(result.ok).toBe(true);
		// x / y は無視され、頂点がそのまま形になる
		expect(rootObject(currentDoc(), "polygon-1").points).toEqual([
			{ x: 0, y: 0 },
			{ x: 60, y: 0 },
			{ x: 30, y: 50 },
		]);
		// poly は回らないので rotation は書かれない
		expect(rootObject(currentDoc(), "polygon-1")).not.toHaveProperty(
			"rotation",
		);
	});

	it("reorderObjects は行き先を結果文に書き、親の中で並べ替える", () => {
		const { apply, currentDoc } = rectAndPolyline();
		apply({ kind: "addObject", type: "rect", x: 600, y: 0 });

		const result = apply({
			kind: "reorderObjects",
			ids: ["rect-1"],
			placement: "front",
		});

		expect(result.ok).toBe(true);
		expect(result.text).toBe('restacked "rect-1" to the front');
		expect(currentDoc().root.map((object) => object.id)).toEqual([
			"polyline-1",
			"rect-2",
			"rect-1",
		]);

		const stepped = apply({
			kind: "reorderObjects",
			ids: ["rect-1"],
			placement: "backward",
		});

		expect(stepped.text).toBe('restacked "rect-1" one step backward');
		expect(currentDoc().root.map((object) => object.id)).toEqual([
			"polyline-1",
			"rect-1",
			"rect-2",
		]);
	});

	it("存在しない id の reorderObjects は ok:false で返す", () => {
		const { apply, replacedDocs } = rectAndPolyline();
		const replacedCountBeforeFailure = replacedDocs.length;

		const result = apply({
			kind: "reorderObjects",
			ids: ["rect-9"],
			placement: "back",
		});

		expect(result.ok).toBe(false);
		expect(result.text).toContain("rect-9");
		expect(replacedDocs).toHaveLength(replacedCountBeforeFailure);
	});
});

describe("自由端のコネクター", () => {
	it("片端を座標にした connect は結果文に座標を書く", () => {
		const { apply, currentDoc } = createFakeDocBridge();
		apply({ kind: "addObject", type: "rect", x: 0, y: 0 });

		const result = apply({
			kind: "connect",
			sourceId: "rect-1",
			targetPoint: { x: 400, y: 120 },
		});

		expect(result.ok).toBe(true);
		expect(result.text).toBe(
			'connected "rect-1" → (400, 120) as "connector-1"',
		);
		expect(rootObject(currentDoc(), "connector-1")).toMatchObject({
			source: { owner: { id: "rect-1" } },
		});
	});

	// 両端が浮いた線は polyline の仕事。doc モデルがコネクターとして拒む
	it("両端とも座標の connect は ok:false で返す", () => {
		const { apply, replacedDocs } = createFakeDocBridge();

		const result = apply({
			kind: "connect",
			sourcePoint: { x: 0, y: 0 },
			targetPoint: { x: 100, y: 100 },
		});

		expect(result.ok).toBe(false);
		expect(result.text).toContain("polyline");
		expect(replacedDocs).toHaveLength(0);
	});

	it("updateConnector は付いていた端を座標へ外す", () => {
		const { apply, currentDoc } = createFakeDocBridge();
		apply({ kind: "addObject", type: "rect", x: 0, y: 0 });
		apply({ kind: "addObject", type: "rect", x: 300, y: 0 });
		apply({ kind: "connect", sourceId: "rect-1", targetId: "rect-2" });

		const result = apply({
			kind: "updateConnector",
			id: "connector-1",
			targetPoint: { x: 500, y: 300 },
		});

		expect(result.ok).toBe(true);
		expect(rootObject(currentDoc(), "connector-1")).toMatchObject({
			target: { anchor: { kind: "free" } },
		});
	});
});

describe("グループを組み替える操作", () => {
	const twoRects = () => {
		const fake = createFakeDocBridge();
		fake.apply({ kind: "addObject", type: "rect", x: 0, y: 0 });
		fake.apply({ kind: "addObject", type: "rect", x: 300, y: 0 });
		return fake;
	};

	it("groupObjects と dissolveGroup は互いを打ち消す", () => {
		const { apply, currentDoc } = twoRects();

		const grouped = apply({
			kind: "groupObjects",
			ids: ["rect-1", "rect-2"],
		});

		expect(grouped.text).toContain('as "group-1"');
		expect(currentDoc().root.map((object) => object.id)).toEqual(["group-1"]);

		const dissolved = apply({ kind: "dissolveGroup", id: "group-1" });

		expect(dissolved.text).toContain('"rect-1", "rect-2"');
		expect(currentDoc().root.map((object) => object.id)).toEqual([
			"rect-1",
			"rect-2",
		]);
	});

	it("addObjects は行き先を指定しなければ最前面へ足す", () => {
		const { apply, currentDoc } = twoRects();

		const result = apply({
			kind: "addObjects",
			objects: [
				{ type: "rect", x: 600, y: 0 },
				{ type: "ellipse", x: 900, y: 0 },
			],
		});

		expect(result.text).toBe(
			'added 2 objects: rect "rect-3", ellipse "ellipse-1"',
		);
		expect(currentDoc().root).toHaveLength(4);
	});
});

describe("図を読む操作", () => {
	/** rect 2 つとその間のコネクター、別に group 1 つを持つ doc */
	const readableDoc = () => {
		const fake = createFakeDocBridge();
		fake.apply({
			kind: "addObjects",
			objects: [
				{ type: "rect", x: 0, y: 0, width: 120, height: 80, text: "Login" },
				{ type: "rect", x: 300, y: 0, width: 120, height: 80, text: "Home" },
			],
		});
		fake.apply({ kind: "connect", sourceId: "rect-1", targetId: "rect-2" });
		fake.apply({
			kind: "addObjects",
			groupNewObjects: true,
			objects: [
				{ type: "ellipse", x: 0, y: 300 },
				{ type: "ellipse", x: 300, y: 300 },
			],
		});
		return fake;
	};

	/**
	 * 結果テキストの末尾に付いた JSON 本体を読み直す。JSON は必ず 1 行なので、
	 * 見出しや打ち切りの断り書きが何行あっても最後の改行から後ろで取れる
	 */
	const parseTrailingJson = (text: string): unknown =>
		JSON.parse(text.slice(text.lastIndexOf("\n") + 1));

	it("listObjects はグループの中まで平らに並べ、doc を差し替えない", () => {
		const { apply, replacedDocs } = readableDoc();
		const replacedCountBeforeRead = replacedDocs.length;

		const result = apply({ kind: "listObjects" });

		expect(result.ok).toBe(true);
		expect(result.text).toContain("6 object(s)");
		expect(parseTrailingJson(result.text)).toMatchObject([
			{ id: "rect-1", type: "rect", parentId: null, text: "Login" },
			{ id: "rect-2" },
			{ id: "connector-1", bounds: null },
			{ id: "group-1", parentId: null },
			{ id: "ellipse-1", parentId: "group-1" },
			{ id: "ellipse-2", parentId: "group-1" },
		]);
		// 読み取りは undo 履歴にも doc にも触らない
		expect(replacedDocs).toHaveLength(replacedCountBeforeRead);
	});

	it("listObjects は空のキャンバスを「空」と言い切る", () => {
		const { apply } = createFakeDocBridge();

		const result = apply({ kind: "listObjects" });

		expect(result.ok).toBe(true);
		expect(result.text).toBe("the canvas is empty: it holds no objects at all");
	});

	// 要約が大きくなりすぎたときに、AI が読み直せる JSON のまま切ること
	it("listObjects は上限を超えたら件数を減らし、絞り込みへ誘導する", () => {
		const { apply } = createFakeDocBridge();
		apply({
			kind: "addObjects",
			objects: Array.from({ length: 400 }, (_unused, index) => ({
				type: "rect",
				x: index * 200,
				y: 0,
				width: 120,
				height: 80,
			})),
		});

		const result = apply({ kind: "listObjects" });

		expect(result.ok).toBe(true);
		expect(result.text).toContain("400 object(s)");
		expect(result.text).toContain("of 400 objects");
		expect(result.text).toContain("find_objects");
		const shown = parseTrailingJson(result.text);
		expect(Array.isArray(shown)).toBe(true);
		expect((shown as unknown[]).length).toBeGreaterThan(0);
		expect((shown as unknown[]).length).toBeLessThan(400);
	});

	it("findObjects は条件に合うものだけを返す", () => {
		const { apply } = readableDoc();

		const result = apply({ kind: "findObjects", type: "rect", text: "login" });

		expect(result.ok).toBe(true);
		expect(result.text).toContain("1 match(es)");
		expect(parseTrailingJson(result.text)).toMatchObject([{ id: "rect-1" }]);
	});

	// 0 件は「条件に合うものが無い」であって失敗ではない
	it("findObjects の 0 件は ok:true で、条件の緩め方を添える", () => {
		const { apply, replacedDocs } = readableDoc();
		const replacedCountBeforeRead = replacedDocs.length;

		const result = apply({ kind: "findObjects", type: "rect", text: "Signup" });

		expect(result.ok).toBe(true);
		expect(result.text).toBe(
			"no object matches: the canvas holds 6 object(s), and every condition you gave has to hold at once, so drop one of them or widen it",
		);
		expect(replacedDocs).toHaveLength(replacedCountBeforeRead);
	});

	it("findObjects は inGroup がグループでなければ ok:false で返す", () => {
		const { apply } = readableDoc();

		const result = apply({ kind: "findObjects", inGroup: "rect-1" });

		expect(result.ok).toBe(false);
		expect(result.text).toContain("rect-1");
	});

	it("getObject は 1 つを丸ごと JSON で返す", () => {
		const { apply } = readableDoc();

		const result = apply({ kind: "getObject", id: "rect-1" });

		expect(result.ok).toBe(true);
		expect(parseTrailingJson(result.text)).toMatchObject({
			id: "rect-1",
			type: "rect",
			x: 0,
			y: 0,
			width: 120,
			height: 80,
		});
	});

	// id が doc に無いのは失敗。0 件・null と区別が付くこと
	it("存在しない id の getObject は ok:false で返す", () => {
		const { apply } = readableDoc();

		const result = apply({ kind: "getObject", id: "rect-9" });

		expect(result.ok).toBe(false);
		expect(result.text).toContain("rect-9");
	});

	it("getObjectBounds は右端・下端まで書き、測れない型はそう断る", () => {
		const { apply } = readableDoc();

		expect(apply({ kind: "getObjectBounds", id: "rect-2" }).text).toBe(
			'"rect-2" occupies (300, 0) 120 x 80 px, so the right edge is x 420 and the bottom edge y 80',
		);

		const connector = apply({ kind: "getObjectBounds", id: "connector-1" });

		expect(connector.ok).toBe(true);
		expect(connector.text).toContain("no box of its own");
	});

	it("getCombinedBounds は ids を省くと図全体を測る", () => {
		const { apply } = readableDoc();

		const whole = apply({ kind: "getCombinedBounds" });

		expect(whole.text).toBe(
			"the whole drawing occupies (0, 0) 420 x 400 px, so the right edge is x 420 and the bottom edge y 400",
		);
		expect(
			apply({ kind: "getCombinedBounds", ids: ["rect-1"] }).text,
		).toContain('"rect-1" together occupy');
		expect(apply({ kind: "getCombinedBounds", ids: ["connector-1"] }).ok).toBe(
			true,
		);
	});

	it("getText は空のテキストを「無い」と書き分ける", () => {
		const { apply } = readableDoc();

		expect(apply({ kind: "getText", id: "rect-1" }).text).toBe(
			'the text of "rect-1" is "Login"',
		);
		expect(apply({ kind: "getText", id: "ellipse-1" }).text).toContain(
			"holds no text",
		);
	});

	it("getZOrder は既に最前面なら並べ替えても変わらないと言う", () => {
		const { apply } = readableDoc();

		const front = apply({ kind: "getZOrder", id: "group-1" });

		expect(front.ok).toBe(true);
		expect(front.text).toContain("index 3 of 4 sibling(s)");
		expect(front.text).toContain("already drawn over its siblings");
		expect(apply({ kind: "getZOrder", id: "ellipse-1" }).text).toContain(
			"index 0 of 2 sibling(s)",
		);
	});

	// root 直下の null は「グループに入っていない」であって失敗ではない
	it("getParentGroup は root 直下を ok:true で返す", () => {
		const { apply } = readableDoc();

		const atRoot = apply({ kind: "getParentGroup", id: "rect-1" });

		expect(atRoot.ok).toBe(true);
		expect(atRoot.text).toBe(
			'"rect-1" sits at the top level of the canvas, in no group',
		);
		expect(apply({ kind: "getParentGroup", id: "ellipse-1" }).text).toBe(
			'"ellipse-1" is held by group "group-1"',
		);
	});

	it("getGroupMembers は直下の子だけを描画順で返す", () => {
		const { apply } = readableDoc();

		const result = apply({ kind: "getGroupMembers", groupId: "group-1" });

		expect(result.ok).toBe(true);
		expect(result.text).toContain('"ellipse-1", "ellipse-2"');
		expect(apply({ kind: "getGroupMembers", groupId: "rect-1" }).ok).toBe(
			false,
		);
	});

	it("getConnectors / getConnectedObjects は 0 件を ok:true で返す", () => {
		const { apply } = readableDoc();

		expect(apply({ kind: "getConnectors", id: "rect-1" }).text).toContain(
			'"connector-1"',
		);
		expect(apply({ kind: "getConnectedObjects", id: "rect-1" }).text).toContain(
			'"rect-2"',
		);

		const lonely = apply({ kind: "getConnectors", id: "ellipse-1" });

		expect(lonely.ok).toBe(true);
		expect(lonely.text).toBe('no connector has an end on "ellipse-1"');
		expect(
			apply({ kind: "getConnectedObjects", id: "ellipse-1" }).text,
		).toContain("reaches no other object");
	});

	it("listTypes は doc を持たずに型の一覧を返す", () => {
		const { apply } = createFakeDocBridge();

		const result = apply({ kind: "listTypes" });

		expect(result.ok).toBe(true);
		expect(parseTrailingJson(result.text)).toContainEqual({
			type: "rect",
			creatable: true,
			connectable: true,
			text: "single",
			geometry: "rect",
			summary: "general-purpose node / label box",
		});
	});
});

describe("一括版の操作", () => {
	/** 100x100 の rect を 3 つ横に並べた doc */
	const threeRects = () => {
		const fake = createFakeDocBridge();
		fake.apply({
			kind: "addObjects",
			objects: [0, 200, 500].map((x) => ({
				type: "rect",
				x,
				y: 0,
				width: 100,
				height: 100,
			})),
		});
		return fake;
	};

	it("connectMany は全件を 1 度に引き、id を順番どおり返す", () => {
		const { apply, replacedDocs, currentDoc } = threeRects();
		const replacedCountBeforeOp = replacedDocs.length;

		const result = apply({
			kind: "connectMany",
			entries: [
				{ sourceId: "rect-1", targetId: "rect-2" },
				{ sourceId: "rect-2", targetPoint: { x: 900, y: 50 } },
			],
		});

		expect(result.ok).toBe(true);
		expect(result.text).toBe(
			'connected 2 connector(s): "rect-1" → "rect-2" as "connector-1", "rect-2" → (900, 50) as "connector-2"',
		);
		// 本数によらず doc の差し替えは 1 回（＝ undo 1 手で戻せる）
		expect(replacedDocs).toHaveLength(replacedCountBeforeOp + 1);
		expect(currentDoc().root).toHaveLength(5);
	});

	it("connectMany は 1 件でも弾かれたら 1 本も引かない", () => {
		const { apply, replacedDocs, currentDoc } = threeRects();
		const replacedCountBeforeFailure = replacedDocs.length;

		const result = apply({
			kind: "connectMany",
			entries: [
				{ sourceId: "rect-1", targetId: "rect-2" },
				{ sourceId: "rect-1", targetId: "rect-9" },
			],
		});

		expect(result.ok).toBe(false);
		expect(result.text).toContain("entries[1]");
		expect(replacedDocs).toHaveLength(replacedCountBeforeFailure);
		expect(currentDoc().root).toHaveLength(3);
	});

	it("setPositions は要素ごとの絶対座標へ置き、省いた軸を書き分ける", () => {
		const { apply, currentDoc } = threeRects();

		const result = apply({
			kind: "setPositions",
			entries: [
				{ id: "rect-1", x: 10, y: 20 },
				{ id: "rect-2", y: 300 },
			],
		});

		expect(result.text).toBe(
			'moved 2 object(s): "rect-1" to (10, 20), "rect-2" to (unchanged, 300)',
		);
		expect(rootObject(currentDoc(), "rect-1")).toMatchObject({ x: 10, y: 20 });
		expect(rootObject(currentDoc(), "rect-2")).toMatchObject({
			x: 200,
			y: 300,
		});
	});

	it("setPositions は 1 件でも弾かれたら 1 つも動かさない", () => {
		const { apply, replacedDocs, currentDoc } = threeRects();
		const replacedCountBeforeFailure = replacedDocs.length;

		const result = apply({
			kind: "setPositions",
			entries: [
				{ id: "rect-1", x: 10, y: 20 },
				{ id: "rect-9", x: 0, y: 0 },
			],
		});

		expect(result.ok).toBe(false);
		expect(result.text).toContain("rect-9");
		expect(replacedDocs).toHaveLength(replacedCountBeforeFailure);
		expect(rootObject(currentDoc(), "rect-1")).toMatchObject({ x: 0, y: 0 });
	});

	it("resizeObjects は ids 全体へ同じサイズを与え、省いた軸は各自のまま", () => {
		const { apply, currentDoc } = threeRects();
		apply({ kind: "resizeObject", id: "rect-2", height: 40 });

		const result = apply({
			kind: "resizeObjects",
			ids: ["rect-1", "rect-2"],
			width: 240,
		});

		expect(result.text).toBe(
			'resized "rect-1", "rect-2" to 240 x unchanged each',
		);
		expect(rootObject(currentDoc(), "rect-1")).toMatchObject({
			width: 240,
			height: 100,
		});
		expect(rootObject(currentDoc(), "rect-2")).toMatchObject({
			width: 240,
			height: 40,
		});
	});

	it("setPointsMany は形ごとに別の輪郭を入れる", () => {
		const { apply, currentDoc } = createFakeDocBridge();
		apply({
			kind: "addObjects",
			objects: [
				{ type: "polyline", x: 0, y: 0 },
				{ type: "polygon", x: 0, y: 300 },
			],
		});

		const result = apply({
			kind: "setPointsMany",
			entries: [
				{
					id: "polyline-1",
					points: [
						{ x: 0, y: 0 },
						{ x: 40, y: 80 },
					],
				},
				{
					id: "polygon-1",
					points: [
						{ x: 0, y: 300 },
						{ x: 60, y: 300 },
						{ x: 30, y: 350 },
					],
				},
			],
		});

		expect(result.text).toBe(
			'reshaped 2 shape(s): "polyline-1" to 2 vertices, "polygon-1" to 3 vertices',
		);
		expect(rootObject(currentDoc(), "polygon-1").points).toHaveLength(3);
	});

	it("setPointsMany は 1 件でも弾かれたら 1 つも変形しない", () => {
		const { apply, replacedDocs, currentDoc } = createFakeDocBridge();
		apply({ kind: "addObject", type: "polyline", x: 0, y: 0 });
		apply({ kind: "addObject", type: "rect", x: 0, y: 300 });
		const pointsBeforeFailure = rootObject(currentDoc(), "polyline-1").points;
		const replacedCountBeforeFailure = replacedDocs.length;

		const result = apply({
			kind: "setPointsMany",
			entries: [
				{
					id: "polyline-1",
					points: [
						{ x: 0, y: 0 },
						{ x: 40, y: 80 },
					],
				},
				// 頂点を持たない型。ここで弾かれる
				{
					id: "rect-1",
					points: [
						{ x: 0, y: 0 },
						{ x: 10, y: 10 },
					],
				},
			],
		});

		expect(result.ok).toBe(false);
		expect(result.text).toContain("entries[1]");
		expect(replacedDocs).toHaveLength(replacedCountBeforeFailure);
		expect(rootObject(currentDoc(), "polyline-1").points).toEqual(
			pointsBeforeFailure,
		);
	});

	it("setTexts はスロットと空文字での消去を書き分ける", () => {
		const { apply, currentDoc } = createFakeDocBridge();
		apply({
			kind: "addObjects",
			objects: [
				{ type: "rect", x: 0, y: 0, text: "old" },
				{ type: "rect", x: 300, y: 0, text: "keep" },
				{ type: "record", x: 600, y: 0 },
			],
		});

		const result = apply({
			kind: "setTexts",
			entries: [
				{ id: "rect-1", text: "開始" },
				{ id: "rect-2", text: "" },
				{ id: "record-1", text: "User", slot: "name" },
			],
		});

		expect(result.text).toBe(
			'set the text of 3 object(s): "rect-1" to "開始", "rect-2" cleared, slot "name" of "record-1" to "User"',
		);
		expect(rootObject(currentDoc(), "rect-1").text).toBe("開始");
		expect(rootObject(currentDoc(), "rect-2").text).toBe("");
	});

	it("setTexts は 1 件でも弾かれたら 1 つも書き換えない", () => {
		const { apply, replacedDocs, currentDoc } = threeRects();
		const replacedCountBeforeFailure = replacedDocs.length;

		const result = apply({
			kind: "setTexts",
			entries: [
				{ id: "rect-1", text: "開始" },
				{ id: "rect-9", text: "終了" },
			],
		});

		expect(result.ok).toBe(false);
		expect(result.text).toContain("entries[1]");
		expect(replacedDocs).toHaveLength(replacedCountBeforeFailure);
		expect(rootObject(currentDoc(), "rect-1").text).toBe("");
	});

	it("updateConnectors は全件の端をまとめて付け替える", () => {
		const { apply, currentDoc } = threeRects();
		apply({
			kind: "connectMany",
			entries: [
				{ sourceId: "rect-1", targetId: "rect-2" },
				{ sourceId: "rect-1", targetId: "rect-3" },
			],
		});

		const result = apply({
			kind: "updateConnectors",
			entries: [
				{ id: "connector-1", sourceAnchor: "rightCenter" },
				{ id: "connector-2", endArrow: "FilledTriangle" },
			],
		});

		expect(result.text).toBe(
			'updated 2 connector(s): "connector-1", "connector-2"',
		);
		expect(rootObject(currentDoc(), "connector-2")).toMatchObject({
			endArrow: "FilledTriangle",
		});
	});

	it("同じ id を 2 度出した updateConnectors は ok:false で返す", () => {
		const { apply, replacedDocs } = threeRects();
		apply({
			kind: "connectMany",
			entries: [{ sourceId: "rect-1", targetId: "rect-2" }],
		});
		const replacedCountBeforeFailure = replacedDocs.length;

		const result = apply({
			kind: "updateConnectors",
			entries: [
				{ id: "connector-1", sourceAnchor: "rightCenter" },
				{ id: "connector-1", targetAnchor: "leftCenter" },
			],
		});

		expect(result.ok).toBe(false);
		expect(result.text).toContain("connector-1");
		expect(replacedDocs).toHaveLength(replacedCountBeforeFailure);
	});

	it("dissolveGroups は入れ子のグループもまとめて解き、解放された id を返す", () => {
		const { apply, currentDoc } = threeRects();
		apply({ kind: "groupObjects", ids: ["rect-1", "rect-2"] });
		apply({ kind: "groupObjects", ids: ["group-1", "rect-3"] });

		const result = apply({
			kind: "dissolveGroups",
			ids: ["group-2", "group-1"],
		});

		expect(result.text).toBe(
			'dissolved "group-2", "group-1", releasing "rect-3", "rect-1", "rect-2"',
		);
		expect(currentDoc().root.map((object) => object.id)).toEqual([
			"rect-1",
			"rect-2",
			"rect-3",
		]);
	});

	it("グループでない id を混ぜた dissolveGroups は 1 つも解かない", () => {
		const { apply, replacedDocs, currentDoc } = threeRects();
		apply({ kind: "groupObjects", ids: ["rect-1", "rect-2"] });
		const replacedCountBeforeFailure = replacedDocs.length;

		const result = apply({
			kind: "dissolveGroups",
			ids: ["group-1", "rect-3"],
		});

		expect(result.ok).toBe(false);
		expect(result.text).toContain("rect-3");
		expect(replacedDocs).toHaveLength(replacedCountBeforeFailure);
		expect(currentDoc().root.map((object) => object.id)).toEqual([
			"group-1",
			"rect-3",
		]);
	});

	it("setTextStyle は本文の一致した箇所だけを装飾する", () => {
		const { apply, currentDoc } = createFakeDocBridge();
		apply({
			kind: "addObject",
			type: "rect",
			x: 0,
			y: 0,
			text: "warning: check warning",
		});

		const result = apply({
			kind: "setTextStyle",
			id: "rect-1",
			match: "warning",
			occurrence: 1,
			fontWeight: "bold",
			fontColor: "#c62828",
		});

		expect(result.text).toBe('styled occurrence 1 of "warning" in "rect-1"');
		expect(rootObject(currentDoc(), "rect-1").text).toEqual([
			{ text: "warning", fontColor: "#c62828", fontWeight: "bold" },
			{ text: ": check warning" },
		]);
	});

	it("一致が無い setTextStyle は ok:false で doc を変えない", () => {
		const { apply, replacedDocs, currentDoc } = createFakeDocBridge();
		apply({ kind: "addObject", type: "rect", x: 0, y: 0, text: "hello" });
		const replacedCountBeforeFailure = replacedDocs.length;

		const result = apply({
			kind: "setTextStyle",
			id: "rect-1",
			match: "missing",
			fontWeight: "bold",
		});

		expect(result.ok).toBe(false);
		expect(result.text).toContain("missing");
		expect(replacedDocs).toHaveLength(replacedCountBeforeFailure);
		expect(rootObject(currentDoc(), "rect-1").text).toBe("hello");
	});

	it("setTextStyles は 1 件でも一致が無ければ 1 つも装飾しない", () => {
		const { apply, replacedDocs, currentDoc } = createFakeDocBridge();
		apply({
			kind: "addObjects",
			objects: [
				{ type: "rect", x: 0, y: 0, text: "hello world" },
				{ type: "rect", x: 300, y: 0, text: "hello" },
			],
		});
		const replacedCountBeforeFailure = replacedDocs.length;

		const result = apply({
			kind: "setTextStyles",
			entries: [
				{ id: "rect-1", match: "world", fontStyle: "italic" },
				{ id: "rect-2", match: "world", fontStyle: "italic" },
			],
		});

		expect(result.ok).toBe(false);
		expect(result.text).toContain("entries[1]");
		expect(replacedDocs).toHaveLength(replacedCountBeforeFailure);
		expect(rootObject(currentDoc(), "rect-1").text).toBe("hello world");
	});

	it("setTextStyles は同じ id を並べて 1 本の文中の複数箇所を装飾する", () => {
		const { apply, currentDoc } = createFakeDocBridge();
		apply({
			kind: "addObject",
			type: "rect",
			x: 0,
			y: 0,
			text: "ok and ng",
		});

		const result = apply({
			kind: "setTextStyles",
			entries: [
				{ id: "rect-1", match: "ok", fontColor: "#2e7d32" },
				{ id: "rect-1", match: "ng", fontColor: "#c62828" },
			],
		});

		expect(result.text).toBe(
			'styled 2 stretch(es) of text: every occurrence of "ok" in "rect-1", every occurrence of "ng" in "rect-1"',
		);
		expect(rootObject(currentDoc(), "rect-1").text).toEqual([
			{ text: "ok", fontColor: "#2e7d32" },
			{ text: " and " },
			{ text: "ng", fontColor: "#c62828" },
		]);
	});
});

describe("undo", () => {
	it("直前の 1 手を戻し、履歴が尽きたら ok:false で返す", () => {
		const { apply, currentDoc } = createFakeDocBridge();
		apply({ kind: "addObject", type: "rect", x: 0, y: 0 });
		apply({ kind: "addObject", type: "rect", x: 300, y: 0 });

		expect(apply({ kind: "undo" }).ok).toBe(true);
		expect(currentDoc().root.map((object) => object.id)).toEqual(["rect-1"]);

		expect(apply({ kind: "undo" }).ok).toBe(true);
		expect(currentDoc().root).toHaveLength(0);

		const exhausted = apply({ kind: "undo" });
		expect(exhausted.ok).toBe(false);
		expect(exhausted.text).toContain("nothing");
	});

	// ユーザーの編集を AI に消させない。ここが緩むと手作業が黙って消える
	it("AI の適用後にユーザーが編集していたら戻さない", () => {
		const { apply, bridge, currentDoc } = createFakeDocBridge();
		apply({ kind: "addObject", type: "rect", x: 0, y: 0 });

		const userEditedDoc = structuredClone(currentDoc());
		userEditedDoc.root = [];
		bridge.replaceDoc(userEditedDoc);

		const result = apply({ kind: "undo" });

		expect(result.ok).toBe(false);
		expect(currentDoc()).toBe(userEditedDoc);
	});
});
