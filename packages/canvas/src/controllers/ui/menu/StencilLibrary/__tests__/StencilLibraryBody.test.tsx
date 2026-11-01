// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RectIcon } from "../../../objects/primitives/RectIcon";
import type { Stencil } from "../../../objects/Stencil";
import type {
	StencilCategory,
	StencilCategorySearch,
} from "../../../objects/StencilCategory";
import { createStencilRegistry } from "../../../objects/StencilRegistry";
import { StencilLibraryBody } from "../StencilLibraryBody";
import { STENCIL_LIBRARY_BROWSE_BATCH_SIZE } from "../StencilLibraryBrowseGroup";
import { DEFAULT_STENCIL_LIBRARY_SEARCH_CAP } from "../utils/createDefaultStencilLibraryCategory";
import type { ResolvedStencilCategory } from "../utils/resolveStencilCategory";
import { resolveStencilCategories } from "../utils/resolveStencilCategory";

/** The IntersectionObservers the body created, so a test can report a crossing by hand. */
class FakeIntersectionObserver {
	static instances: FakeIntersectionObserver[] = [];
	readonly targets: Element[] = [];
	isDisconnected = false;

	constructor(
		readonly callback: IntersectionObserverCallback,
		readonly options: IntersectionObserverInit | undefined,
	) {
		FakeIntersectionObserver.instances.push(this);
	}

	observe(target: Element) {
		this.targets.push(target);
	}

	unobserve() {}

	disconnect() {
		this.isDisconnected = true;
	}

	/** Reports every observed target as within the root's margin. */
	reportIntersecting() {
		act(() =>
			this.callback(
				this.targets.map(
					(target) =>
						({ target, isIntersecting: true }) as IntersectionObserverEntry,
				),
				this as unknown as IntersectionObserver,
			),
		);
	}
}

/** The observer the latest batch set up, the one still watching. */
const liveObserver = (): FakeIntersectionObserver => {
	const live = FakeIntersectionObserver.instances.filter(
		(observer) => !observer.isDisconnected,
	);
	expect(live).toHaveLength(1);
	return live[0];
};

beforeEach(() => {
	FakeIntersectionObserver.instances = [];
	vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
});

let root: Root | null = null;

afterEach(() => {
	if (root) {
		const mounted = root;
		act(() => mounted.unmount());
	}
	root = null;
	vi.unstubAllGlobals();
	document.body.innerHTML = "";
});

const makeStencil = (id: string, label = id): Stencil => ({
	id,
	objectType: "rect",
	label,
	icon: RectIcon,
});

/** Ids `prefix-0` … `prefix-(count-1)`. */
const idsOf = (prefix: string, count: number) =>
	Array.from({ length: count }, (_, index) => `${prefix}-${index}`);

const registry = createStencilRegistry();
for (const id of [
	"rect",
	"ellipse",
	"ec2",
	"lambda",
	"s3",
	...idsOf("icon", 300),
]) {
	registry.register(makeStencil(id));
}
const resolvePreset = (presetId: string) => registry.get(presetId);

const basicCategory: StencilCategory = {
	id: "basic",
	label: "Basic",
	icon: RectIcon,
	presetIds: ["rect", "ellipse"],
};

const searchOnlyCategory: StencilCategory = {
	id: "spec",
	label: "Spec",
	icon: RectIcon,
	presetIds: ["rect"],
	search: () => ({ presetIds: [], matchCount: 0 }),
};

/** Lists ec2 up front; its "show all" view holds an unresolvable group, then compute, then storage. */
const awsCategory = (search?: StencilCategorySearch): StencilCategory => ({
	id: "aws",
	label: { en: "AWS", ja: "AWS" },
	icon: RectIcon,
	presetIds: ["ec2"],
	search,
	browseGroups: [
		{ id: "unknown", label: "Unknown", presetIds: ["not-registered"] },
		{ id: "compute", label: "Compute", presetIds: ["ec2", "lambda"] },
		{
			id: "storage",
			label: { en: "Storage", ja: "ストレージ" },
			presetIds: ["s3"],
		},
	],
});

const resolve = (categories: StencilCategory[]): ResolvedStencilCategory[] =>
	resolveStencilCategories(categories, registry);

