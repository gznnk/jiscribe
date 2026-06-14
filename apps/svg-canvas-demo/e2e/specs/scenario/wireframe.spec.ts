/**
 * シナリオ: ログイン画面のワイヤーフレームを組み立てる。
 *
 * 「AI がキャンバスアプリを操作して画面設計を起こす」を想定したシナリオ。
 * ヘッダー・入力欄・主ボタンという UI 部品を、テスト済みの基本操作だけで配置し、
 * 期待どおりの構成（部品点数＋ラベル）になることを検証する。
 */

import { placeLabeledShape, type Rect } from "./buildDiagram";
import { test, expect } from "../../fixtures";

test.describe("シナリオ: ワイヤーフレーム", () => {
	test("ログイン画面のワイヤーフレームを組み立てられる", async ({ canvas }) => {
		const header: Rect = { x: 520, y: 140, width: 400, height: 60 };
		const emailField: Rect = { x: 520, y: 260, width: 400, height: 50 };
		const passwordField: Rect = { x: 520, y: 340, width: 400, height: 50 };
		const loginButton: Rect = { x: 520, y: 440, width: 400, height: 60 };

		await placeLabeledShape(canvas, {
			tool: "Rectangle",
			rect: header,
			label: "MyApp",
		});
		await placeLabeledShape(canvas, {
			tool: "Rectangle",
			rect: emailField,
			label: "Email",
		});
		await placeLabeledShape(canvas, {
			tool: "Rectangle",
			rect: passwordField,
			label: "Password",
		});
		await placeLabeledShape(canvas, {
			tool: "Rectangle",
			rect: loginButton,
			label: "Log in",
			fill: "#2563eb",
		});

		// 構成: 図形は 4 部品ちょうど
		const objects = await canvas.captureObjects();
		const rects = objects.filter((obj) => obj.tag === "rect");
		expect(rects).toHaveLength(4);

		// 各部品のラベルが画面に存在する
		const body = canvas.page.locator("body");
		for (const label of ["MyApp", "Email", "Password", "Log in"]) {
			await expect(body).toContainText(label);
		}

		// 主ボタンは塗りを変えてあるので、全部品が同じ塗りにはならない
		// （正規化後の正確な色値に依存せず「区別が付いた」ことだけ確かめる）。
		const distinctFills = new Set(rects.map((rect) => rect.fill));
		expect(distinctFills.size).toBeGreaterThan(1);
	});
});
