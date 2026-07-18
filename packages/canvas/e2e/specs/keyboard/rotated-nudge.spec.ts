import { test, expect } from "../../fixtures";

/**
 * 回転済みの図形に対するナッジ（矢印キー移動）が、
 *   ・world 軸（画面の上下左右）に沿って動く（図形ローカル軸ではない）
 *   ・移動量は world で一定（1px / Shift 10px）
 *   ・回転成分（matrix の a,b,c,d）は一切変わらない
 * ことを守る。
 *
 * ナッジは moveSelection（moveByDelta）が world delta を中心へ足すだけの平行移動で、
 * 回転には触らない。もし誰かが「ローカル軸でナッジ」や「回転を考慮した移動」に
 * 変えてしまうと、回転図形だけ斜めに動いたり a,b,c,d が変わる退行になる。既存 nudge.spec /
 * rotated-resize は無回転ナッジ・回転リサイズを見るが、回転×ナッジの直交性は未カバー。
 *
 * createSvgTransform より無反転時 a=cosθ,b=sinθ,c=-sinθ,d=cosθ、e,f は中心。
 * 回転は中心周りなので回転後も中心 (e,f) は (500,260) のまま。
 */

const CENTER = { x: 500, y: 260 };
const HALF_WIDTH = 100;
const HALF_HEIGHT = 60;
/** カーソルを置く中心からの距離（角度のみが効く） */
const CURSOR_RADIUS = 150;
/** 与える回転角（度）。無回転と区別できるよう斜めに倒す */
const ROTATE_DEG = 40;

const toRadians = (deg: number): number => (deg * Math.PI) / 180;

const parseMatrix = (transform: string | null): number[] => {
	const match = transform?.match(/^matrix\((.+)\)$/);
	if (!match) {
		throw new Error(`transform が matrix 形式でない: ${transform}`);
	}
	return match[1].split(",").map((s) => Number(s.trim()));
};

/** 絶対回転角 N 度にするためカーソルを置くコンテンツ座標（右上コーナー方向から N 度） */
const cursorForRotation = (degrees: number): { x: number; y: number } => {
	const refAngle = Math.atan2(-HALF_HEIGHT, HALF_WIDTH);
	const target = refAngle + toRadians(degrees);
	return {
		x: CENTER.x + CURSOR_RADIUS * Math.cos(target),
		y: CENTER.y + CURSOR_RADIUS * Math.sin(target),
	};
};

test.describe("回転図形のナッジ", () => {
	test("回転していてもナッジは world 軸に沿って動き、回転成分は不変", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		const rect = canvas.objectById(id);

		// 図形を約 40° 回転させる（中心周りなので中心は不動）。
		await canvas.dragTransformHandle("rotation", cursorForRotation(ROTATE_DEG));
		await expect
			.poll(async () => parseMatrix(await rect.getAttribute("transform"))[1], {
				message: "回転で b 成分（sinθ）が 0 から外れること",
			})
			.not.toBe(0);

		const rotated = parseMatrix(await rect.getAttribute("transform"));
		const [a0, b0, c0, d0, e0, f0] = rotated;
		// 回転は中心周り。中心 (e,f) は描画時のまま。
		expect(e0).toBeCloseTo(CENTER.x, 6);
		expect(f0).toBeCloseTo(CENTER.y, 6);
		// 実際に回転している（無回転 a=1,b=0 ではない）ことを確認。
		expect(Math.abs(b0)).toBeGreaterThan(0.1);

		// 右ナッジ: world x が +1。回転成分(a,b,c,d)と f は不変。
		await canvas.nudge("right");
		await expect
			.poll(async () => parseMatrix(await rect.getAttribute("transform"))[4], {
				message: "右ナッジで world x が +1px",
			})
			.toBeCloseTo(e0 + 1, 6);
		{
			const [a, b, c, d, , f] = parseMatrix(
				await rect.getAttribute("transform"),
			);
			expect(a).toBeCloseTo(a0, 10);
			expect(b).toBeCloseTo(b0, 10);
			expect(c).toBeCloseTo(c0, 10);
			expect(d).toBeCloseTo(d0, 10);
			expect(f).toBeCloseTo(f0, 6); // y は動かない
		}

		// 下ナッジ: world y が +1。
		await canvas.nudge("down");
		await expect
			.poll(async () => parseMatrix(await rect.getAttribute("transform"))[5], {
				message: "下ナッジで world y が +1px",
			})
			.toBeCloseTo(f0 + 1, 6);

		// Shift+左ナッジ: world x が -10（合計 e0+1-10 = e0-9）。
		await canvas.nudge("left", { large: true });
		await expect
			.poll(async () => parseMatrix(await rect.getAttribute("transform"))[4], {
				message: "Shift+左ナッジで world x が -10px",
			})
			.toBeCloseTo(e0 - 9, 6);

		// 一連のナッジ後も回転成分は完全に保たれている。
		const [a, b, c, d] = parseMatrix(await rect.getAttribute("transform"));
		expect(a).toBeCloseTo(a0, 10);
		expect(b).toBeCloseTo(b0, 10);
		expect(c).toBeCloseTo(c0, 10);
		expect(d).toBeCloseTo(d0, 10);
	});
});
