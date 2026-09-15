import { describe, expect, it } from "vitest";

import type {
	ImageRequestId,
	WebviewToExtensionMessage,
} from "../../types/messages";
import { createWebviewImageResolver } from "../resolveImage";

/** Resolver wired to a recorder of the resolveImage messages it posts. */
const makeResolver = () => {
	const posted: { requestId: ImageRequestId; src: string }[] = [];
	const resolver = createWebviewImageResolver(
		(message: WebviewToExtensionMessage) => {
			if (message.type === "resolveImage") {
				posted.push({ requestId: message.requestId, src: message.src });
			}
		},
	);
	return { resolver, posted };
};

const readBlobBytes = async (blob: Blob): Promise<Uint8Array> =>
	new Uint8Array(await blob.arrayBuffer());

describe("createWebviewImageResolver", () => {
	it("posts a resolveImage request and resolves it to a typed Blob", async () => {
		const { resolver, posted } = makeResolver();
		const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x00, 0xff]);

		const pending = resolver.resolveImage("images/logo.png");
		expect(posted).toEqual([
			{ requestId: expect.any(String), src: "images/logo.png" },
		]);

		resolver.handleImageResolved({
			type: "imageResolved",
			requestId: posted[0].requestId,
			ok: true,
			base64: Buffer.from(bytes).toString("base64"),
			mimeType: "image/png",
		});

		const blob = await pending;
		expect(blob.type).toBe("image/png");
		expect(await readBlobBytes(blob)).toEqual(bytes);
	});

	it("rejects with the Extension's reason", async () => {
		const { resolver, posted } = makeResolver();

		const pending = resolver.resolveImage("../secret.png");
		resolver.handleImageResolved({
			type: "imageResolved",
			requestId: posted[0].requestId,
			ok: false,
			error: "Image src must be a relative path inside the document's folder",
		});

		await expect(pending).rejects.toThrow(/relative path inside/);
	});

	it("keeps concurrent requests apart by requestId", async () => {
		const { resolver, posted } = makeResolver();

		const first = resolver.resolveImage("a.png");
		const second = resolver.resolveImage("b.svg");
		expect(posted[0].requestId).not.toBe(posted[1].requestId);

		// Answered out of order, so a resolver keyed by arrival would cross them.
		resolver.handleImageResolved({
			type: "imageResolved",
			requestId: posted[1].requestId,
			ok: true,
			base64: Buffer.from("<svg/>", "utf8").toString("base64"),
			mimeType: "image/svg+xml",
		});
		resolver.handleImageResolved({
			type: "imageResolved",
			requestId: posted[0].requestId,
			ok: true,
			base64: Buffer.from([0x01]).toString("base64"),
			mimeType: "image/png",
		});

		expect((await second).type).toBe("image/svg+xml");
		expect(await readBlobBytes(await first)).toEqual(new Uint8Array([0x01]));
	});

	it("ignores a second answer to the same request", async () => {
		const { resolver, posted } = makeResolver();

		const pending = resolver.resolveImage("a.png");
		resolver.handleImageResolved({
			type: "imageResolved",
			requestId: posted[0].requestId,
			ok: true,
			base64: Buffer.from([0x01]).toString("base64"),
			mimeType: "image/png",
		});
		// A duplicate (an error, at that) must not turn the settled Promise over.
		resolver.handleImageResolved({
			type: "imageResolved",
			requestId: posted[0].requestId,
			ok: false,
			error: "boom",
		});

		expect(await readBlobBytes(await pending)).toEqual(new Uint8Array([0x01]));
	});

	it("ignores an answer to a request it never made", () => {
		const { resolver } = makeResolver();

		expect(() =>
			resolver.handleImageResolved({
				type: "imageResolved",
				requestId: "stray-1",
				ok: false,
				error: "stray",
			}),
		).not.toThrow();
	});

	it("hands out ids no other page can have produced", async () => {
		// The page VSCode builds after the tab was hidden gets a resolver of its own,
		// and an answer still owed to the page before it must not settle a request here.
		const firstPage = makeResolver();
		const secondPage = makeResolver();

		const pendingOnSecondPage = secondPage.resolver.resolveImage("a.png");
		firstPage.resolver.resolveImage("a.png");
		expect(secondPage.posted[0].requestId).not.toBe(
			firstPage.posted[0].requestId,
		);

		secondPage.resolver.handleImageResolved({
			type: "imageResolved",
			requestId: firstPage.posted[0].requestId,
			ok: false,
			error: "answer for the discarded page",
		});
		secondPage.resolver.handleImageResolved({
			type: "imageResolved",
			requestId: secondPage.posted[0].requestId,
			ok: true,
			base64: Buffer.from([0x01]).toString("base64"),
			mimeType: "image/png",
		});

		expect(await readBlobBytes(await pendingOnSecondPage)).toEqual(
			new Uint8Array([0x01]),
		);
	});
});
