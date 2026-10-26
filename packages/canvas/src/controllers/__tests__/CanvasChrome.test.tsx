// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { Canvas } from "../Canvas";
import { ShapesIcon } from "../ui/icons/ShapesIcon";
import { STENCIL_RAIL_WIDTH } from "../ui/menu/StencilRail/StencilRailStyled";
import { basicStencilCategory } from "../ui/objects/StencilCategory";

/**
 * Which pieces of chrome a mounted canvas draws for its props: the rail, the
 * toolbar, the rail's catalog button and its pinned categories. What each piece
 * does is the business of its own tests and the e2e suite; this pins only the
 * show / hide rules, which no single component owns.
 */

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

beforeAll(() => {
	// jsdom has no layout and no media queries: the canvas only needs the two to exist.
	globalThis.ResizeObserver ??= class {
		observe() {}
		unobserve() {}
		disconnect() {}
	};
	// The gesture recognizer maps a press into SVG coordinates; with no screen
	// matrix it takes the client coordinates as they are.
	const svgPrototype = SVGSVGElement.prototype as unknown as Record<
		string,
		unknown
	>;
	svgPrototype.createSVGPoint ??= () => ({ x: 0, y: 0 });
	svgPrototype.getScreenCTM ??= () => null;
	// jsdom implements no pointer capture; the recognizer only needs the calls.
	const elementPrototype = Element.prototype as unknown as Record<
		string,
		unknown
	>;
	elementPrototype.setPointerCapture ??= () => {};
	elementPrototype.releasePointerCapture ??= () => {};
	elementPrototype.hasPointerCapture ??= () => false;
	window.matchMedia ??= (query: string) =>
		({
			matches: false,
			media: query,
			addEventListener() {},
			removeEventListener() {},
		}) as unknown as MediaQueryList;
});

let unmount: (() => void) | null = null;

afterEach(() => {
	unmount?.();
	unmount = null;
});

const mount = (props: Partial<React.ComponentProps<typeof Canvas>>) => {
	const container = document.createElement("div");
	document.body.appendChild(container);
	const root = createRoot(container);
	act(() =>
		root.render(
			<Canvas doc={{ version: 1, root: [] }} autoFocus={false} {...props} />,
		),
	);
	unmount = () => {
		act(() => root.unmount());
		container.remove();
	};
	return container;
};

const RAIL = '[data-kind="menu"][data-id="stencil-rail"]';
const TOOLBAR = '[data-kind="menu"][data-id="toolbar"]';
const CATALOG_BUTTON = `${RAIL} [data-action="command:toggleStencilLibrary"]`;

const library = { sections: [basicStencilCategory] };

const FLYOUT = '[data-id="stencil-library-panel"][data-presentation="flyout"]';

/** A bar whose one button runs `toggleStencilLibrary`, for a canvas with no rail. */
const catalogToolbar = {
	sections: [
		{
			id: "catalog",
			items: [
				{
					type: "command" as const,
					commandId: "toggleStencilLibrary",
					icon: ShapesIcon,
				},
			],
		},
	],
};

/**
 * Presses `element` the way a person does, through the gesture recognizer: it
 * batches pointer input into an animation frame, so the frame is flushed before
 * returning.
 */
const press = async (element: Element | null) => {
	if (element === null) {
		throw new Error("nothing to press");
	}
	const init: PointerEventInit = {
		bubbles: true,
		button: 0,
		buttons: 1,
		pointerId: 1,
		isPrimary: true,
		pointerType: "mouse",
	};
	await act(async () => {
		element.dispatchEvent(new PointerEvent("pointerdown", init));
		element.dispatchEvent(
			new PointerEvent("pointerup", { ...init, buttons: 0 }),
		);
		await new Promise((resolve) => requestAnimationFrame(resolve));
	});
};

