// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { createCanvasRegistries } from "../../../../registries/createCanvasRegistries";
import type { Stencil } from "../../../objects/Stencil";
import { BottomToolbar } from "../BottomToolbar";

const { stencil } = createCanvasRegistries();

const presetsOf = (presetIds: string[]): Stencil[] =>
	presetIds.map((presetId) => {
		const preset = stencil.get(presetId);
		if (!preset) {
			throw new Error(`no preset ${presetId}`);
		}
		return preset;
	});

let unmount: (() => void) | null = null;

afterEach(() => {
	unmount?.();
	unmount = null;
});

const renderBar = (
	presets: Stencil[],
	activePresetId: string | null = null,
): HTMLElement => {
	const container = document.createElement("div");
	const root = createRoot(container);
	act(() =>
		root.render(
			<BottomToolbar presets={presets} activePresetId={activePresetId} />,
		),
	);
	unmount = () => act(() => root.unmount());
	return container;
};

describe("BottomToolbar", () => {
	/** The press on the bar's empty area routes through this element. */
	it("is the bottom-toolbar menu target", () => {
		const container = renderBar(presetsOf(["rect"]));
		const bar = container.firstElementChild as HTMLElement;
		expect(bar.dataset.kind).toBe("menu");
		expect(bar.dataset.id).toBe("bottom-toolbar");
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
	 * A placeholder for now: no data-action means no command and no stencil
	 * gesture, and no data-kind of its own means a press lands on the bar's
	 * empty area (ToolbarHandler), which only dismisses the open menus.
	 */
	it("draws Other shapes as a button wired to nothing", () => {
		const container = renderBar(presetsOf(["rect"]));
		const otherShapes = container.querySelector<HTMLButtonElement>(
			'[data-testid="bottom-toolbar-other-shapes"]',
		);
		expect(otherShapes).not.toBeNull();
		expect(otherShapes!.title).toBe("Other shapes");
		expect(otherShapes!.getAttribute("aria-label")).toBe("Other shapes");
		expect(otherShapes!.type).toBe("button");
		expect(otherShapes!.closest("[data-action]")).toBeNull();
		expect(otherShapes!.closest("[data-kind]")?.getAttribute("data-id")).toBe(
			"bottom-toolbar",
		);
	});
});