const renderBody = (
	sections: readonly ResolvedStencilCategory[],
	collapsedSectionIds: readonly string[] = [],
): HTMLElement => {
	const container = document.createElement("div");
	document.body.appendChild(container);
	root = createRoot(container);
	const mounted = root;
	act(() =>
		mounted.render(
			<StencilLibraryBody
				sections={sections}
				collapsedSectionIds={collapsedSectionIds}
				activePresetId={null}
				resolvePreset={resolvePreset}
			/>,
		),
	);
	return container;
};

const rerenderBody = (sections: readonly ResolvedStencilCategory[]) => {
	const mounted = root!;
	act(() =>
		mounted.render(
			<StencilLibraryBody
				sections={sections}
				collapsedSectionIds={[]}
				activePresetId={null}
				resolvePreset={resolvePreset}
			/>,
		),
	);
};

const showAllButton = (container: HTMLElement, categoryId: string) =>
	container.querySelector<HTMLButtonElement>(
		`[data-testid="stencil-library-show-all-${categoryId}"]`,
	);

const backButton = (container: HTMLElement) =>
	container.querySelector<HTMLButtonElement>(
		'button[aria-label="Back to shape library"]',
	);

const browseGroupHeader = (container: HTMLElement, groupId: string) =>
	container.querySelector<HTMLButtonElement>(
		`[data-testid="stencil-library-browse-group-${groupId}"]`,
	);

const itemIds = (container: HTMLElement) =>
	[
		...container.querySelectorAll<HTMLElement>('[data-id="stencil-library"]'),
	].map((item) => item.dataset.action!.slice("item:".length));

const moreViaSearchButtons = (container: HTMLElement) =>
	[...container.querySelectorAll("button")].filter(
		(button) => button.textContent === "Find more shapes",
	);

const searchInput = (container: HTMLElement) => {
	const inputs =
		container.querySelectorAll<HTMLInputElement>('input[type="text"]');
	expect(inputs).toHaveLength(1);
	return inputs[0];
};

/** Types into a controlled input the way React listens for it. */
const typeQuery = (container: HTMLElement, value: string) => {
	const input = searchInput(container);
	const setValue = Object.getOwnPropertyDescriptor(
		HTMLInputElement.prototype,
		"value",
	)!.set!;
	act(() => {
		setValue.call(input, value);
		input.dispatchEvent(new Event("input", { bubbles: true }));
	});
};

const click = (element: HTMLElement | null) => {
	expect(element).not.toBeNull();
	act(() => element!.click());
};

/** The scrolling list, given a scrollTop jsdom can hold (it lays nothing out). */
const scrollList = (container: HTMLElement): { scrollTop: number } => {
	const list = searchInput(container).parentElement!
		.nextElementSibling as HTMLElement;
	let scrollTop = 0;
	Object.defineProperty(list, "scrollTop", {
		configurable: true,
		get: () => scrollTop,
		set: (value: number) => {
			scrollTop = value;
		},
	});
	return list;
};

describe("StencilLibraryBody: the show all button", () => {
	it("stands under a section with browse groups, in place of the pointer to the search", () => {
		const container = renderBody(
			resolve([
				basicCategory,
				searchOnlyCategory,
				awsCategory(() => ({ presetIds: [], matchCount: 0 })),
			]),
		);

		expect(showAllButton(container, "aws")?.textContent).toBe("Show all ›");
		expect(showAllButton(container, "spec")).toBeNull();
		expect(showAllButton(container, "basic")).toBeNull();
		// Only the search-only section points to the search
		expect(moreViaSearchButtons(container)).toHaveLength(1);
	});

	it("is not offered when every group resolved empty, leaving the pointer to the search", () => {
		const container = renderBody(
			resolve([
				{
					...awsCategory(() => ({ presetIds: [], matchCount: 0 })),
					browseGroups: [
						{ id: "unknown", label: "Unknown", presetIds: ["not-registered"] },
					],
				},
			]),
		);

		expect(showAllButton(container, "aws")).toBeNull();
		expect(moreViaSearchButtons(container)).toHaveLength(1);
	});

	it("goes with the section's grid when the section is collapsed", () => {
		const container = renderBody(resolve([awsCategory()]), ["aws"]);

		expect(showAllButton(container, "aws")).toBeNull();
	});
});

