// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createCanvasRegistries } from "../../../../registries/createCanvasRegistries";
import type { Stencil } from "../../../objects/Stencil";
import { StencilBar } from "../StencilBar";

const { stencil } = createCanvasRegistries();

const presetsOf = (presetIds: string[]): Stencil[] =>
	presetIds.map((presetId) => {
		const preset = stencil.get(presetId);
		if (!preset) {
			throw new Error(`no preset ${presetId}`);
		}
		return preset;
	});

/** Callbacks of the ResizeObservers built while a test runs, newest last. */
let observerCallbacks: (() => void)[] = [];

class ResizeObserverStub {
	constructor(callback: () => void) {
		observerCallbacks.push(callback);
	}
	observe(): void {}
	unobserve(): void {}
	disconnect(): void {}
}

let unmount: (() => void) | null = null;

beforeEach(() => {
	vi.stubGlobal("ResizeObserver", ResizeObserverStub);
});

afterEach(() => {
	unmount?.();
	unmount = null;
	observerCallbacks = [];
	vi.unstubAllGlobals();
});

/** Reports `height` as the element's box height, which jsdom leaves at 0. */
const setBoxHeight = (
	element: HTMLElement,
	property: "clientHeight" | "offsetHeight",
	height: number,
): void => {
	Object.defineProperty(element, property, {
		configurable: true,
		get: () => height,
	});
};

/** Renders the bar into a band (the container) that reports `bandHeight`. */
const renderBar = (
	presets: Stencil[],
	isOtherShapesPopoverOpen = false,
	bandHeight = 0,
): HTMLElement => {
	const container = document.createElement("div");
	setBoxHeight(container, "clientHeight", bandHeight);
	const root = createRoot(container);
	act(() =>
		root.render(
			<StencilBar
				presets={presets}
				activePresetId={null}
				isOtherShapesPopoverOpen={isOtherShapesPopoverOpen}
			/>,
		),
	);
	unmount = () => act(() => root.unmount());
	return container;
};

describe("StencilBar", () => {
	/** The press on the bar's empty area routes through this element. */
	it("is the stencil-bar menu target", () => {
		const container = renderBar(presetsOf(["rect"]));
		const bar = container.firstElementChild as HTMLElement;
		expect(bar.dataset.kind).toBe("menu");
		expect(bar.dataset.id).toBe("stencil-bar");
	});

	/** A bar too tall for its band scrolls under the wheel; one that fits leaves it to the canvas. */
	it("leaves the wheel to native scrolling while it scrolls", () => {
		const container = renderBar(presetsOf(["rect"]));
		const bar = container.firstElementChild as HTMLElement;
		expect(bar.dataset.gesture).toBe("native-wheel");
	});

	/**
	 * Centred in the band on a whole pixel, and placed again when the band or
	 * the bar is resized.
	 */
	it("sets its top margin to centre it in the band, rounded down", () => {
		const offsetHeightDescriptor = Object.getOwnPropertyDescriptor(
			HTMLElement.prototype,
			"offsetHeight",
		);
		// Set on the prototype, since the bar does not exist until the render.
		Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
			configurable: true,
			get: () => 200,
		});
		try {
			const container = renderBar(presetsOf(["rect"]), false, 501);
			const bar = container.firstElementChild as HTMLElement;
			expect(bar.style.marginTop).toBe("150px");

			setBoxHeight(container, "clientHeight", 603);
			act(() => observerCallbacks.at(-1)!());
			expect(bar.style.marginTop).toBe("201px");
		} finally {
			if (offsetHeightDescriptor) {
				Object.defineProperty(
					HTMLElement.prototype,
					"offsetHeight",
					offsetHeightDescriptor,
				);
			}
		}
	});

	/** The same contract as the top bar's presets, so the same handler takes them. */
	it("draws each preset with the stencil-library item contract, in order", () => {
		const container = renderBar(presetsOf(["text", "rect"]));
		const items = [
			...container.querySelectorAll<HTMLElement>('[data-id="stencil-library"]'),
		];
		expect(
			items.map((item) => [item.dataset.kind, item.dataset.action, item.title]),
		).toEqual([
			["menu", "item:text", "Text"],
			["menu", "item:rect", "Rectangle"],
		]);
	});

	it("puts a divider between the presets and Other shapes, and none without presets", () => {
		const withPresets = renderBar(presetsOf(["rect"]));
		const bar = withPresets.firstElementChild as HTMLElement;
		expect(bar.children).toHaveLength(3);
		unmount?.();

		const withoutPresets = renderBar([]);
		const emptyBar = withoutPresets.firstElementChild as HTMLElement;
		expect(emptyBar.children).toHaveLength(1);
	});

	/**
	 * A target of its own, so a press on it is not one on the bar's empty area
	 * (which closes the popover) and OtherShapesToggleHandler takes its click.
	 */
	it("draws Other shapes as the other-shapes-button target, pressed while the popover is open", () => {
		const container = renderBar(presetsOf(["rect"]));
		const otherShapes = container.querySelector<HTMLButtonElement>(
			'[data-testid="stencil-bar-other-shapes"]',
		);
		expect(otherShapes).not.toBeNull();
		expect(otherShapes!.title).toBe("Other shapes");
		expect(otherShapes!.getAttribute("aria-label")).toBe("Other shapes");
		expect(otherShapes!.type).toBe("button");
		expect(otherShapes!.dataset.kind).toBe("menu");
		expect(otherShapes!.dataset.id).toBe("other-shapes-button");
		expect(otherShapes!.getAttribute("aria-expanded")).toBe("false");
		unmount?.();

		const openContainer = renderBar(presetsOf(["rect"]), true);
		expect(
			openContainer
				.querySelector('[data-testid="stencil-bar-other-shapes"]')!
				.getAttribute("aria-expanded"),
		).toBe("true");
	});
});
