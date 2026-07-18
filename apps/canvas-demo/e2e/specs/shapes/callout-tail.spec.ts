import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * callout の足（tail）の付け替えを守る:
 * - 選択時に足の先端にハンドル（selection:callout:tailTip）が出る
 * - ハンドルの自由ドラッグで side / position が変わり、パスが追従する
 */

const TAIL_HANDLE =
	'[data-kind="control"][data-part="selection:callout:tailTip"]';

/** annotation フライアウトから callout を対角ドラッグで作成し、新規 id を返す。 */
async function createCallout(
	canvas: CanvasDriver,
	from: { x: number; y: number },
	to: { x: number; y: number },
): Promise<string> {
	const before = await canvas.captureObjects();
	const beforeIds = new Set(before.map((obj) => obj.id));

	await canvas.page.click(selectors.categoryButton("annotation"));
	const item = canvas.page.locator(selectors.shapeItem("callout"));
	await expect(item).toBeVisible();
	await item.click();

	await canvas.drag(from, to);
	await expect
		.poll(async () => (await canvas.captureObjects()).length, {
			message: "callout が1つ作成されること",
		})
		.toBe(before.length + 1);

	const created = (await canvas.captureObjects()).find(
		(obj) => !beforeIds.has(obj.id),
	);
	if (!created?.id) {
		throw new Error("callout の data-id が取得できない");
	}
	return created.id;
}

/** 対象 callout の path d 属性を読む。 */
async function calloutPathD(
	canvas: CanvasDriver,
	id: string,
): Promise<string | null> {
	return canvas.page.evaluate((objectId) => {
		const el = document.querySelector(`[data-id="${objectId}"]`);
		return el?.getAttribute("d") ?? null;
	}, id);
}

test.describe("callout 足の付け替え", () => {
	test("先端ハンドルを右辺へドラッグすると足が右向きになりパスが追従する", async ({
		canvas,
	}) => {
		// 200x160 の callout（content 座標 x=[300,500], y=[220,380]）。
		const id = await createCallout(
			canvas,
			{ x: 300, y: 220 },
			{ x: 500, y: 380 },
		);

		// 作成直後は選択済みで、デフォルトの足先端（下辺 position 0.2 = x=340, y=380）にハンドルが出る。
		const handle = canvas.page.locator(TAIL_HANDLE);
		await expect(handle).toBeVisible();

		const before = await calloutPathD(canvas, id);
		expect(before).toBeTruthy();

		// 先端を右辺中央（x=500, y=300）へドラッグ → side=right / position=0.5。
		await canvas.drag({ x: 340, y: 380 }, { x: 500, y: 300 });

		// パスが変わり、先端がローカル右辺中央 (100, 0) に移る
		// （200x160 の callout: ローカル座標は中心原点、右辺 x=100）。
		await expect
			.poll(async () => calloutPathD(canvas, id), {
				message: "足の付け替えでパスが更新されること",
			})
			.not.toBe(before);
		const after = await calloutPathD(canvas, id);
		expect(after).toContain("L 100 0");
	});
});
