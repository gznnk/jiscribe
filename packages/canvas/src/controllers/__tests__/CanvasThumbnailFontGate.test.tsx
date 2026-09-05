// @vitest-environment jsdom

import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import type * as CanvasMapperModule from "../../states/canvas/CanvasMapper";
import { canvasToState } from "../../states/canvas/CanvasMapper";
import { CanvasThumbnail } from "../CanvasThumbnail";

/**
 * A thumbnail maps its document once per state of the fonts, and the font gate
 * must not add a mapping of its own — the faces it asks for are collected off
 * the mapping the first render already produced.
 */

vi.mock("../../states/canvas/CanvasMapper", async (importOriginal) => {
	const actual = await importOriginal<typeof CanvasMapperModule>();
	return { ...actual, canvasToState: vi.fn(actual.canvasToState) };
});

const mappedTimes = () => vi.mocked(canvasToState).mock.calls.length;

const docWithText: CanvasDoc = {
	version: 1,
	root: [
		{
			id: "box",
			type: "rect",
			x: 0,
			y: 0,
			width: 200,
			height: 80,
			text: "日本語のテキスト",
		},
	],
} as unknown as CanvasDoc;

/**
 * A FontFaceSet stand-in whose `load` calls are settled by hand. `ready` never
 * settles and no event is ever fired, so the fonts-loaded nonce stays put and
 * every mapping counted here is the gate's doing.
 */
const stubFontFaceSet = () => {
	const resolvers: Array<() => void> = [];
	Object.defineProperty(document, "fonts", {
		configurable: true,
		value: {
			ready: new Promise<void>(() => {}),
			addEventListener: () => {},
			removeEventListener: () => {},
			load: () =>
				new Promise<FontFace[]>((resolve) => {
					resolvers.push(() => resolve([]));
				}),
		},
	});
	return { resolveAll: () => resolvers.forEach((resolve) => resolve()) };
};

const roots: { unmount: () => void }[] = [];

const mountThumbnail = () => {
	const root = createRoot(document.createElement("div"));
	roots.push(root);
	act(() => root.render(<CanvasThumbnail canvasDoc={docWithText} />));
};

afterEach(() => {
	act(() => {
		roots.splice(0).forEach((root) => root.unmount());
	});
	// @ts-expect-error jsdom has no `fonts` to restore, so the stub is removed.
	delete document.fonts;
	vi.mocked(canvasToState).mockClear();
});

describe("CanvasThumbnail's font gate", () => {
	it("maps the document once where there are no faces to fetch", () => {
		mountThumbnail();

		expect(mappedTimes()).toBe(1);
	});

	it("maps it once before the faces arrive and once after, and no more", async () => {
		const stub = stubFontFaceSet();

		mountThumbnail();
		expect(mappedTimes()).toBe(1);

		await act(async () => {
			stub.resolveAll();
		});

		expect(mappedTimes()).toBe(2);
	});
});
