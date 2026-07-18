import { test, expect } from "../../fixtures";

/**
 * 回転ハンドルのドラッグが「狙った角度ちょうど」に回すことの精密検証。
 *
 * 既存の rotate-undo / basic-gestures は「回転で transform が変わる／戻る」までしか
 * 守らず、回した角度が正しいか（回転行列の中身）は見ていない。ここはより細かい層
 * ＝ レンダリングされる matrix(a,b,c,d,e,f) の三角関数成分まで踏み込んで、
 *
 *   1. ハンドルを中心周りに N 度ぶん回すと、図形がちょうど N 度回転する
 *   2. 回転で拡縮が混入しない（a²+b² == 1、c²+d² == 1）
 *   3. 中心（e,f）は回転で動かない
 *
 * を守る。回転角の符号や行列の取り違え（cos/sin の入れ違い、スケール混入）が起きると
 * ここで落ちる。
 *
 * 回転の実装（TransformControlHandler.handleRotationDrag）は
 *   newRotation = angle(中心→カーソル) − angle(中心→右上コーナー)   （整数度に丸め）
 * という「絶対角」指定。カーソルを「右上コーナー方向から N 度ずらした向き」に置けば
 * 図形は絶対角 N 度になる。角度しか効かないのでカーソルまでの距離は任意でよい。
 * 角度スナップは無いため任意の角度を狙える。
 *
 * createSvgTransform より a=cosθ, b=sinθ, c=-sinθ, d=cosθ（無反転時）。
 * よって描画行列から復元した角度は atan2(b, a)。
 */

/** 描画する矩形（zoom=1 では描画座標＝中心原点の transform 座標） */
const RECT_FROM = { x: 400, y: 200 };
const RECT_TO = { x: 600, y: 320 };
const CENTER = { x: 500, y: 260 };
const HALF_WIDTH = 100;
const HALF_HEIGHT = 60;

/** カーソルを置く中心からの距離（角度のみが効くので任意。端の自動スクロールを避ける範囲） */
const CURSOR_RADIUS = 150;

/** 角度の許容誤差（度）。整数丸め＋カーソルのサブピクセル量子化を吸収する */
const ANGLE_TOLERANCE_DEG = 1.5;
/** スケール（拡縮）混入を弾く許容誤差。1 からのズレ */
const SCALE_TOLERANCE = 0.02;
/** 中心ズレの許容（px） */
const CENTER_TOLERANCE_PX = 1;

const toRadians = (deg: number): number => (deg * Math.PI) / 180;
const toDegrees = (rad: number): number => (rad * 180) / Math.PI;

/** 0–360 度へ正規化 */
const normalizeDeg = (deg: number): number => ((deg % 360) + 360) % 360;

/** 2 角度の最小差（度、0–180） */
const angleDiffDeg = (a: number, b: number): number => {
	const diff = Math.abs(normalizeDeg(a) - normalizeDeg(b)) % 360;
	return diff > 180 ? 360 - diff : diff;
};

/** "matrix(a, b, c, d, e, f)" を数値配列へ */
const parseMatrix = (transform: string | null): number[] => {
	const match = transform?.match(/^matrix\((.+)\)$/);
	if (!match) {
		throw new Error(`transform が matrix 形式でない: ${transform}`);
	}
	return match[1].split(",").map((s) => Number(s.trim()));
};

/** 描画行列から復元した回転角（度、0–360） */
const matrixAngleDeg = (transform: string | null): number => {
	const [a, b] = parseMatrix(transform);
	return normalizeDeg(toDegrees(Math.atan2(b, a)));
};

/**
 * 絶対回転角 N 度を得るためにカーソルを置くべきコンテンツ座標。
 * 右上コーナー方向（atan2(-halfH, halfW)）から N 度ずらした向きに置く。
 */
const cursorForRotation = (degrees: number): { x: number; y: number } => {
	const refAngle = Math.atan2(-HALF_HEIGHT, HALF_WIDTH);
	const target = refAngle + toRadians(degrees);
	return {
		x: CENTER.x + CURSOR_RADIUS * Math.cos(target),
		y: CENTER.y + CURSOR_RADIUS * Math.sin(target),
	};
};

test.describe("回転角の精密検証", () => {
	// 反時計回り・時計回り・180 超まで、スナップに頼らない任意角を一通り。
	for (const target of [30, 90, 150, 210, 300]) {
		test(`回転ハンドルを ${target}° ぶん回すと図形がちょうど ${target}° 回転する`, async ({
			canvas,
		}) => {
			const id = await canvas.drawShape("Rectangle", RECT_FROM, RECT_TO);
			// 描画直後は無回転・中心 (500,260)。ここがズレると以降の角度前提が崩れる。
			expect(await canvas.objectById(id).getAttribute("transform")).toBe(
				"matrix(1, 0, 0, 1, 500, 260)",
			);

			await canvas.dragTransformHandle("rotation", cursorForRotation(target));

			// 復元角が狙い角に収束すること（操作が効いていなければここで落ちる）。
			await expect
				.poll(
					async () =>
						angleDiffDeg(
							matrixAngleDeg(
								await canvas.objectById(id).getAttribute("transform"),
							),
							target,
						),
					{ message: `回転ハンドルのドラッグで ${target}° 回転すること` },
				)
				.toBeLessThanOrEqual(ANGLE_TOLERANCE_DEG);

			// 収束後の行列で拡縮混入と中心移動が無いことを確かめる。
			const [a, b, c, d, e, f] = parseMatrix(
				await canvas.objectById(id).getAttribute("transform"),
			);
			// 純回転なら各列ベクトルの長さは 1（スケールが紛れ込むと崩れる）。
			expect(Math.abs(Math.hypot(a, b) - 1)).toBeLessThanOrEqual(
				SCALE_TOLERANCE,
			);
			expect(Math.abs(Math.hypot(c, d) - 1)).toBeLessThanOrEqual(
				SCALE_TOLERANCE,
			);
			// 回転は中心周り。中心 (e,f) は動かない。
			expect(Math.abs(e - CENTER.x)).toBeLessThanOrEqual(CENTER_TOLERANCE_PX);
			expect(Math.abs(f - CENTER.y)).toBeLessThanOrEqual(CENTER_TOLERANCE_PX);
		});
	}
});
