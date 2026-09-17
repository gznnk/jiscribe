import { describe, expect, it } from "vitest";

import type { WebviewToExtensionMessage } from "../messages";
import { isWebviewToExtensionMessage } from "../webviewMessageGuard";

/** One well-formed message per variant of the union. */
const validMessages: WebviewToExtensionMessage[] = [
	{ type: "ready" },
	{ type: "undo" },
	{ type: "redo" },
	{ type: "rendered" },
	{ type: "update", data: '{"objects":[]}' },
	{ type: "update", data: "" },
	{ type: "imageExportResult", requestId: 1, data: "QUJD" },
	{ type: "imageExportResult", requestId: 2, data: null },
	{
		type: "exportImage",
		format: "png",
		base64: "QUJD",
		includesSource: true,
	},
	{
		type: "exportImage",
		format: "svg",
		base64: "",
		includesSource: false,
	},
	{ type: "resolveImage", requestId: "req-1", src: "images/logo.png" },
];

describe("isWebviewToExtensionMessage", () => {
	it("accepts every variant of the union", () => {
		for (const message of validMessages) {
			expect(isWebviewToExtensionMessage(message)).toBe(true);
		}
	});

	it("ignores extra fields", () => {
		expect(isWebviewToExtensionMessage({ type: "ready", unexpected: 1 })).toBe(
			true,
		);
	});

	it("rejects non-objects", () => {
		const nonObjects = [null, undefined, 0, 1, "ready", true, Symbol("ready")];
		for (const value of nonObjects) {
			expect(isWebviewToExtensionMessage(value)).toBe(false);
		}
	});

	it("rejects an unknown or missing type", () => {
		expect(isWebviewToExtensionMessage({})).toBe(false);
		expect(isWebviewToExtensionMessage({ type: "imageResolved" })).toBe(false);
		expect(isWebviewToExtensionMessage({ type: 1 })).toBe(false);
	});

	it("rejects an update whose data is not a string", () => {
		expect(isWebviewToExtensionMessage({ type: "update" })).toBe(false);
		expect(isWebviewToExtensionMessage({ type: "update", data: 42 })).toBe(
			false,
		);
		expect(isWebviewToExtensionMessage({ type: "update", data: null })).toBe(
			false,
		);
	});

	it("rejects an imageExportResult with a wrong requestId or data", () => {
		expect(
			isWebviewToExtensionMessage({
				type: "imageExportResult",
				requestId: "1",
				data: "QUJD",
			}),
		).toBe(false);
		expect(
			isWebviewToExtensionMessage({
				type: "imageExportResult",
				requestId: 1,
				data: 42,
			}),
		).toBe(false);
		expect(
			isWebviewToExtensionMessage({ type: "imageExportResult", requestId: 1 }),
		).toBe(false);
	});

	it("rejects an exportImage with an unknown format or wrong field types", () => {
		expect(
			isWebviewToExtensionMessage({
				type: "exportImage",
				format: "pdf",
				base64: "QUJD",
				includesSource: true,
			}),
		).toBe(false);
		expect(
			isWebviewToExtensionMessage({
				type: "exportImage",
				format: "png",
				base64: 42,
				includesSource: true,
			}),
		).toBe(false);
		expect(
			isWebviewToExtensionMessage({
				type: "exportImage",
				format: "png",
				base64: "QUJD",
				includesSource: "true",
			}),
		).toBe(false);
	});

	it("rejects a resolveImage whose requestId or src is not a string", () => {
		expect(
			isWebviewToExtensionMessage({
				type: "resolveImage",
				requestId: 1,
				src: "logo.png",
			}),
		).toBe(false);
		expect(
			isWebviewToExtensionMessage({
				type: "resolveImage",
				requestId: "req-1",
				src: { path: "logo.png" },
			}),
		).toBe(false);
		expect(
			isWebviewToExtensionMessage({ type: "resolveImage", requestId: "req-1" }),
		).toBe(false);
	});
});
