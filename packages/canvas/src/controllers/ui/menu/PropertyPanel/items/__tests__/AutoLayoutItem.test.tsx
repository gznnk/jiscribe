// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { CanvasLocaleContext } from "../../../../../../foundation/i18n/CanvasLocaleContext";
import { defaultCanvasMessages } from "../../../../../../foundation/i18n/CanvasMessages";
import { CanvasMessagesContext } from "../../../../../../foundation/i18n/CanvasMessagesContext";
import { jaCanvasMessages } from "../../../../../../foundation/i18n/jaCanvasMessages";
import type { CanvasControllerState } from "../../../../../CanvasTypes";
import {
	buildChainDoc,
	layoutRegistries,
} from "../../../../../commands/arrange/layout/__tests__/support/layoutFixtures";
import { createInitialControllerState } from "../../../../../reducer/createInitialControllerState";
import type { CanvasRegistries } from "../../../../../registries/CanvasRegistries";
import { CanvasRegistriesContext } from "../../../../../registries/CanvasRegistriesContext";
import { createCanvasRegistries } from "../../../../../registries/createCanvasRegistries";
import { AutoLayoutItem } from "../AutoLayoutItem";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement | null = null;
let root: ReturnType<typeof createRoot> | null = null;

const render = (
	locale: string,
	messages = defaultCanvasMessages,
	registries: CanvasRegistries = layoutRegistries,
): HTMLDivElement => {
	const canvasState: CanvasControllerState = createInitialControllerState(
		buildChainDoc(),
		layoutRegistries,
	);
	container = document.createElement("div");
	document.body.appendChild(container);
	root = createRoot(container);
	const mounted = root;
	act(() => {
		mounted.render(
			<CanvasRegistriesContext.Provider value={registries}>
				<CanvasLocaleContext.Provider value={locale}>
					<CanvasMessagesContext.Provider value={messages}>
						<AutoLayoutItem canvasState={canvasState} />
					</CanvasMessagesContext.Provider>
				</CanvasLocaleContext.Provider>
			</CanvasRegistriesContext.Provider>,
		);
	});
	return container;
};

const titlesOf = (element: HTMLElement): string[] =>
	[...element.querySelectorAll("button")].map(({ title }) => title);

/** Text of the row's label column, the first cell PropertyRow draws. */
const rowLabelOf = (element: HTMLElement): string | null | undefined =>
	element.firstElementChild?.firstElementChild?.textContent;

afterEach(() => {
	act(() => root?.unmount());
	container?.remove();
	root = null;
	container = null;
});

describe("AutoLayoutItem", () => {
	it("labels the row after what it moves", () => {
		expect(rowLabelOf(render("en"))).toBe("Shapes and lines");
	});

	it("labels the row in Japanese", () => {
		expect(rowLabelOf(render("ja", jaCanvasMessages))).toBe("図形と線");
	});

	it("states the command's label in the tooltip, then that the shapes move too", () => {
		expect(titlesOf(render("en"))).toEqual([
			"Auto layout (top to bottom)\nRearranges the shapes and redraws the lines",
			"Auto layout (left to right)\nRearranges the shapes and redraws the lines",
		]);
	});

	it("reads the tooltip in Japanese", () => {
		expect(titlesOf(render("ja", jaCanvasMessages))).toEqual([
			"自動整列（上から下）\n図形を並べ直し、線も引き直します",
			"自動整列（左から右）\n図形を並べ直し、線も引き直します",
		]);
	});

	it("draws only the button of a direction left registered", () => {
		const element = render(
			"en",
			defaultCanvasMessages,
			createCanvasRegistries({ commands: ["layoutLeftToRight"] }),
		);

		expect(
			[...element.querySelectorAll("button")].map((button) =>
				button.getAttribute("data-action"),
			),
		).toEqual(["command:layoutLeftToRight"]);
	});

	it("draws no row when neither direction is registered", () => {
		const element = render(
			"en",
			defaultCanvasMessages,
			createCanvasRegistries({ commands: ["undo"] }),
		);

		expect(element.textContent).toBe("");
		expect(element.childElementCount).toBe(0);
	});
});
