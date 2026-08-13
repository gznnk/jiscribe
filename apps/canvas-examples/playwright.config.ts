import { createCanvasPlaywrightConfig } from "@jiscribe/canvas/testing/playwright-config";

export default createCanvasPlaywrightConfig({
	testDir: "./e2e/specs",
	harnessCommand: (port) => `pnpm dev:harness --port ${port} --strictPort`,
});
