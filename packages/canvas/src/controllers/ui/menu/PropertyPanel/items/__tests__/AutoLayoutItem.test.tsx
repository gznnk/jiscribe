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
import { CanvasRegistriesContext } from "../../../../../registries/CanvasRegistriesContext";
import { AutoLayoutItem } from "../AutoLayoutItem";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement | null = null;
let root: ReturnType<typeof createRoot> | null = null;

const renderTitles = (
	locale: string,
	messages = defaultCanvasMessages,
): string[] => {
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
			<CanvasRegistriesContext.Provider value={layoutRegistries}>
				<CanvasLocaleContext.Provider value={locale}>
					<CanvasMessagesContext.Provider value={messages}>
						<AutoLayoutItem canvasState={canvasState} />
					</CanvasMessagesContext.Provider>
				</CanvasLocaleContext.Provider>
			</CanvasRegistriesContext.Provider>,
		);
	});
	return [...container.querySelectorAll("button")].map(({ title }) => title);
};

afterEach(() => {
	act(() => root?.unmount());
	container?.remove();
	root = null;
	container = null;
});

describe("AutoLayoutItem tooltip", () => {
	it("states the command's label, then that the shapes move too", () => {
		expect(renderTitles("en")).toEqual([
			"Auto layout (top to bottom)\nRearranges the shapes and redraws the lines",
			"Auto layout (left to right)\nRearranges the shapes and redraws the lines",
		]);
	});

	it("reads in Japanese", () => {
		expect(renderTitles("ja", jaCanvasMessages)).toEqual([
			"自動整列（上から下）\n図形を並べ直し、線も引き直します",
			"自動整列（左から右）\n図形を並べ直し、線も引き直します",
		]);
	});
});
