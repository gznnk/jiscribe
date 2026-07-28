import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * record（区画付きボックス）= 1 図形に複数のテキストスロットを持つ最初の型。
 * 守る挙動:
 * - uml フライアウトから作成でき、複合 <g> ＋区画ごとの data-part で描画される
 * - タイトル帯のダブルクリックは name スロット、行区画のダブルクリックは rows
 *   スロットの編集になる（data-part によるスロット解決）
 * - 片方のスロットを編集中でも、もう片方のテキストは表示されたまま
 * - 行を増やしても箱は自動リサイズされない（高さはドラッグしたまま）
 * - タイトル帯だけはタイトルの表示行数（改行・折り返し）に追従して伸びる
 *
 * 座標メモ: 作成サイズ 220x80 → 空タイトルのタイトル帯は上端 28px
 * （content y=[200,228]）、行区画はその下（y=[228,280]）。
 */

const CATEGORY = "uml";

const RECORD_FROM = { x: 300, y: 200 };
const RECORD_TO = { x: 520, y: 280 };
/** タイトル帯の中（上端から 28px 以内）。 */
const NAME_SPOT = { x: 410, y: 212 };
/** 行区画の中（タイトル帯より下）。 */
const ROWS_SPOT = { x: 410, y: 255 };

/** uml フライアウトから record を対角ドラッグで作成し、新規オブジェクトの {id, tag} を返す。 */
async function createRecord(
	canvas: CanvasDriver,
	from: { x: number; y: number },
	to: { x: number; y: number },
): Promise<{ id: string; tag: string }> {
	const id = await canvas.drawShapeFromFlyout(CATEGORY, "record", from, to);
	const created = (await canvas.captureObjects()).find((obj) => obj.id === id);
	return { id, tag: created?.tag ?? "" };
}

/** 区画矩形（data-part）の局所座標での y と height。帯の伸縮を読む手段。 */
async function partRect(
	canvas: CanvasDriver,
	id: string,
	part: "name" | "rows",
): Promise<{ y: number; height: number }> {
	const rect = await canvas.page.evaluate(
		({ objectId, partName }) => {
			const el = document.querySelector(
				`[data-kind="object"][data-id="${objectId}"] [data-part="${partName}"]`,
			);
			if (!el) {
				return null;
			}
			return {
				y: Number(el.getAttribute("y")),
				height: Number(el.getAttribute("height")),
			};
		},
		{ objectId: id, partName: part },
	);
	if (!rect) {
		throw new Error(`区画 ${part} の矩形が見つからない`);
	}
	return rect;
}

/** 枠線矩形（fill:none で特定）の height 属性。箱の高さを読む手段。 */
async function outlineHeight(
	canvas: CanvasDriver,
	id: string,
): Promise<number | null> {
	return canvas.page.evaluate((objectId) => {
		const group = document.querySelector(`[data-id="${objectId}"]`);
		if (!group) {
			return null;
		}
		const outline = [...group.querySelectorAll("rect")].find(
			(rect) => getComputedStyle(rect).fill === "none",
		);
		const height = outline?.getAttribute("height");
		return height === null || height === undefined ? null : Number(height);
	}, id);
}

