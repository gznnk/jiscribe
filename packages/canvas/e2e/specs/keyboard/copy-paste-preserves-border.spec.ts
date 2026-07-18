import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * コピー＆ペースト／複製が枠線系プロパティ（角丸 rx・線幅 strokeWidth・線種 strokeDashType）を
 * 引き継ぐことを守る。
 *
 * 既存の preserves 系は fill / text / font / transform を見るが、border-style セクションの
 * プロパティはクリップボードのシリアライズで保たれるか未カバーだった。rect は rx / stroke-width /
 * stroke-dasharray を SVG 属性として描くため、複製先の属性で照合する。
 * （コピペは handlePaste、複製は DuplicateCommand と別経路なので両方守る。）
 */

type BorderAttrs = {
	rx: string | null;
	strokeWidth: string | null;
	dash: string | null;
};

/** rect の枠線系属性をまとめて読む */
async function borderAttrs(
	canvas: CanvasDriver,
	id: string,
): Promise<BorderAttrs> {
	const el = canvas.objectById(id);
	return {
		rx: await el.getAttribute("rx"),
		strokeWidth: await el.getAttribute("stroke-width"),
		dash: await el.getAttribute("stroke-dasharray"),
	};
}

/** rect を描いて角丸・線幅・破線を設定し、id と設定後の属性を返す（設定後は選択解除済み） */
async function drawBorderedRect(
	canvas: CanvasDriver,
): Promise<{ id: string; attrs: BorderAttrs }> {
	const id = await canvas.drawShape(
		"Rectangle",
		{ x: 380, y: 200 },
		{ x: 620, y: 360 },
	);

	// border-style セクションを開き、角丸・線幅・破線を設定する（同一ドロップダウン内）。
	await canvas.openObjectMenu("border-style");
	await canvas.setNumberInput("rx", 16);
	await canvas.setNumberInput("strokeWidth", 6);
	await canvas.page.click(selectors.objectMenuSet("strokeDashType", "dashed"));

	await expect.poll(async () => (await borderAttrs(canvas, id)).rx).toBe("16");
	const attrs = await borderAttrs(canvas, id);
	expect(attrs.strokeWidth).toBe("6");
	expect(attrs.dash).not.toBeNull();

	// 数値入力欄にフォーカスが残ると Ctrl+C/V/D が吸われるため、選択解除してフォーカスを戻す。
	await canvas.deselect();
	return { id, attrs };
}

/** 直近で増えた図形の id を返す */
async function newObjectId(
	canvas: CanvasDriver,
	beforeIds: Set<string | null>,
): Promise<string> {
	const created = (await canvas.captureObjects()).find(
		(obj) => !beforeIds.has(obj.id),
	);
	if (!created?.id) {
		throw new Error("増えた図形の data-id が取得できない");
	}
	return created.id;
}

test.describe("コピー＆ペースト／複製の枠線プロパティ保持", () => {
	test("コピー＆ペーストは角丸・線幅・線種を引き継ぐ", async ({ canvas }) => {
		const { attrs } = await drawBorderedRect(canvas);

		const before = await canvas.captureObjects();
		const beforeIds = new Set(before.map((obj) => obj.id));

		await canvas.selectAt({ x: 500, y: 280 });
		await canvas.copy();
		await canvas.paste();
		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(before.length + 1);

		const clone = await borderAttrs(
			canvas,
			await newObjectId(canvas, beforeIds),
		);
		expect(clone.rx).toBe("16");
		expect(clone.strokeWidth).toBe("6");
		expect(clone.dash).toBe(attrs.dash);
	});

	test("複製（Ctrl+D）は角丸・線幅・線種を引き継ぐ", async ({ canvas }) => {
		const { attrs } = await drawBorderedRect(canvas);

		const before = await canvas.captureObjects();
		const beforeIds = new Set(before.map((obj) => obj.id));

		await canvas.selectAt({ x: 500, y: 280 });
		await canvas.duplicate();
		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(before.length + 1);

		const clone = await borderAttrs(
			canvas,
			await newObjectId(canvas, beforeIds),
		);
		expect(clone.rx).toBe("16");
		expect(clone.strokeWidth).toBe("6");
		expect(clone.dash).toBe(attrs.dash);
	});
});
