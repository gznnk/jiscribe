import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * container ("frame") シェイプの中核挙動を守る:
 * - container フライアウトから frame / boundary / zone が作成でき、複合 <g> で描画される
 * - 本体（body）はクリック貫通し、ヘッダ帯でのみ選択される（pass-through）
 * - boundary preset は破線ボーダーになる
 *
 * 束ね（move-together）は既存の group が担当するため、ここでは検証しない。
 */

const CATEGORY = "container";

/** キャンバスの computed cursor。crosshair=描画モード ON。 */
async function canvasCursor(canvas: CanvasDriver): Promise<string> {
	return canvas.page
		.locator('[data-kind="canvas"]')
		.evaluate((el) => getComputedStyle(el).cursor);
}

/** container フライアウトから presetId を対角ドラッグで作成し、新規オブジェクトの {id, tag} を返す。 */
async function createFromFlyout(
	canvas: CanvasDriver,
	presetId: string,
	from: { x: number; y: number },
	to: { x: number; y: number },
): Promise<{ id: string; tag: string }> {
	const before = await canvas.captureObjects();
	const beforeIds = new Set(before.map((obj) => obj.id));

	await canvas.page.click(selectors.categoryButton(CATEGORY));
	const item = canvas.page.locator(selectors.shapeItem(presetId));
	await expect(item).toBeVisible();
	await item.click();
	await expect
		.poll(() => canvasCursor(canvas), {
			message: `${presetId} クリックで描画モードに入ること`,
		})
		.toBe("crosshair");

	await canvas.drag(from, to);
	await expect
		.poll(async () => (await canvas.captureObjects()).length, {
			message: `${presetId} が1つ作成されること`,
		})
		.toBe(before.length + 1);

	const created = (await canvas.captureObjects()).find(
		(obj) => !beforeIds.has(obj.id),
	);
	if (!created?.id) {
		throw new Error(`${presetId} で作成された図形の data-id が取得できない`);
	}
	return { id: created.id, tag: created.tag };
}