test.describe("record（区画付きボックス）", () => {
	test("uml フライアウトから作成でき、区画ごとに data-part が付く", async ({
		canvas,
	}) => {
		const record = await createRecord(canvas, RECORD_FROM, RECORD_TO);
		// 1 オブジェクト = 1 つの data-kind=object 要素（区画は data-part だけを持つ）。
		expect(record.tag).toBe("g");

		const parts = await canvas.page.evaluate((id) => {
			const group = document.querySelector(`[data-id="${id}"]`);
			if (!group) {
				return [];
			}
			return [...group.querySelectorAll("[data-part]")].map((el) =>
				el.getAttribute("data-part"),
			);
		}, record.id);
		expect(parts).toEqual(["name", "rows"]);
	});

	test("タイトル帯と行区画で編集されるスロットが切り替わる", async ({
		canvas,
	}) => {
		await createRecord(canvas, RECORD_FROM, RECORD_TO);
		await canvas.deselect();

		// タイトル帯のダブルクリック → name スロット（空から開く）。
		await canvas.typeTextAt(NAME_SPOT, "User");
		await expect(canvas.textArea()).toHaveValue("User");
		await canvas.commitText();
		await expect(canvas.page.locator("body")).toContainText("User");

		// 行区画のダブルクリック → rows スロット。name の内容は入っていない。
		await canvas.typeTextAt(ROWS_SPOT, "id: string");
		await expect(canvas.textArea()).toHaveValue("id: string");
		// 編集中でないスロット（name）のテキストは表示されたまま。
		await expect(canvas.page.locator("body")).toContainText("User");
		await canvas.commitText();

		// 再度行区画を開くと、コミットされた行が "\n" 連結で戻ってくる。
		await canvas.typeTextAt(ROWS_SPOT, "");
		await expect(canvas.textArea()).toHaveValue("id: string");
		await canvas.cancelText();
	});

	test("回転した record でもテキストエディタが行区画に重なる", async ({
		canvas,
	}) => {
		// スロット領域が図形中心からずれた最初の型なので、エディタの変換合成が
		// 表示側（SVG）とずれると回転時にだけ顕在化する（transform-origin 回帰の検知）。
		const record = await createRecord(canvas, RECORD_FROM, RECORD_TO);
		await canvas.selectAt({ x: 410, y: 240 });

		// 回転ハンドルを右下へ振って大きく傾ける（角度の正確さは要らない）。
		await canvas.dragTransformHandle("rotation", { x: 540, y: 300 });
		// 接続アンカー（control）も同じ data-id を持つため、object 本体に絞る。
		const group = canvas.page.locator(
			`[data-kind="object"][data-id="${record.id}"]`,
		);
		await expect
			.poll(
				async () => {
					const transform = (await group.getAttribute("transform")) ?? "";
					const b = transform.match(/matrix\(([^)]+)\)/)?.[1]?.split(",")[1];
					return Math.abs(Number(b));
				},
				{ message: "回転で b 成分（sinθ）が 0 から外れること" },
			)
			.toBeGreaterThan(0.3);
		await canvas.deselect();

		// 回転後の行区画を直接ダブルクリックして rows 編集を開く。
		const rows = group.locator('[data-part="rows"]');
		await rows.dblclick();
		await expect(canvas.textArea()).toBeVisible();

		// エディタ枠は行区画と同じ局所矩形＋同じ変換なので、画面上の外接箱が一致する。
		const editorBox = await canvas.page
			.locator('[data-testid="text-editor"]')
			.boundingBox();
		const rowsBox = await rows.boundingBox();
		if (!editorBox || !rowsBox) {
			throw new Error("エディタ枠または行区画の外接箱が取得できない");
		}
		expect(Math.abs(editorBox.x - rowsBox.x)).toBeLessThan(1.5);
		expect(Math.abs(editorBox.y - rowsBox.y)).toBeLessThan(1.5);
		expect(Math.abs(editorBox.width - rowsBox.width)).toBeLessThan(1.5);
		expect(Math.abs(editorBox.height - rowsBox.height)).toBeLessThan(1.5);
		await canvas.cancelText();
	});

	test("行を追加しても箱の高さは変わらない", async ({ canvas }) => {
		const record = await createRecord(canvas, RECORD_FROM, RECORD_TO);
		await canvas.deselect();

		expect(await outlineHeight(canvas, record.id)).toBe(80);

		// 行区画に収まらない行数（ヘッダ + パディング(32) + 21 × 3 = 95 > 80）。
		await canvas.typeTextAt(
			ROWS_SPOT,
			"id: string\nname: string\nemail: string",
		);
		await canvas.commitText();

		// 収まらない行は区画でクリップされるだけで、高さは自動補正されない。
		expect(await outlineHeight(canvas, record.id)).toBe(80);

		// コミット自体は成立している（再度開くと 3 行が "\n" 連結で戻る）。
		await canvas.typeTextAt(ROWS_SPOT, "");
		await expect(canvas.textArea()).toHaveValue(
			"id: string\nname: string\nemail: string",
		);
		await canvas.cancelText();
	});

	test("タイトルが複数行になるとタイトル帯が伸びる", async ({ canvas }) => {
		const record = await createRecord(canvas, RECORD_FROM, RECORD_TO);
		await canvas.deselect();

		expect((await partRect(canvas, record.id, "name")).height).toBe(28);

		// 明示改行の 2 行タイトル → 1 行ぶん（14 × 1.5 = 21）伸びる。
		await canvas.typeTextAt(NAME_SPOT, "User\nAccount");
		await canvas.commitText();
		await expect
			.poll(async () => (await partRect(canvas, record.id, "name")).height, {
				message: "2 行のタイトルで帯が 1 行ぶん伸びること",
			})
			.toBe(49);

		// 行区画は伸びた帯の直下から始まる（隙間も重なりも作らない）。
		const name = await partRect(canvas, record.id, "name");
		const rows = await partRect(canvas, record.id, "rows");
		expect(rows.y).toBeCloseTo(name.y + name.height, 3);

		// 伸びるのは帯だけで、箱の高さは自動リサイズされない。
		expect(await outlineHeight(canvas, record.id)).toBe(80);
	});

	test("幅に収まらないタイトルは折り返して帯が伸びる", async ({ canvas }) => {
		const record = await createRecord(canvas, RECORD_FROM, RECORD_TO);
		await canvas.deselect();

		// 220px の箱（テキストの使える幅は 208px）に 1 行では収まらない長さ。
		await canvas.typeTextAt(NAME_SPOT, "Authentication Provider Configuration");
		await canvas.commitText();

		// 帯の高さは常に「行数 × 21 + 7」なので、49 以上なら 2 行以上に折り返している。
		await expect
			.poll(async () => (await partRect(canvas, record.id, "name")).height, {
				message: "折り返したタイトルで帯が 2 行以上ぶんに伸びること",
			})
			.toBeGreaterThanOrEqual(49);
	});
});
