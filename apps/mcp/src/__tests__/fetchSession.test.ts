// The viewer's read of the session answer. What it decides is what the page makes
// of the `actions` field a host may or may not send, so `fetch` is replaced with
// one answering a fixed body.

import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchSession } from "../viewer/files";

/**
 * Replaces `fetch` with one answering this body, as JSON, to every request.
 *
 * @param body What the host is to answer at /api/session
 */
const stubSessionAnswer = (body: unknown): void => {
	vi.stubGlobal(
		"fetch",
		vi.fn(() => Promise.resolve(Response.json(body))),
	);
};

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("fetchSession", () => {
	it("offers no action for a host answering without the field", async () => {
		stubSessionAnswer({ token: "session-token" });

		await expect(fetchSession()).resolves.toEqual({
			token: "session-token",
			actions: [],
		});
	});

	it("keeps the offered names it knows, in the host's order, and leaves out one it does not", async () => {
		stubSessionAnswer({
			token: "session-token",
			actions: ["quit", "reboot", "openFile"],
		});

		await expect(fetchSession()).resolves.toEqual({
			token: "session-token",
			actions: ["quit", "openFile"],
		});
	});

	it("refuses an actions field that is not a list rather than reading it as none", async () => {
		stubSessionAnswer({ token: "session-token", actions: "openFile" });

		await expect(fetchSession()).rejects.toThrow(
			"the canvas host answered with actions that are not a list",
		);
	});

	it("refuses an answer without a token", async () => {
		stubSessionAnswer({ actions: [] });

		await expect(fetchSession()).rejects.toThrow(
			"the canvas host answered without a session token",
		);
	});
});
