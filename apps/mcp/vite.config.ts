import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";

// キャンバスビューア（src/viewer）だけをビルドする。MCP サーバー本体は
// build.mjs（esbuild）が dist/index.mjs へバンドルする。
export default defineConfig({
	root: "src/viewer",
	plugins: [react()],
	server: {
		port: 5196,
		proxy: {
			// ファイル API は MCP プロセスが立てるホスト（既定 5190）へ流す
			"/api": "http://localhost:5190",
			"/ws": {
				target: "ws://localhost:5190",
				ws: true,
			},
		},
	},
	build: {
		// バンドル済みサーバー（dist/index.mjs）の隣に置き、静的配信させる
		outDir: "../../dist/client",
		emptyOutDir: true,
	},
});
