// @vitest-environment jsdom

import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ResolvedImage } from "../../../rendering/objects/ResolvedImagesContext";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { ResolveImage } from "../useDocImages";
import { useDocImages } from "../useDocImages";

/**
 * The resolving side of the image shape. jsdom implements FileReader but no
 * object URLs, so those are stubbed and recorded: what is under test is which
 * `src` is asked for, what a rejection becomes, and that a URL is handed back
 * when the document stops naming the file.
 */

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

/**
 * Lets every pending turn run inside act. A resolution goes through the host's
 * promise, then a jsdom FileReader load event, then the state update — more
 * tasks than one flush covers, and a reader firing after a test has ended would
 * land in the next one's stubs.
 */
const settleResolutions = async (): Promise<void> => {
	for (let flush = 0; flush < 10; flush++) {
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 0));
		});
	}
};

const image = (id: string, src: string): ObjectState =>
	({ id, type: "image", src }) as unknown as ObjectState;

const objectsOf = (...sources: string[]): Record<string, ObjectState> =>
	Object.fromEntries(
		sources.map((src, index) => [`i${index}`, image(`i${index}`, src)]),
	);

let createdObjectUrls: string[] = [];
let revokedObjectUrls: string[] = [];

beforeEach(() => {
	createdObjectUrls = [];
	revokedObjectUrls = [];
	let nextUrlIndex = 0;
	// jsdom has neither, so they are installed rather than spied on.
	URL.createObjectURL = vi.fn(() => {
		const objectUrl = `blob:stub/${nextUrlIndex++}`;
		createdObjectUrls.push(objectUrl);
		return objectUrl;
	});
	URL.revokeObjectURL = vi.fn((objectUrl: string) => {
		revokedObjectUrls.push(objectUrl);
	});
});

afterEach(() => {
	vi.restoreAllMocks();
});

/** Mounts the hook, exposing its latest lookup and a way to swap the document. */
const renderHook = (
	initialObjects: Record<string, ObjectState>,
	resolveImage: ResolveImage | undefined,
) => {
	let latestLookup: (src: string) => ResolvedImage = () => ({
		status: "loading",
	});
	let swapObjects: (objects: Record<string, ObjectState>) => void = () => {};
	const Probe = ({ objects }: { objects: Record<string, ObjectState> }) => {
		const [currentObjects, setObjects] = useState(objects);
		swapObjects = setObjects;
		latestLookup = useDocImages(currentObjects, resolveImage);
		return null;
	};
	const root = createRoot(document.createElement("div"));
	act(() => root.render(<Probe objects={initialObjects} />));
	return {
		lookup: (src: string) => latestLookup(src),
		setObjects: (objects: Record<string, ObjectState>) =>
			act(() => swapObjects(objects)),
		unmount: () => act(() => root.unmount()),
	};
};