describe("StencilLibraryBody: the show all view", () => {
	it("opens on the category with only its first non-empty group expanded", () => {
		const container = renderBody(resolve([basicCategory, awsCategory()]));

		click(showAllButton(container, "aws"));

		expect(backButton(container)).toBe(document.activeElement);
		expect(backButton(container)!.parentElement!.textContent).toBe("AWS");
		// The sections are gone, the groups stand in their place
		expect(container.querySelector('[data-action^="section:"]')).toBeNull();
		expect(browseGroupHeader(container, "unknown")).toBeNull();
		expect(
			browseGroupHeader(container, "compute")!.getAttribute("aria-expanded"),
		).toBe("true");
		expect(
			browseGroupHeader(container, "storage")!.getAttribute("aria-expanded"),
		).toBe("false");
		expect(itemIds(container)).toEqual(["ec2", "lambda"]);
	});

	it("clears the query on the way in and on the way out", () => {
		const container = renderBody(resolve([awsCategory()]));
		click(showAllButton(container, "aws"));
		typeQuery(container, "lam");
		expect(searchInput(container).value).toBe("lam");

		click(backButton(container));
		expect(searchInput(container).value).toBe("");

		typeQuery(container, "zzz");
		// Searching hides the sections, and the button with them; collapse
		// the query to reach it again.
		typeQuery(container, "");
		click(showAllButton(container, "aws"));
		expect(searchInput(container).value).toBe("");
	});

	it("folds and unfolds a group from its header", () => {
		const container = renderBody(resolve([awsCategory()]));
		click(showAllButton(container, "aws"));

		click(browseGroupHeader(container, "storage"));
		expect(itemIds(container)).toEqual(["ec2", "lambda", "s3"]);
		click(browseGroupHeader(container, "compute"));
		expect(itemIds(container)).toEqual(["s3"]);
	});

	it("starts at the top, and the back button returns to the scroll and the button it left", () => {
		const container = renderBody(resolve([basicCategory, awsCategory()]));
		const list = scrollList(container);
		list.scrollTop = 140;

		click(showAllButton(container, "aws"));
		expect(list.scrollTop).toBe(0);

		click(backButton(container));
		expect(backButton(container)).toBeNull();
		expect(list.scrollTop).toBe(140);
		expect(document.activeElement).toBe(showAllButton(container, "aws"));
	});

	it("leaves the view to the back button alone, not to Escape", () => {
		const container = renderBody(resolve([awsCategory()]));
		click(showAllButton(container, "aws"));

		act(() => {
			backButton(container)!.dispatchEvent(
				new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
			);
		});

		expect(backButton(container)).not.toBeNull();
	});

	it("returns to the sections at the top, focus untouched, when the category goes away", () => {
		const container = renderBody(resolve([basicCategory, awsCategory()]));
		const list = scrollList(container);
		list.scrollTop = 140;
		click(showAllButton(container, "aws"));
		typeQuery(container, "lam");
		act(() => searchInput(container).focus());

		rerenderBody(resolve([basicCategory]));

		expect(backButton(container)).toBeNull();
		expect(
			container.querySelector('[data-action="section:basic"]'),
		).not.toBeNull();
		expect(searchInput(container).value).toBe("");
		expect(list.scrollTop).toBe(0);
		// Not handed to the show all button, as the back button would
		expect(document.activeElement).toBe(searchInput(container));
	});

	it("returns to the sections when the category is left with no group to show", () => {
		const container = renderBody(resolve([awsCategory()]));
		click(showAllButton(container, "aws"));

		rerenderBody(resolve([{ ...awsCategory(), browseGroups: [] }]));

		expect(backButton(container)).toBeNull();
		expect(
			container.querySelector('[data-action="section:aws"]'),
		).not.toBeNull();
	});

	it("follows the category across a rebuild of the sections", () => {
		const container = renderBody(resolve([awsCategory()]));
		click(showAllButton(container, "aws"));
		click(browseGroupHeader(container, "storage"));

		rerenderBody(resolve([basicCategory, awsCategory()]));

		expect(backButton(container)).not.toBeNull();
		expect(itemIds(container)).toEqual(["ec2", "lambda", "s3"]);
	});
});

