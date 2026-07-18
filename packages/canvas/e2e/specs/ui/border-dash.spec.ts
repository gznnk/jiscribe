import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * 矩形の枠線の線種（border-style セクションの strokeDashType）を守る。
 *
 * object-menu.spec はポリラインの line-style（破線）を、connector-style はコネクターの線種を見るが、
 * 図形の枠線（border-style）の破線・点線は未カバーだった。RectElement は stroke-dasharray を
 * SVG 属性として描くため、属性値のパターンで線種を検証する
 * （dashed = 等値ペア "n n"、dotted = 1:2 ペア "n 2n"、solid = 属性なし）。
 *
 * 注意: border-style ドロップダウンは選択後も開いたままなので、ドライバの setStrokeDashType を
 * 連続で呼ぶとトグルが閉じてしまう。set ボタンが見えていなければ開く方式で複数回の変更に対応する。
 */

/** border-style の strokeDashType を設定する（必要時のみセクションを開く） */
async function setBorderDash(
	canvas: CanvasDriver,
	value: "solid" | "dashed" | "dotted",
) {
	const setButton = canvas.page.locator(
		selectors.objectMenuSet("strokeDashType", value),
	);
	if (!(await setButton.isVisible())) {
		await canvas.openObjectMenu("border-style");
	}
	await setButton.click();
}

/** rect の stroke-dasharray 属性（未設定なら null） */
async function dashArray(
	canvas: CanvasDriver,
	id: string,
): Promise<string | null> {
	return canvas.objectById(id).getAttribute("stroke-dasharray");
}

/** "a b" を数値ペアに分解 */
function pair(value: string | null): [number, number] {
	const [a, b] = (value ?? "").trim().split(/\s+/).map(Number);
	return [a, b];
}

test.describe("矩形の枠線の線種（border-style）", () => {
	test("破線・点線で stroke-dasharray のパターンが切り替わる", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);

		await setBorderDash(canvas, "dashed");
		await expect.poll(() => dashArray(canvas, id)).not.toBeNull();
		const [dashOn, dashOff] = pair(await dashArray(canvas, id));
		// 破線は等値ペア（n n）。
		expect(dashOn).toBeGreaterThan(0);
		expect(dashOn).toBe(dashOff);

		await setBorderDash(canvas, "dotted");
		await expect
			.poll(async () => {
				const [on, off] = pair(await dashArray(canvas, id));
				return on > 0 && off === on * 2;
			})
			.toBe(true);
	});

	test("実線に戻すと stroke-dasharray が外れる", async ({ canvas }) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);

		await setBorderDash(canvas, "dashed");
		await expect.poll(() => dashArray(canvas, id)).not.toBeNull();

		await setBorderDash(canvas, "solid");
		await expect.poll(() => dashArray(canvas, id)).toBeNull();
	});
});
