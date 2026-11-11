// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { CanvasLocaleContext } from "../../../../../foundation/i18n/CanvasLocaleContext";
import { TOOLBAR_PILL_BOTTOM } from "../../../menu/floatingBarLayout";
import { BusyIndicator } from "../BusyIndicator";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const BUSY_LABEL = { en: "Working…", ja: "作業中…" };

const unmounts: (() => void)[] = [];

afterEach(() => {
	unmounts.splice(0).forEach((unmount) => unmount());
});

const render = (
	busyLabel: typeof BUSY_LABEL | null,
	isChromeExpanded: boolean,
	locale = "en",
): HTMLDivElement => {
	const container = document.createElement("div");
	const root = createRoot(container);
	act(() => {
		root.render(
			<CanvasLocaleContext.Provider value={locale}>
				<BusyIndicator
					busyLabel={busyLabel}
					isChromeExpanded={isChromeExpanded}
				/>
			</CanvasLocaleContext.Provider>,
		);
	});
	unmounts.push(() => act(() => root.unmount()));
	return container;
};

const statusOf = (container: HTMLElement): HTMLElement => {
	const status = container.querySelector<HTMLElement>('[role="status"]');
	if (status === null) {
		throw new Error("no status element");
	}
	return status;
};

describe("BusyIndicator", () => {
	it("renders nothing without a label", () => {
		expect(render(null, true).innerHTML).toBe("");
	});

	it("announces the label as a status, resolved for the canvas's locale", () => {
		expect(statusOf(render(BUSY_LABEL, true)).textContent).toBe("Working…");
		expect(statusOf(render(BUSY_LABEL, true, "ja")).textContent).toBe(
			"作業中…",
		);
	});

	it.each([
		["expanded, under the full-width toolbar", true, 8],
		["collapsed, below the toolbar's pills", false, TOOLBAR_PILL_BOTTOM + 8],
	])("sits a small gap down with the chrome %s", (_name, isExpanded, top) => {
		expect(statusOf(render(BUSY_LABEL, isExpanded)).style.top).toBe(`${top}px`);
	});
});