describe("StencilLibraryBody: searching the show all view", () => {
	it("matches only the category's browsed labels when it declares no search", () => {
		// `basic` lists `rect` and `ellipse`, which the query matches too
		const container = renderBody(resolve([basicCategory, awsCategory()]));
		click(showAllButton(container, "aws"));

		typeQuery(container, "e");

		expect(itemIds(container)).toEqual(["ec2"]);
		expect(container.querySelector("[aria-expanded]")).toBeNull();

		typeQuery(container, "");
		expect(browseGroupHeader(container, "compute")).not.toBeNull();
	});

	it("says more matched than the cap shows", () => {
		const count = DEFAULT_STENCIL_LIBRARY_SEARCH_CAP + 1;
		const container = renderBody(
			resolve([
				{
					id: "icons",
					label: "Icons",
					icon: RectIcon,
					presetIds: ["icon-0"],
					browseGroups: [
						{ id: "all", label: "All", presetIds: idsOf("icon", count) },
					],
				},
			]),
		);
		click(showAllButton(container, "icons"));

		typeQuery(container, "icon");

		expect(itemIds(container)).toHaveLength(DEFAULT_STENCIL_LIBRARY_SEARCH_CAP);
		expect(container.textContent).toContain(
			"More matches than shown; refine the search",
		);
	});

	it("answers from the category's own search alone", () => {
		const search = vi.fn<StencilCategorySearch>(() => ({
			presetIds: ["s3", "rect"],
			matchCount: 2,
		}));
		const container = renderBody(resolve([basicCategory, awsCategory(search)]));
		click(showAllButton(container, "aws"));

		typeQuery(container, "ec");

		expect(search).toHaveBeenLastCalledWith("ec");
		// Not `ec2`, which only a label match over the browsed presets would add
		expect(itemIds(container)).toEqual(["s3", "rect"]);
	});
});

describe("StencilLibraryBody: drawing a group in batches", () => {
	const manyIconsCategory: StencilCategory = {
		id: "icons",
		label: "Icons",
		icon: RectIcon,
		presetIds: ["icon-0"],
		browseGroups: [
			{ id: "all", label: "All", presetIds: idsOf("icon", 300) },
			{ id: "few", label: "Few", presetIds: ["rect"] },
		],
	};

	const enterIcons = (): HTMLElement => {
		const container = renderBody(resolve([manyIconsCategory]));
		click(showAllButton(container, "icons"));
		return container;
	};

	it("draws the first batch, then a batch more each time the sentinel comes in range", () => {
		const container = enterIcons();
		expect(itemIds(container)).toEqual(
			idsOf("icon", STENCIL_LIBRARY_BROWSE_BATCH_SIZE),
		);

		const firstObserver = liveObserver();
		expect(firstObserver.options?.root).toBe(
			searchInput(container).parentElement!.nextElementSibling,
		);
		firstObserver.reportIntersecting();
		expect(itemIds(container)).toHaveLength(
			2 * STENCIL_LIBRARY_BROWSE_BATCH_SIZE,
		);

		// A fresh observer per batch, so a sentinel still in range adds again
		const secondObserver = liveObserver();
		expect(secondObserver).not.toBe(firstObserver);
		secondObserver.reportIntersecting();
		expect(itemIds(container)).toEqual(idsOf("icon", 300));

		// Everything drawn: nothing left to watch
		expect(
			FakeIntersectionObserver.instances.every(
				(observer) => observer.isDisconnected,
			),
		).toBe(true);
	});

	it("ignores a report of the sentinel leaving the range", () => {
		const container = enterIcons();
		const observer = liveObserver();

		act(() =>
			observer.callback(
				[{ isIntersecting: false } as IntersectionObserverEntry],
				observer as unknown as IntersectionObserver,
			),
		);

		expect(itemIds(container)).toHaveLength(STENCIL_LIBRARY_BROWSE_BATCH_SIZE);
	});

	it("starts over from the first batch once the group is folded and unfolded", () => {
		const container = enterIcons();
		liveObserver().reportIntersecting();
		expect(itemIds(container)).toHaveLength(
			2 * STENCIL_LIBRARY_BROWSE_BATCH_SIZE,
		);

		click(browseGroupHeader(container, "all"));
		click(browseGroupHeader(container, "all"));

		expect(itemIds(container)).toHaveLength(STENCIL_LIBRARY_BROWSE_BATCH_SIZE);
	});

	it("starts over from the first batch after a search is cleared", () => {
		const container = enterIcons();
		liveObserver().reportIntersecting();

		typeQuery(container, "icon-1");
		typeQuery(container, "");

		expect(itemIds(container)).toHaveLength(STENCIL_LIBRARY_BROWSE_BATCH_SIZE);
	});
});