describe("Canvas chrome", () => {
	it("draws the rail with core's presets and the toolbar by default", () => {
		const container = mount({});
		const railPresets = [
			...container.querySelectorAll(`${RAIL} [data-id="stencil-library"]`),
		].map((item) => item.getAttribute("data-action"));
		expect(railPresets).toEqual([
			"item:rect",
			"item:ellipse",
			"item:polygon",
			"item:polyline",
			"item:text",
		]);
		expect(container.querySelector(TOOLBAR)).not.toBeNull();
		// The bar holds no shape tool any more.
		expect(
			container.querySelector(`${TOOLBAR} [data-id="stencil-library"]`),
		).toBeNull();
	});

	it("keeps the rail when the toolbar is hidden", () => {
		const container = mount({ toolbar: { show: false } });
		expect(container.querySelector(TOOLBAR)).toBeNull();
		expect(container.querySelector(RAIL)).not.toBeNull();
	});

	it("hides the rail alone through rail.show", () => {
		const container = mount({ rail: { show: false } });
		expect(container.querySelector(RAIL)).toBeNull();
		expect(container.querySelector(TOOLBAR)).not.toBeNull();
	});

	it("draws the presets rail.presetIds names, in that order", () => {
		const container = mount({
			rail: { presetIds: ["text", "no-such-preset", "rect"] },
		});
		const railPresets = [
			...container.querySelectorAll(`${RAIL} [data-id="stencil-library"]`),
		].map((item) => item.getAttribute("data-action"));
		expect(railPresets).toEqual(["item:text", "item:rect"]);
	});

	it("offers the catalog button only with a library", () => {
		expect(mount({}).querySelector(CATALOG_BUTTON)).toBeNull();
		unmount?.();
		expect(
			mount({ stencilLibrary: library }).querySelector(CATALOG_BUTTON),
		).not.toBeNull();
	});

	it("draws a pinned category the library holds, and leaves off one it does not", () => {
		const container = mount({
			stencilLibrary: library,
			initialConfig: { pinnedCategoryIds: ["no-such-category", "basic"] },
		});
		const railCategories = [
			...container.querySelectorAll(`${RAIL} [data-id="stencil-category"]`),
		].map((button) => button.getAttribute("data-action"));
		expect(railCategories).toEqual(["toggle:basic"]);
	});

	it("draws no pinned category without a library", () => {
		const container = mount({
			initialConfig: { pinnedCategoryIds: ["basic"] },
		});
		expect(
			container.querySelector(`${RAIL} [data-id="stencil-category"]`),
		).toBeNull();
	});

	it("draws the docked panel restored open, on the catalog when no content was stored", () => {
		const container = mount({
			stencilLibrary: library,
			initialConfig: { sidebars: { left: { isOpen: true } } },
		});
		const dock = container.querySelector(
			'[data-id="stencil-library-panel"][data-presentation="docked"]',
		);
		expect(dock).not.toBeNull();
		expect(dock?.querySelector('[data-action="show:basic"]')).not.toBeNull();
	});

	it("draws no docked panel restored open on a host with no library", () => {
		const container = mount({
			initialConfig: { sidebars: { left: { isOpen: true } } },
		});
		expect(
			container.querySelector('[data-id="stencil-library-panel"]'),
		).toBeNull();
	});

	/**
	 * The state keeps the id a host without that plugin cannot show; the panel
	 * draws the catalog, and the rail says so rather than pressing nothing.
	 */
	it("draws a docked category the library lacks as the catalog, the catalog button pressed", () => {
		const container = mount({
			stencilLibrary: library,
			initialConfig: {
				sidebars: {
					left: { isOpen: true },
					panels: {
						stencilLibrary: {
							content: { kind: "category", categoryId: "no-such-category" },
						},
					},
				},
			},
		});
		const dock = container.querySelector(
			'[data-id="stencil-library-panel"][data-presentation="docked"]',
		);
		expect(dock?.querySelector('[data-action="show:basic"]')).not.toBeNull();
		expect(dock?.hasAttribute("data-stencil-category-panel")).toBe(false);
		expect(
			container.querySelector(CATALOG_BUTTON)?.getAttribute("aria-expanded"),
		).toBe("true");
	});

	it("opens the flyout against the rail", async () => {
		const container = mount({ stencilLibrary: library });
		await press(container.querySelector(CATALOG_BUTTON));

		expect(
			container.querySelector<HTMLElement>(FLYOUT)?.parentElement?.style.left,
		).toBe(`${STENCIL_RAIL_WIDTH}px`);
	});

	it("opens the flyout at the left edge with the rail hidden", async () => {
		const container = mount({
			stencilLibrary: library,
			rail: { show: false },
			toolbar: catalogToolbar,
		});
		await press(
			container.querySelector(
				`${TOOLBAR} [data-action="command:toggleStencilLibrary"]`,
			),
		);

		expect(
			container.querySelector<HTMLElement>(FLYOUT)?.parentElement?.style.left,
		).toBe("0px");
	});

	it("names the catalog button after the toggleStencilLibrary command, host override included", () => {
		expect(
			mount({ stencilLibrary: library })
				.querySelector(CATALOG_BUTTON)
				?.getAttribute("title"),
		).toBe("Find Shapes");
		unmount?.();
		const button = mount({
			stencilLibrary: library,
			messages: { commandLabels: { toggleStencilLibrary: "Browse" } },
		}).querySelector(CATALOG_BUTTON);
		expect(button?.getAttribute("title")).toBe("Browse");
		expect(button?.getAttribute("aria-label")).toBe("Browse");
	});

	it("draws no catalog button when the host switched its command off", () => {
		const container = mount({
			stencilLibrary: library,
			initialConfig: { commands: ["undo", "redo"] },
		});
		expect(container.querySelector(CATALOG_BUTTON)).toBeNull();
	});

	it("names each catalog pin after its category, in the locale's wording", async () => {
		const container = mount({ stencilLibrary: library, locale: "ja" });
		await press(container.querySelector(CATALOG_BUTTON));

		expect(
			container
				.querySelector(`${FLYOUT} [data-action="pin:basic"]`)
				?.getAttribute("aria-label"),
		).toBe("基本 をピン留め");
	});
});
