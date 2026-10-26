// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { Canvas } from "../Canvas";
import { ShapesIcon } from "../ui/icons/ShapesIcon";
import { STENCIL_RAIL_WIDTH } from "../ui/menu/StencilRail/StencilRailStyled";
import { RectIcon } from "../ui/objects/primitives/RectIcon";
import {
	basicStencilCategory,
	type StencilCategory,
} from "../ui/objects/StencilCategory";

/**
 * Which pieces of chrome a mounted canvas draws for its props: the rail, the
 * toolbar, the rail's catalog button and its pinned categories, in the rail's
 * order. What each piece
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

type CanvasProps = Partial<React.ComponentProps<typeof Canvas>>;

/** One empty document for every render, so a re-render changes only the props a test names. */
const EMPTY_DOC = { version: 1 as const, root: [] };

/**
 * Mounts a canvas and returns its container, plus a re-render that keeps the
 * same mounted canvas (mount-time config is not read again).
 */
const mountWithRerender = (props: CanvasProps) => {
	const container = document.createElement("div");
	document.body.appendChild(container);
	const root = createRoot(container);
	const render = (nextProps: CanvasProps) =>
		act(() =>
			root.render(<Canvas doc={EMPTY_DOC} autoFocus={false} {...nextProps} />),
		);
	render(props);
	unmount = () => {
		act(() => root.unmount());
		container.remove();
	};
	return { container, rerender: render };
};

