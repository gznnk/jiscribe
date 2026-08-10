// Relative, never through @jiscribe/canvas-sdk: canvas may not depend on the kit it ships.
import { createCanvasPlaywrightConfig } from "./e2e/testing-playwright-config";

export default createCanvasPlaywrightConfig({
	testDir: "./e2e/specs",
	harnessCommand: (port) => `pnpm dev:harness --port ${port} --strictPort`,
});
