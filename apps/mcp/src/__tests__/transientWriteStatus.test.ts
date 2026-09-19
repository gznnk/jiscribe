import { describe, expect, it } from "vitest";

import { REVISION_MISMATCH_STATUS } from "../shared/fileApiRoute";
import { isTransientWriteStatus } from "../viewer/files";

describe("isTransientWriteStatus", () => {
	it("takes the host failing on its side for something to send again", () => {
		// A read-only file answers 500 as well; sending it again costs a request per
		// backoff step and goes through once the file is writable
		for (const status of [500, 502, 503, 504]) {
			expect(isTransientWriteStatus(status)).toBe(true);
		}
	});

	it("takes the statuses that say to come back later for something to send again", () => {
		expect(isTransientWriteStatus(408)).toBe(true);
		expect(isTransientWriteStatus(429)).toBe(true);
	});

	it("does not send a conflict again", () => {
		// The newer file is on its way as a frame; writing again would overwrite it
		expect(isTransientWriteStatus(REVISION_MISMATCH_STATUS)).toBe(false);
	});

	it("does not send a write again that the host refused for what it is", () => {
		// 401: a stale token after the host restarted, 409: another file on display.
		// The document is gone from under the write, and the answer would not change
		for (const status of [400, 401, 403, 404, 409, 413, 422, 428]) {
			expect(isTransientWriteStatus(status)).toBe(false);
		}
	});
});
