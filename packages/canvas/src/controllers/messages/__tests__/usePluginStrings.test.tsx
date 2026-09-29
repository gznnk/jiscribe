// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { CanvasLocaleContext } from "../CanvasLocaleContext";
import { resolveCanvasMessages } from "../CanvasMessages";
import { CanvasMessagesContext } from "../CanvasMessagesContext";
import type { PluginMessages } from "../PluginMessagesTypes";
import type { LocaleMessages } from "../resolveLocaleMessages";
import { resolvePluginMessages } from "../resolvePluginMessages";
import { usePluginStrings } from "../usePluginStrings";

// Without this React treats every `act` below as unsupported and warns, the
// flushes being correct all the same.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

type GridStrings = { menuGrid: string; gridNone: string };

const gridMessagesByLocale: LocaleMessages<PluginMessages<GridStrings>> = {
	en: { strings: { menuGrid: "Grid", gridNone: "No grid" } },
	ja: { strings: { menuGrid: "グリッド", gridNone: "グリッドなし" } },
};

const GridLabel = () => {
	const strings = usePluginStrings("grid", gridMessagesByLocale);
	return (
		<span data-testid="label">{`${strings.menuGrid}/${strings.gridNone}`}</span>
	);
};

const container = document.createElement("div");
document.body.append(container);
const root = createRoot(container);

afterEach(() => {
	act(() => {
		root.render(null);
	});
});

/** Mounts the label under one locale and one set of merged messages. */
const renderLabel = (
	locale: string,
	hostOverrides?: Parameters<typeof resolveCanvasMessages>[1],
): string => {
	const messages = resolveCanvasMessages(
		locale,
		hostOverrides,
		resolvePluginMessages([{ id: "grid", messages: gridMessagesByLocale }]),
	);
	act(() => {
		root.render(
			<CanvasLocaleContext.Provider value={locale}>
				<CanvasMessagesContext.Provider value={messages}>
					<GridLabel />
				</CanvasMessagesContext.Provider>
			</CanvasLocaleContext.Provider>,
		);
	});
	return container.querySelector('[data-testid="label"]')?.textContent ?? "";
};

describe("usePluginStrings", () => {
	it("reads the canvas's locale", () => {
		expect(renderLabel("ja")).toBe("グリッド/グリッドなし");
	});

	it("lets the host overrule one string and leaves the rest of the locale standing", () => {
		expect(
			renderLabel("ja", { pluginStrings: { "grid.menuGrid": "格子" } }),
		).toBe("格子/グリッドなし");
	});

	it("falls back to the plugin's own dictionary outside a provider", () => {
		act(() => {
			root.render(<GridLabel />);
		});
		expect(container.querySelector('[data-testid="label"]')?.textContent).toBe(
			"Grid/No grid",
		);
	});
});
