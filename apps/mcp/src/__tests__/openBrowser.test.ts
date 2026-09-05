import { describe, expect, it } from "vitest";

import { openBrowser } from "../host/openBrowser";

/**
 * Only the failure path is exercised: a candidate that does not exist fails with
 * ENOENT without any browser being involved, and that is the one outcome the
 * caller has to act on. A candidate that exists would put a real browser up
 */
describe("openBrowser", () => {
	it("reports a headless executable that could not be started, with the way to name another", async () => {
		const reason = await new Promise<string>((resolve) => {
			openBrowser("http://localhost:1/", {
				mode: "headless",
				browserCommand: "/nonexistent/jiscribe-probe/chrome",
				onFailure: resolve,
			});
		});

		expect(reason).toContain("/nonexistent/jiscribe-probe/chrome");
		expect(reason).toContain("ENOENT");
		expect(reason).toContain("JISCRIBE_MCP_BROWSER");
	});
});
