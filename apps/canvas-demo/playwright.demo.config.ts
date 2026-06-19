import { defineConfig } from "@playwright/test";

import baseConfig from "./playwright.config";

// マーケ素材生成用のデモ専用設定。
// 通常の playwright.config.ts は testDir: e2e/specs なので e2e/demo は CI で走らない。
// このデモは `pnpm test:e2e:demo`（= -c playwright.demo.config.ts）で明示実行する。
// webServer / use などの基盤設定は本体 config をそのまま流用し、testDir だけ差し替える。
export default defineConfig({
	...baseConfig,
	testDir: "./e2e/demo",
});
