import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";

// e2e 専用ハーネスの Vite 設定。`vite e2e/harness` のように root 指定で起動する
// （playwright.config.ts の webServer が入口）。ビルドはしない（dev サーバー専用）。
export default defineConfig({
	plugins: [react()],
});
