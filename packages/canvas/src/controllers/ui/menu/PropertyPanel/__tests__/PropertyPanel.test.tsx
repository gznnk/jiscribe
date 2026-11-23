// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { CanvasLocaleContext } from "../../../../../foundation/i18n/CanvasLocaleContext";
import { defaultCanvasMessages } from "../../../../../foundation/i18n/CanvasMessages";
import { CanvasMessagesContext } from "../../../../../foundation/i18n/CanvasMessagesContext";
import type { CanvasControllerState } from "../../../../CanvasTypes";
import { buildChainDoc } from "../../../../commands/arrange/layout/__tests__/support/layoutFixtures";
import { createInitialControllerState } from "../../../../reducer/createInitialControllerState";
import type { CanvasRegistries } from "../../../../registries/CanvasRegistries";
import { CanvasRegistriesContext } from "../../../../registries/CanvasRegistriesContext";
import { createCanvasRegistries } from "../../../../registries/createCanvasRegistries";
import { selectionOf } from "../../../../selection/__tests__/support/selectionOf";
import { PropertyPanel } from "../PropertyPanel";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement | null = null;
let root: ReturnType<typeof createRoot> | null = null;

const doNothing = () => {};

/** The panel's section ids, top to bottom, read off the collapse toggles of their headings. */
const renderSectionIds = (
	registries: CanvasRegistries,
	selectedIds: readonly string[],
): string[] => {
	const canvasState: CanvasControllerState = {
		...createInitialControllerState(buildChainDoc(), registries),
		selection: selectionOf(selectedIds),
	};
	container = document.createElement("div");
	document.body.appendChild(container);
	root = createRoot(container);
	const mounted = root;
	act(() => {
		mounted.render(
			<CanvasRegistriesContext.Provider value={registries}>
				<CanvasLocaleContext.Provider value="en">
					<CanvasMessagesContext.Provider value={defaultCanvasMessages}>
						<PropertyPanel
							canvasState={canvasState}
							onStyleIntent={doNothing}
							onTransformUpdate={doNothing}
							onDocumentUpdate={doNothing}
							onMetaUpdate={doNothing}
						/>
					</CanvasMessagesContext.Provider>
				</CanvasLocaleContext.Provider>
			</CanvasRegistriesContext.Provider>,
		);
	});
	return [...container.querySelectorAll('[data-action^="toggle:"]')].map(
		(header) =>
			(header.getAttribute("data-action") ?? "").slice("toggle:".length),
	);
};

/** A canvas registering none of the commands the Tidy up section offers. */
const withoutTidyUpCommands = () =>
	createCanvasRegistries({ commands: ["undo", "redo", "bringToFront"] });

afterEach(() => {
	act(() => root?.unmount());
	container?.remove();
	root = null;
	container = null;
});

describe("PropertyPanel Tidy up section", () => {
	it("follows the Canvas section with nothing selected", () => {
		expect(renderSectionIds(createCanvasRegistries(), [])).toEqual([
			"canvas",
			"tidy-up",
		]);
	});

	it("follows the Arrange section, before Meta, for a selection", () => {
		const sectionIds = renderSectionIds(createCanvasRegistries(), ["rect-1"]);

		expect(sectionIds.slice(-3)).toEqual(["arrange", "tidy-up", "meta"]);
	});

	it("is left out with nothing selected when none of its commands is registered", () => {
		expect(renderSectionIds(withoutTidyUpCommands(), [])).toEqual(["canvas"]);
	});

	it("is left out for a selection when none of its commands is registered", () => {
		const sectionIds = renderSectionIds(withoutTidyUpCommands(), ["rect-1"]);

		expect(sectionIds).toContain("arrange");
		expect(sectionIds).not.toContain("tidy-up");
	});
});
