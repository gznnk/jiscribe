// @vitest-environment jsdom

import type { RichText } from "@jiscribe/doc/model/objects/types/text/RichText";
import type { ReactNode } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { createCanvasZoomStore } from "../../../../../controllers/hooks/utils/createCanvasZoomStore";
import type { CanvasZoomStore } from "../../../CanvasZoomStoreContext";
import { CanvasZoomStoreContext } from "../../../CanvasZoomStoreContext";
import { TextOverlay } from "../TextOverlay";
import { TextOverlayFrame } from "../TextOverlayFrame";

// Without this React treats every `act` below as unsupported and warns, the
// flushes being correct all the same.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let unmount: (() => void) | null = null;

afterEach(() => {
	unmount?.();
	unmount = null;
});

/** Mounts `children` in an SVG under `zoomStore`, returning the container to query. */
const mountInSvg = (
	zoomStore: CanvasZoomStore | null,
	children: ReactNode,
): HTMLDivElement => {
	const container = document.createElement("div");
	const root = createRoot(container);
	act(() =>
		root.render(
			<CanvasZoomStoreContext value={zoomStore}>
				<svg>{children}</svg>
			</CanvasZoomStoreContext>,
		),
	);
	unmount = () => act(() => root.unmount());
	return container;
};

const readForeignObject = (container: HTMLElement): Element => {
	const foreignObject = container.querySelector("foreignObject");
	if (!foreignObject) {
		throw new Error("no foreignObject was drawn");
	}
	return foreignObject;
};

const renderTextOverlay = (zoomStore: CanvasZoomStore, text: RichText) =>
	mountInSvg(
		zoomStore,
		<TextOverlay
			x={0}
			y={0}
			width={100}
			height={40}
			text={text}
			fontSize={16}
		/>,
	);

describe("TextOverlayFrame", () => {
	it("hides its box while too small to read and keeps the same element mounted", () => {
		const zoomStore = createCanvasZoomStore(1);
		const container = mountInSvg(
			zoomStore,
			<TextOverlayFrame x={0} y={0} width={100} height={40} fontSize={16}>
				label
			</TextOverlayFrame>,
		);
		const shownElement = readForeignObject(container);
		expect(shownElement.hasAttribute("display")).toBe(false);

		act(() => zoomStore.setZoom(0.2));
		const hiddenElement = readForeignObject(container);
		expect(hiddenElement).toBe(shownElement);
		expect(hiddenElement.getAttribute("display")).toBe("none");
		expect(hiddenElement.textContent).toBe("label");

		act(() => zoomStore.setZoom(1));
		expect(readForeignObject(container).hasAttribute("display")).toBe(false);
	});

	it("judges by maxFontSize when one is given", () => {
		const zoomStore = createCanvasZoomStore(0.2);
		const container = mountInSvg(
			zoomStore,
			<TextOverlayFrame
				x={0}
				y={0}
				width={100}
				height={40}
				fontSize={16}
				maxFontSize={32}
			>
				label
			</TextOverlayFrame>,
		);
		// 16 × 0.2 = 3.2px would hide it; 32 × 0.2 = 6.4px does not.
		expect(readForeignObject(container).hasAttribute("display")).toBe(false);
	});
});

describe("TextOverlay", () => {
	it("stays drawn while a run is large enough to read", () => {
		const zoomStore = createCanvasZoomStore(0.2);
		const plain = renderTextOverlay(zoomStore, "small");
		expect(readForeignObject(plain).getAttribute("display")).toBe("none");
		unmount?.();

		const withLargeRun = renderTextOverlay(zoomStore, [
			{ text: "small " },
			{ text: "LARGE", fontSize: 40 },
		]);
		expect(readForeignObject(withLargeRun).hasAttribute("display")).toBe(false);
	});
});
