import { test, expect } from "../../fixtures";

test.describe("図形の描画", () => {
	test("Rectangle は rect 要素を作る", async ({ canvas }) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		const created = (await canvas.captureObjects()).find(
			(obj) => obj.id === id,
		);
		expect(created?.tag).toBe("rect");
		// transform の e,f は図形の中心座標
		expect(created?.transform).toBe("matrix(1, 0, 0, 1, 500, 260)");
	});

	test("Ellipse は ellipse 要素を作る", async ({ canvas }) => {
		const id = await canvas.drawShape(
			"Ellipse",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		const created = (await canvas.captureObjects()).find(
			(obj) => obj.id === id,
		);
		expect(created?.tag).toBe("ellipse");
	});

	test("Polyline はドラッグで線を作る", async ({ canvas }) => {
		const id = await canvas.drawShape(
			"Polyline",
			{ x: 400, y: 400 },
			{ x: 700, y: 450 },
		);
		const created = (await canvas.captureObjects()).find(
			(obj) => obj.id === id,
		);
		expect(created?.tag).toBe("polyline");
	});

	test("Polygon はドラッグで polygon 要素を作る", async ({ canvas }) => {
		// Polygon も Draw モードに対応し、対角ドラッグで領域にフィットして配置される
		const id = await canvas.drawShape(
			"Polygon",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		const created = (await canvas.captureObjects()).find(
			(obj) => obj.id === id,
		);
		expect(created?.tag).toBe("polygon");
	});

	test("Sticky はクリックで配置され g 要素を作る", async ({ canvas }) => {
		// Sticky も即配置タイプ
		const id = await canvas.placeShape("Sticky");
		const created = (await canvas.captureObjects()).find(
			(obj) => obj.id === id,
		);
		// Sticky のルートは <g data-kind="object">
		expect(created?.tag).toBe("g");
	});

	test("Markdown は rect 要素を作り既定の Markdown 文面を持つ", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Markdown",
			{ x: 400, y: 200 },
			{ x: 700, y: 400 },
		);
		const created = (await canvas.captureObjects()).find(
			(obj) => obj.id === id,
		);
		// Markdown プリセットは rect（textType: "markdown"）
		expect(created?.tag).toBe("rect");
		// 既定の文面が描画される（innerHTML はエスケープされるため textContent で確認）
		await expect
			.poll(() => canvas.page.evaluate(() => document.body.textContent ?? ""))
			.toContain("Title");
	});

	test("図形はドラッグで移動できる", async ({ canvas }) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		await canvas.deselect();

		await canvas.drag({ x: 500, y: 260 }, { x: 800, y: 560 });

		await expect
			.poll(async () => {
				const moved = (await canvas.captureObjects()).find(
					(obj) => obj.id === id,
				);
				return moved?.transform;
			})
			.toBe("matrix(1, 0, 0, 1, 800, 560)");
	});

	test("描画してもキャンバスはパン・ズームしない", async ({ canvas }) => {
		const initialViewBox = await canvas.getViewBox();
		await canvas.drawShape("Rectangle", { x: 200, y: 200 }, { x: 500, y: 400 });
		await canvas.deselect();
		expect(await canvas.getViewBox()).toBe(initialViewBox);
	});
});
