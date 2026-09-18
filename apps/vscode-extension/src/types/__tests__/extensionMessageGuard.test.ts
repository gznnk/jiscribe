import { describe, expect, it } from "vitest";

import { isExtensionToWebviewMessage } from "../extensionMessageGuard";
import type { ExtensionToWebviewMessage } from "../messages";

/** One well-formed message per variant of the union. */
const validMessages: ExtensionToWebviewMessage[] = [
	{ type: "update", data: '{"objects":[]}' },
	{ type: "update", data: "" },
	{ type: "update", data: '{"objects":[]}', docType: "png" },
	{ type: "update", data: '{"objects":[]}', version: 0 },
	{ type: "update", data: '{"objects":[]}', version: 7 },
	{ type: "requestImageExport", requestId: 1, format: "png" },
	{ type: "requestImageExport", requestId: 2, format: "svg" },
	{
		type: "imageResolved",
		requestId: "req-1",
		ok: true,
		base64: "QUJD",
		mimeType: "image/png",
	},
	{
		type: "imageResolved",
		requestId: "req-2",
		ok: false,
		error: "ENOENT",
	},
];

describe("isExtensionToWebviewMessage", () => {
	it("accepts every variant of the union", () => {
		for (const message of validMessages) {
			expect(isExtensionToWebviewMessage(message)).toBe(true);
		}
	});

	it("ignores extra fields", () => {
		expect(
			isExtensionToWebviewMessage({
				type: "update",
				data: "{}",
				unexpected: 1,
			}),
		).toBe(true);
	});

	it("rejects non-objects", () => {
		const nonObjects = [
			null,
			undefined,
			0,
			1,
			"update",
			true,
			Symbol("update"),
		];
		for (const value of nonObjects) {
			expect(isExtensionToWebviewMessage(value)).toBe(false);
		}
	});

	it("rejects an unknown or missing type", () => {
		expect(isExtensionToWebviewMessage({})).toBe(false);
		expect(isExtensionToWebviewMessage({ type: "ready" })).toBe(false);
		expect(isExtensionToWebviewMessage({ type: 1 })).toBe(false);
	});

	it("rejects an update whose data is not a string", () => {
		expect(isExtensionToWebviewMessage({ type: "update" })).toBe(false);
		expect(isExtensionToWebviewMessage({ type: "update", data: 42 })).toBe(
			false,
		);
		expect(isExtensionToWebviewMessage({ type: "update", data: null })).toBe(
			false,
		);
	});

	it("rejects an update whose version is present but not a number", () => {
		expect(
			isExtensionToWebviewMessage({ type: "update", data: "{}", version: "4" }),
		).toBe(false);
		expect(
			isExtensionToWebviewMessage({
				type: "update",
				data: "{}",
				version: null,
			}),
		).toBe(false);
	});

	it("rejects a requestImageExport with a wrong requestId or format", () => {
		expect(
			isExtensionToWebviewMessage({
				type: "requestImageExport",
				requestId: "1",
				format: "png",
			}),
		).toBe(false);
		expect(
			isExtensionToWebviewMessage({
				type: "requestImageExport",
				requestId: 1,
				format: "pdf",
			}),
		).toBe(false);
		expect(
			isExtensionToWebviewMessage({
				type: "requestImageExport",
				requestId: 1,
			}),
		).toBe(false);
	});

	it("rejects an imageResolved whose requestId is not a string", () => {
		expect(
			isExtensionToWebviewMessage({
				type: "imageResolved",
				requestId: 1,
				ok: true,
				base64: "QUJD",
				mimeType: "image/png",
			}),
		).toBe(false);
	});

	it("rejects an imageResolved missing the fields its ok promises", () => {
		expect(
			isExtensionToWebviewMessage({
				type: "imageResolved",
				requestId: "req-1",
				ok: true,
				base64: "QUJD",
			}),
		).toBe(false);
		expect(
			isExtensionToWebviewMessage({
				type: "imageResolved",
				requestId: "req-1",
				ok: false,
			}),
		).toBe(false);
		expect(
			isExtensionToWebviewMessage({
				type: "imageResolved",
				requestId: "req-1",
				ok: true,
				error: "ENOENT",
			}),
		).toBe(false);
	});

	it("rejects an imageResolved whose ok is not a boolean", () => {
		expect(
			isExtensionToWebviewMessage({
				type: "imageResolved",
				requestId: "req-1",
				ok: "true",
				base64: "QUJD",
				mimeType: "image/png",
			}),
		).toBe(false);
	});
});