describe("useDocImages", () => {
	it("reports a resolved file as ready, with both a blob URL and its bytes", async () => {
		const resolveImage = vi.fn(
			async () => new Blob(["px"], { type: "image/png" }),
		);
		const probe = renderHook(objectsOf("ok.png"), resolveImage);

		expect(probe.lookup("ok.png")).toEqual({ status: "loading" });

		await settleResolutions();

		expect(resolveImage).toHaveBeenCalledTimes(1);
		expect(resolveImage).toHaveBeenCalledWith("ok.png");
		const resolved = probe.lookup("ok.png");
		expect(resolved.status).toBe("ready");
		if (resolved.status === "ready") {
			expect(resolved.objectUrl).toBe(createdObjectUrls[0]);
			expect(resolved.dataUri.startsWith("data:image/png;base64,")).toBe(true);
		}
		probe.unmount();
	});

	it("reports a rejected file as an error and makes no object URL for it", async () => {
		const resolveImage = vi.fn(() => Promise.reject(new Error("missing")));
		const probe = renderHook(objectsOf("gone.png"), resolveImage);

		await settleResolutions();

		expect(probe.lookup("gone.png")).toEqual({ status: "error" });
		expect(createdObjectUrls).toEqual([]);
		probe.unmount();
	});

	it("leaves every src loading when there is no resolver", async () => {
		const probe = renderHook(objectsOf("ok.png"), undefined);

		await settleResolutions();

		expect(probe.lookup("ok.png")).toEqual({ status: "loading" });
		probe.unmount();
	});

	it("asks for each src once, however many objects draw it", async () => {
		const resolveImage = vi.fn(async () => new Blob(["px"]));
		const probe = renderHook(objectsOf("ok.png", "ok.png"), resolveImage);

		await settleResolutions();
		// A new objects map naming the same file must not re-ask either.
		probe.setObjects(objectsOf("ok.png", "ok.png"));
		await settleResolutions();

		expect(resolveImage).toHaveBeenCalledTimes(1);
		probe.unmount();
	});

	it("revokes the blob URL of a src the document stops drawing", async () => {
		const resolveImage = vi.fn(async () => new Blob(["px"]));
		const probe = renderHook(objectsOf("ok.png"), resolveImage);
		await settleResolutions();
		const objectUrl = createdObjectUrls[0];

		probe.setObjects(objectsOf("other.png"));
		await settleResolutions();

		expect(revokedObjectUrls).toContain(objectUrl);
		expect(probe.lookup("ok.png")).toEqual({ status: "loading" });
		expect(resolveImage).toHaveBeenCalledTimes(2);
		probe.unmount();
	});

	it("revokes what it holds when the canvas goes away", async () => {
		const resolveImage = vi.fn(async () => new Blob(["px"]));
		const probe = renderHook(objectsOf("ok.png"), resolveImage);
		await settleResolutions();

		probe.unmount();

		expect(revokedObjectUrls).toEqual(createdObjectUrls);
	});

	it("settles as error a resolver that throws synchronously", async () => {
		const resolveImage = vi.fn((): Promise<Blob> => {
			throw new Error("no reader");
		});
		// A throw escaping the effect would take the render down with it, so the
		// mount inside renderHook is half of what this asserts.
		const probe = renderHook(objectsOf("boom.png"), resolveImage);

		await settleResolutions();

		expect(probe.lookup("boom.png")).toEqual({ status: "error" });
		expect(createdObjectUrls).toEqual([]);
		probe.unmount();
	});

	it("discards a resolution whose src the document dropped, revoking its URL", async () => {
		let releaseSlowBlob: (blob: Blob) => void = () => {};
		const resolveImage = vi.fn(
			(src: string) =>
				new Promise<Blob>((resolve) => {
					if (src === "slow.png") {
						releaseSlowBlob = resolve;
					} else {
						resolve(new Blob(["px"]));
					}
				}),
		);
		const probe = renderHook(objectsOf("slow.png"), resolveImage);

		probe.setObjects(objectsOf("other.png"));
		await settleResolutions();
		// The bytes arrive for a src the lookup no longer has a slot for.
		releaseSlowBlob(new Blob(["px"]));
		await settleResolutions();

		const [otherObjectUrl, slowObjectUrl] = createdObjectUrls;
		expect(probe.lookup("slow.png")).toEqual({ status: "loading" });
		expect(revokedObjectUrls).toEqual([slowObjectUrl]);
		expect(probe.lookup("other.png")).toEqual(
			expect.objectContaining({ status: "ready", objectUrl: otherObjectUrl }),
		);
		probe.unmount();
	});

	it("revokes the URL of a resolution that lands after the canvas went away", async () => {
		const reportError = vi.spyOn(console, "error").mockImplementation(() => {});
		const reportWarning = vi
			.spyOn(console, "warn")
			.mockImplementation(() => {});
		let releaseBlob: (blob: Blob) => void = () => {};
		const resolveImage = vi.fn(
			() =>
				new Promise<Blob>((resolve) => {
					releaseBlob = resolve;
				}),
		);
		const probe = renderHook(objectsOf("slow.png"), resolveImage);
		// The resolver is asked one microtask after the effect, so the fetch has
		// to be let out before the canvas goes away for it to be pending at all.
		await act(async () => {});

		probe.unmount();
		releaseBlob(new Blob(["px"]));
		await settleResolutions();

		expect(createdObjectUrls).toHaveLength(1);
		expect(revokedObjectUrls).toEqual(createdObjectUrls);
		expect(reportError).not.toHaveBeenCalled();
		expect(reportWarning).not.toHaveBeenCalled();
	});
});
