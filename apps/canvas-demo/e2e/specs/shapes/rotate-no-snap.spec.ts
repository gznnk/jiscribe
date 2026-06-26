import { test, expect } from "../../fixtures";

/**
 * 回転には角度スナップが無い（15°/45° 等の刻みに吸着しない）ことと、Shift を押しても
 * 回転には影響しない（軸固定はリサイズ用で回転には効かない）ことを守る。
 *
 * rotate-angle.spec は 30/90/150/210/300 という 15° の倍数だけを検証しているため、
 * 「15° 刻みにスナップする」退行が入っても気づけない。ここでは刻みから外れた角度
 * （8°/37°/52°）を狙い、ちょうどその角度に止まる（最寄りの 15° 倍へ寄らない）ことで
 * 自由回転を固める。実装（handleRotationDrag）は角度を整数に丸めるだけでスナップせず、
 * event.mods.shift も参照しない。誰かが回転スナップや Shift 角度固定を足すとここで落ちる。
 *
 * createSvgTransform より無反転時 a=cosθ,b=sinθ。復元角は atan2(b,a)。
 */

const CENTER = { x: 500, y: 260 };
const HALF_WIDTH = 100;
const HALF_HEIGHT = 60;
const CURSOR_RADIUS = 150;
/** 角度許容（度）。整数丸め＋サブピクセル量子化のみを吸収する小さな値 */
const ANGLE_TOLERANCE_DEG = 1.5;

const toRadians = (deg: number): number => (deg * Math.PI) / 180;
const toDegrees = (rad: number): number => (rad * 180) / Math.PI;
const normalizeDeg = (deg: number): number => ((deg % 360) + 360) % 360;

const angleDiffDeg = (a: number, b: number): number => {
	const diff = Math.abs(normalizeDeg(a) - normalizeDeg(b)) % 360;
	return diff > 180 ? 360 - diff : diff;
};

const matrixAngleDeg = (transform: string | null): number => {
	const match = transform?.match(/^matrix\((.+)\)$/);
	if (!match) {
		throw new Error(`transform が matrix 形式でない: ${transform}`);
	}
	const [a, b] = match[1].split(",").map((s) => Number(s.trim()));
	return normalizeDeg(toDegrees(Math.atan2(b, a)));
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

/** 最寄りの 15° 倍からの差。スナップしていれば 0 に近くなる（＝自由回転なら大きい） */
const distanceToNearest15 = (deg: number): number => {
	const nearest = Math.round(deg / 15) * 15;
	return angleDiffDeg(deg, nearest);
};

test.describe("回転にスナップが無いこと", () => {
	for (const { target, shift } of [
		{ target: 8, shift: false },
		{ target: 37, shift: false },
		{ target: 52, shift: true }, // Shift を押しても回転角は変わらない（吸着しない）
	]) {
		test(`${target}° へ回すとちょうど ${target}° に止まる（Shift=${shift}・15° 刻みへ吸着しない）`, async ({
			canvas,
		}) => {
			const id = await canvas.drawShape(
				"Rectangle",
				{ x: 400, y: 200 },
				{ x: 600, y: 320 },
			);
			expect(await canvas.objectById(id).getAttribute("transform")).toBe(
				"matrix(1, 0, 0, 1, 500, 260)",
			);

			await canvas.dragTransformHandle("rotation", cursorForRotation(target), {
				shift,
			});

			await expect
				.poll(
					async () =>
						angleDiffDeg(
							matrixAngleDeg(
								await canvas.objectById(id).getAttribute("transform"),
							),
							target,
						),
					{ message: `ちょうど ${target}° に回ること` },
				)
				.toBeLessThanOrEqual(ANGLE_TOLERANCE_DEG);

			// 念のため: 結果は最寄りの 15° 倍から十分離れている（＝スナップしていない証拠）。
			// 8/37/52 はいずれも最寄り 15° 倍から 7° 程度離れているので、スナップが入れば
			// この距離が 0 付近に潰れて落ちる。
			const finalAngle = matrixAngleDeg(
				await canvas.objectById(id).getAttribute("transform"),
			);
			expect(distanceToNearest15(finalAngle)).toBeGreaterThan(3);
		});
	}
});
