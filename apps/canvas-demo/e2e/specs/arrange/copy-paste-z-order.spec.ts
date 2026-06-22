import { test, expect } from "../../fixtures";
import type { ObjectSnapshot } from "../../support/CanvasDriver";

/**
 * 複数図形のコピー＆ペーストが重なり順（z-order）を保つことの検証。
 *
 * z-order.spec は arrange コマンド（bringToFront 等）を守るが、複数の重なった図形を
 * まとめてコピペしたときに「複製どうしの相対的な重なり順」が保たれるかは未カバーだった。
 * cloneObjects は rootIds（背面→前面の z-order）と同じ順序で新 ID を返し、handlePaste は
 * それを rootIds 末尾（最前面）へ積む。順序がシャッフルされると複製の重なりが入れ替わる
 * 退行になるため、複製 A'<B'<C' の DOM 順（= 重なり順）で守る。
 */

/** transform="matrix(a,b,c,d,e,f)" から中心座標（e,f）を取り出す */
function centerOf(transform: string | null): { x: number; y: number } {
	const nums = transform?.match(/-?\d+(?:\.\d+)?/g)?.map(Number);
	if (!nums || nums.length < 6) {
		throw new Error(`transform を解釈できない: ${transform}`);
	}
	return { x: nums[4], y: nums[5] };
}

/** 期待中心（誤差 1px 以内）に一致する複製図形の id を after から探す */
function findCopyId(
	after: ObjectSnapshot[],
	beforeIds: Set<string>,
	expected: { x: number; y: number },
): string {
	const copy = after.find((o) => {
		if (o.id === null || beforeIds.has(o.id)) {
			return false;
		}
		const c = centerOf(o.transform);
		return Math.abs(c.x - expected.x) <= 1 && Math.abs(c.y - expected.y) <= 1;
	});
	if (!copy?.id) {
		throw new Error(
			`中心 (${expected.x},${expected.y}) の複製図形が見つからない`,
		);
	}
	return copy.id;
}

test.describe("コピー＆ペーストの重なり順保持", () => {
	test("重なった 3 図形をまとめてコピペすると複製も同じ重なり順になる", async ({
		canvas,
	}) => {
		// 重なる 3 矩形を背面→前面の順（A→B→C）に描く。描画順 = z-order。
		const a = await canvas.drawShape(
			"Rectangle",
			{ x: 300, y: 200 },
			{ x: 400, y: 300 },
		); // 中心 (350,250)
		await canvas.deselect();
		const b = await canvas.drawShape(
			"Rectangle",
			{ x: 340, y: 220 },
			{ x: 440, y: 320 },
		); // 中心 (390,270)
		await canvas.deselect();
		const c = await canvas.drawShape(
			"Rectangle",
			{ x: 380, y: 240 },
			{ x: 480, y: 340 },
		); // 中心 (430,290)
		await canvas.deselect();

		// 元の重なり順を確認（A < B < C）。
		expect(await canvas.objectIndex(a)).toBeLessThan(
			await canvas.objectIndex(b),
		);
		expect(await canvas.objectIndex(b)).toBeLessThan(
			await canvas.objectIndex(c),
		);

		const beforeIds = new Set(
			(await canvas.captureObjects())
				.map((o) => o.id)
				.filter((id): id is string => id !== null),
		);

		// 全選択してコピー＆ペースト → 6 図形になる。
		await canvas.selectAll();
		await canvas.copy();
		await canvas.paste();
		await expect
			.poll(async () => (await canvas.captureObjects()).length, {
				message: "コピペで 3 図形増えて合計 6 になること",
			})
			.toBe(6);

		// 各複製は元から +20,+20。中心一致で複製 id を特定する。
		const after = await canvas.captureObjects();
		const copyA = findCopyId(after, beforeIds, { x: 370, y: 270 });
		const copyB = findCopyId(after, beforeIds, { x: 410, y: 290 });
		const copyC = findCopyId(after, beforeIds, { x: 450, y: 310 });

		// 複製どうしの重なり順は元と同じ（A' < B' < C'）。
		expect(await canvas.objectIndex(copyA)).toBeLessThan(
			await canvas.objectIndex(copyB),
		);
		expect(await canvas.objectIndex(copyB)).toBeLessThan(
			await canvas.objectIndex(copyC),
		);
		// 複製は元より前面（最背面の複製 A' でも元の最前面 C より上）。
		expect(await canvas.objectIndex(copyA)).toBeGreaterThan(
			await canvas.objectIndex(c),
		);
	});
});