test.describe("container パレット / 挙動", () => {
	test("frame / boundary / zone がフライアウトから作成でき、複合 <g> で描画される", async ({
		canvas,
	}) => {
		const frame = await createFromFlyout(
			canvas,
			"frame",
			{ x: 300, y: 220 },
			{ x: 520, y: 380 },
		);
		expect(frame.tag).toBe("g");

		const boundary = await createFromFlyout(
			canvas,
			"boundary",
			{ x: 560, y: 220 },
			{ x: 780, y: 380 },
		);
		expect(boundary.tag).toBe("g");

		const zone = await createFromFlyout(
			canvas,
			"zone",
			{ x: 300, y: 420 },
			{ x: 520, y: 560 },
		);
		expect(zone.tag).toBe("g");
	});

	test("本体はクリック貫通し、ヘッダ帯でのみ選択される", async ({ canvas }) => {
		// 高さ 220 のコンテナ。ヘッダ帯は上端 28px（content 座標 y=[220,248]）。
		await createFromFlyout(
			canvas,
			"frame",
			{ x: 300, y: 220 },
			{ x: 560, y: 440 },
		);
		// 作成直後は自動選択されコントロールが出ている。
		await expect(canvas.page.locator(selectors.control).first()).toBeVisible();

		// 本体（ヘッダより下の内側）クリック → 貫通してキャンバスに抜け、選択が外れる。
		await canvas.clickAt({ x: 430, y: 350 });
		await expect(canvas.page.locator(selectors.control)).toHaveCount(0);

		// ヘッダ帯クリック → コンテナが選択される。
		await canvas.clickAt({ x: 430, y: 232 });
		await expect(canvas.page.locator(selectors.control).first()).toBeVisible();
	});

	test("boundary preset は破線ボーダーで描画される", async ({ canvas }) => {
		const boundary = await createFromFlyout(
			canvas,
			"boundary",
			{ x: 300, y: 220 },
			{ x: 560, y: 400 },
		);
		// アウトライン矩形（fill:none の枠）に stroke-dasharray が乗っていること。
		const dash = await canvas.page.evaluate((id) => {
			const group = document.querySelector(`[data-id="${id}"]`);
			if (!group) {
				return null;
			}
			return [...group.querySelectorAll("rect")]
				.map((rect) => getComputedStyle(rect).strokeDasharray)
				.find((value) => value && value !== "none");
		}, boundary.id);
		expect(dash).toBeTruthy();
		expect(dash).not.toBe("none");
	});

	test("ヘッダ下線は枠線と同じ太さ（strokeWidth 追従）で描かれる", async ({
		canvas,
	}) => {
		const frame = await createFromFlyout(
			canvas,
			"frame",
			{ x: 300, y: 220 },
			{ x: 560, y: 420 },
		);
		// 枠線と下線の stroke-width が一致すること。色は emotion CSS で当たるため
		// 属性セレクタでは拾えない → 枠線 rect は computed fill:none で特定する。
		const widths = await canvas.page.evaluate((id) => {
			const group = document.querySelector(`[data-id="${id}"]`);
			if (!group) {
				return null;
			}
			const outline = [...group.querySelectorAll("rect")].find(
				(rect) => getComputedStyle(rect).fill === "none",
			);
			const divider = group.querySelector("line");
			return {
				outline: outline ? getComputedStyle(outline).strokeWidth : null,
				divider: divider ? getComputedStyle(divider).strokeWidth : null,
			};
		}, frame.id);
		expect(widths?.divider).toBeTruthy();
		expect(widths?.divider).toBe(widths?.outline);
	});

	test("ヘッダ下端のハンドルをドラッグしてヘッダ高を変更できる", async ({
		canvas,
	}) => {
		// 高さ 220 のコンテナ。ヘッダ下端は content 座標 y=248（デフォルト 28px）。
		const frame = await createFromFlyout(
			canvas,
			"frame",
			{ x: 300, y: 220 },
			{ x: 560, y: 440 },
		);
		// 作成直後は選択済みで、ヘッダ下端中央にヘッダ高ハンドルが出る。
		await expect(
			canvas.page.locator(
				'[data-kind="control"][data-part="selection:container:headerHeight"]',
			),
		).toBeVisible();

		// ハンドルを下へ 72px ドラッグ → headerHeight 28 → 100。
		await canvas.drag({ x: 430, y: 248 }, { x: 430, y: 320 });
		// ヘッダ帯 rect の height 属性が新しいヘッダ高になる（body/枠線は 220 のまま）。
		await expect
			.poll(async () =>
				canvas.page.evaluate((id) => {
					const group = document.querySelector(`[data-id="${id}"]`);
					if (!group) {
						return [];
					}
					return [...group.querySelectorAll("rect")].map((rect) =>
						rect.getAttribute("height"),
					);
				}, frame.id),
			)
			.toContain("100");
	});

	test("ヘッダ色を独立して変更できる（headerFill）", async ({ canvas }) => {
		const frame = await createFromFlyout(
			canvas,
			"frame",
			{ x: 300, y: 220 },
			{ x: 560, y: 420 },
		);
		// 作成直後は選択済みで ObjectMenu が出ている。ヘッダ色を青に設定する。
		await canvas.setColor("header-color", "#3b82f6");
		const blue = await canvas.normalizeColor("#3b82f6");
		// ヘッダ矩形の fill が指定色になる（body / 枠線ではなくヘッダだけが変わる）。
		await expect
			.poll(async () =>
				canvas.page.evaluate((id) => {
					const group = document.querySelector(`[data-id="${id}"]`);
					if (!group) {
						return [];
					}
					return [...group.querySelectorAll("rect")].map(
						(rect) => getComputedStyle(rect).fill,
					);
				}, frame.id),
			)
			.toContain(blue);
	});
});