const mount = (props: CanvasProps) => mountWithRerender(props).container;

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

	/** The button shown pressed is the one that closes the panel, in one press. */
	it("closes a docked category the library lacks from the pressed catalog button in one press", async () => {
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
		await press(container.querySelector(CATALOG_BUTTON));

		expect(
			container.querySelector('[data-id="stencil-library-panel"]'),
		).toBeNull();
		expect(
			container.querySelector(CATALOG_BUTTON)?.getAttribute("aria-expanded"),
		).toBe("false");
	});

	/**
	 * The library is a live prop the reducer reads too. A category the first
	 * library lacked is drawn once the new one holds it, and a rail press goes
	 * by the new library: the catalog button switches the docked panel to the
	 * catalog instead of closing it, since the panel no longer draws the catalog.
	 */
	it("follows a stencilLibrary changed after mount, in what it draws and what a press does", async () => {
		const lineCategory: StencilCategory = {
			id: "lines",
			label: "Lines",
			icon: RectIcon,
			presetIds: ["polyline", "polygon"],
		};
		const restoredDock = {
			sidebars: {
				left: { isOpen: true },
				panels: {
					stencilLibrary: {
						content: { kind: "category" as const, categoryId: "lines" },
					},
				},
			},
		};
		const { container, rerender } = mountWithRerender({
			stencilLibrary: library,
			initialConfig: restoredDock,
		});
		const dock = () =>
			container.querySelector(
				'[data-id="stencil-library-panel"][data-presentation="docked"]',
			);
		expect(dock()?.hasAttribute("data-stencil-category-panel")).toBe(false);

		rerender({
			stencilLibrary: { sections: [basicStencilCategory, lineCategory] },
			initialConfig: restoredDock,
		});
		expect(dock()?.getAttribute("data-stencil-category-panel")).toBe("lines");

		await press(container.querySelector(CATALOG_BUTTON));
		expect(dock()).not.toBeNull();
		expect(dock()?.hasAttribute("data-stencil-category-panel")).toBe(false);
		expect(dock()?.querySelector('[data-action="show:lines"]')).not.toBeNull();
	});

	describe("the rail's order", () => {
		const categoryOf = (id: string, presetIds: string[]): StencilCategory => ({
			id,
			label: id,
			icon: RectIcon,
			presetIds,
		});
		const orderLibrary = {
			sections: [
				categoryOf("boxes", ["rect"]),
				categoryOf("rounds", ["ellipse"]),
			],
		};
		/** The rail's children top to bottom: a divider, the catalog button, or a button's action. */
		const railOrder = (container: HTMLElement) =>
			[...(container.querySelector(RAIL)?.children ?? [])].map((child) => {
				const action = child.getAttribute("data-action");
				return action === null ? "divider" : action;
			});

		it("draws the presets, the catalog button, then the pins, a divider between each group", () => {
			const container = mount({
				stencilLibrary: orderLibrary,
				rail: { presetIds: ["rect", "text"] },
				initialConfig: { pinnedCategoryIds: ["rounds", "boxes"] },
			});
			expect(railOrder(container)).toEqual([
				"item:rect",
				"item:text",
				"divider",
				"command:toggleStencilLibrary",
				"divider",
				"toggle:rounds",
				"toggle:boxes",
			]);
		});

		it("draws no divider after the catalog button with nothing pinned", () => {
			const container = mount({
				stencilLibrary: orderLibrary,
				rail: { presetIds: ["rect"] },
			});
			expect(railOrder(container)).toEqual([
				"item:rect",
				"divider",
				"command:toggleStencilLibrary",
			]);
		});

		it("draws no divider above the catalog button with no presets", () => {
			const container = mount({
				stencilLibrary: orderLibrary,
				rail: { presetIds: [] },
				initialConfig: { pinnedCategoryIds: ["boxes"] },
			});
			expect(railOrder(container)).toEqual([
				"command:toggleStencilLibrary",
				"divider",
				"toggle:boxes",
			]);
		});
	});

	describe("a rail too short for what it holds", () => {
		const categoryOf = (id: string, presetIds: string[]): StencilCategory => ({
			id,
			label: id,
			icon: RectIcon,
			presetIds,
		});
		const originalGetBoundingClientRect =
			Element.prototype.getBoundingClientRect;
		const originalResizeObserver = globalThis.ResizeObserver;
		/** The height the rail is measured at; a test changes it and calls resizeRail. */
		let railHeight = 1;
		let resizeCallbacks: ((entries: ResizeObserverEntry[]) => void)[] = [];
		beforeEach(() => {
			railHeight = 1;
			resizeCallbacks = [];
			Element.prototype.getBoundingClientRect = function (this: Element) {
				return (
					this.matches(RAIL)
						? { width: 48, height: railHeight }
						: originalGetBoundingClientRect.call(this)
				) as DOMRect;
			};
			globalThis.ResizeObserver = class {
				constructor(callback: (entries: ResizeObserverEntry[]) => void) {
					resizeCallbacks.push(callback);
				}
				observe() {}
				unobserve() {}
				disconnect() {}
			} as unknown as typeof ResizeObserver;
		});
		afterEach(() => {
			Element.prototype.getBoundingClientRect = originalGetBoundingClientRect;
			globalThis.ResizeObserver = originalResizeObserver;
		});
		/**
		 * Measures the rail at `height` and fires every observer, as a resize
		 * would. They get no entries: the rail re-measures itself, and the other
		 * observers then have nothing to act on.
		 */
		const resizeRail = (height: number) => {
			railHeight = height;
			act(() => {
				for (const callback of resizeCallbacks) {
					callback([]);
				}
			});
		};

		const shortRailProps: CanvasProps = {
			stencilLibrary: {
				sections: [
					categoryOf("boxes", ["rect"]),
					categoryOf("rounds", ["ellipse"]),
					categoryOf("lines", ["polyline"]),
				],
			},
			rail: { presetIds: ["rect", "ellipse"] },
			initialConfig: { pinnedCategoryIds: ["rounds", "boxes", "lines"] },
		};

		/**
		 * Mounts with the rail measured 1px tall, short of even the presets: every
		 * pin goes into "…" and the presets fold. Left alone, jsdom measures
		 * 0, which the rail reads as not laid out.
		 */
		const mountShortRail = (props: CanvasProps = {}) =>
			mountWithRerender({ ...shortRailProps, ...props });
		const MORE_BUTTON = `${RAIL} [data-action="toggle:railOverflow"]`;
		const PRESETS_BUTTON = `${RAIL} [data-action="toggle:railPresets"]`;
		const POPOVER = '[data-id="stencil-rail-popover"]';

		it("moves every pin into '…', titled with the count, and folds the presets", () => {
			const { container } = mountShortRail();
			expect(
				container.querySelector(`${RAIL} [data-id="stencil-category"]`),
			).toBeNull();
			expect(container.querySelector(MORE_BUTTON)?.getAttribute("title")).toBe(
				"3 more categories",
			);
			expect(
				container.querySelector(`${RAIL} [data-id="stencil-library"]`),
			).toBeNull();
			expect(
				container.querySelector(PRESETS_BUTTON)?.getAttribute("title"),
			).toBe("Basic shapes");
			expect(container.querySelector(CATALOG_BUTTON)).not.toBeNull();
		});

		it("lists them in the '…' popover, in pin order under their heading", async () => {
			const { container } = mountShortRail();
			await press(container.querySelector(MORE_BUTTON));

			const popover = container.querySelector(POPOVER);
			const rows = [
				...(popover?.querySelectorAll('[data-id="stencil-category"]') ?? []),
			].map((row) => row.getAttribute("data-action"));
			expect(rows).toEqual(["toggle:rounds", "toggle:boxes", "toggle:lines"]);
			expect(popover?.textContent).toContain("Pinned");
			expect(
				container.querySelector(MORE_BUTTON)?.getAttribute("aria-expanded"),
			).toBe("true");
		});

		it("holds the folded presets as library items in its popover", async () => {
			const { container } = mountShortRail();
			await press(container.querySelector(PRESETS_BUTTON));

			const items = [
				...container.querySelectorAll(`${POPOVER} [data-id="stencil-library"]`),
			].map((item) => item.getAttribute("data-action"));
			expect(items).toEqual(["item:rect", "item:ellipse"]);
		});

		/** Guards Canvas drawing the flyout only for panel content (isStencilPanelContent). */
		it("opens '…' over a docked panel without drawing the panel a second time as a flyout", async () => {
			const { container } = mountShortRail({
				initialConfig: {
					pinnedCategoryIds: ["rounds", "boxes", "lines"],
					sidebars: { left: { isOpen: true } },
				},
			});
			await press(container.querySelector(MORE_BUTTON));

			expect(container.querySelector(POPOVER)).not.toBeNull();
			expect(container.querySelector(FLYOUT)).toBeNull();
			expect(
				container.querySelector(
					'[data-id="stencil-library-panel"][data-presentation="docked"]',
				),
			).not.toBeNull();
		});

		it("closes '…' for good once the rail grows out of overflowing", async () => {
			const { container } = mountShortRail();
			await press(container.querySelector(MORE_BUTTON));
			expect(container.querySelector(POPOVER)).not.toBeNull();

			resizeRail(2000);
			expect(container.querySelector(MORE_BUTTON)).toBeNull();
			// Short again: "…" is back, its popover is not.
			resizeRail(1);
			expect(container.querySelector(MORE_BUTTON)).not.toBeNull();
			expect(container.querySelector(POPOVER)).toBeNull();
			expect(
				container.querySelector(MORE_BUTTON)?.getAttribute("aria-expanded"),
			).toBe("false");
		});

		it("keeps an open popover through a rail not laid out (0 tall)", async () => {
			const { container } = mountShortRail();
			await press(container.querySelector(MORE_BUTTON));

			resizeRail(0);
			resizeRail(1);
			expect(container.querySelector(POPOVER)).not.toBeNull();
		});

		it("closes the presets' popover once the presets unfold", async () => {
			const { container } = mountShortRail();
			await press(container.querySelector(PRESETS_BUTTON));
			expect(container.querySelector(POPOVER)).not.toBeNull();

			resizeRail(2000);
			resizeRail(1);
			expect(container.querySelector(POPOVER)).toBeNull();
		});

		it("closes a rail popover when the host hides the rail", async () => {
			const { container, rerender } = mountShortRail();
			await press(container.querySelector(MORE_BUTTON));

			rerender({ ...shortRailProps, rail: { show: false } });
			// Gone from the state while the rail is hidden: with nothing selected,
			// Escape has nothing left to clear and is left to the browser.
			const escape = new KeyboardEvent("keydown", {
				key: "Escape",
				code: "Escape",
				bubbles: true,
				cancelable: true,
			});
			const canvasRoot = container.querySelector('[tabindex="0"]');
			expect(canvasRoot).not.toBeNull();
			act(() => {
				canvasRoot?.dispatchEvent(escape);
			});
			expect(escape.defaultPrevented).toBe(false);
			rerender(shortRailProps);
			expect(container.querySelector(MORE_BUTTON)).not.toBeNull();
			expect(container.querySelector(POPOVER)).toBeNull();
		});
	});
});
