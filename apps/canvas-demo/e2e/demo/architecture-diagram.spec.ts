/**
 * デモ: ヒーロー画像のアーキテクチャ図を UI 操作だけで再現する。
 *
 * これは回帰検知用のシナリオテストではなく、マーケ素材（スクリーンショット）を
 * 生成するためのデモ。通常の test:e2e（testDir: e2e/specs）からは外してあり、
 * playwright.demo.config.ts 経由（pnpm test:e2e:demo）でのみ実行する。
 *
 * ランディングのデモギャラリーにある cloud-native-commerce.jis.json（クラウド
 * ネイティブ EC の参照アーキ：17 コンポーネント + 17 コネクター）を「正本」として
 * 読み込み、CanvasDriver の
 * テスト済み操作（描画・着色・テキスト・コネクター）だけで丸ごと描き起こす。
 * scripts/replay-hero-showcase.mjs と同じ図を、リトライで失敗を隠さない E2E
 * ドライバで再現する位置づけ。最終状態はスクリーンショットとして添付する。
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
	renderArchitectureDoc,
	type ArchitectureDoc,
} from "./renderArchitectureDoc";
import { test, expect } from "../fixtures";
import { selectors } from "../support/selectors";

const docPath = fileURLToPath(
	new URL(
		"../../../landing/public/demo/diagrams/cloud-native-commerce.jis.json",
		import.meta.url,
	),
);
const doc = JSON.parse(readFileSync(docPath, "utf8")) as ArchitectureDoc;

const rectCount = doc.root.filter((node) => node.type === "rect").length;
const polylineCount = doc.root.filter(
	(node) => node.type === "polyline",
).length;

test.describe("デモ: アーキテクチャ図", () => {
	test("cloud-native-commerce のアーキテクチャ図を UI 操作だけで再現できる", async ({
		canvas,
	}, testInfo) => {
		// 50 近い実 UI 操作を直列に行うため、既定の 30s では足りない。
		test.setTimeout(5 * 60 * 1000);

		await renderArchitectureDoc(canvas, doc);

		// 全コンポーネント（矩形＋凡例ポリライン）と全コネクターが揃っている。
		await expect(canvas.page.locator(selectors.object)).toHaveCount(
			rectCount + polylineCount,
		);
		await expect(canvas.page.locator(selectors.connectorPolyline)).toHaveCount(
			doc.connectors.length,
		);

		// 各層の代表ラベルが画面に出ている。
		const body = canvas.page.locator("body");
		for (const label of [
			"Web Storefront",
			"API Gateway",
			"Payment",
			"Event Bus",
			"PostgreSQL",
		]) {
			await expect(body).toContainText(label);
		}

		// マーケ素材として最終状態を残す（レポートに添付される）。
		const screenshotPath = testInfo.outputPath("hero-architecture.png");
		await canvas.page.screenshot({ path: screenshotPath });
		await testInfo.attach("hero-architecture", {
			path: screenshotPath,
			contentType: "image/png",
		});
	});
});
