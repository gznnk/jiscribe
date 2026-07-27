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
 *
 * 座標メモ: 作成サイズ 220x80 → タイトル帯は上端 28px（content y=[200,228]）、
 * 行区画はその下（y=[228,280]）。
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
});
