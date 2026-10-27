import { describe, expect, it } from "vitest";

import {
	isPropertyPanelShown,
	isStencilLibraryPanelShown,
	resolveSidebarsState,
	seedChromeSidebars,
} from "../sidebarsState";

/**
 * The pair carries the form/edge/panel split in one direction and fills the
 * host's gaps in the other, so what a canvas reports is exactly what restores it.
 */
describe("sidebarsState", () => {
	it("maps the form to isExpanded, the stencil library to the left edge and the property panel to the right", () => {
		const sidebars = resolveSidebarsState({
			isChromeExpanded: true,
			stencilLibraryPanel: { isOpen: true, collapsedSectionIds: ["basic"] },
			propertyPanel: { isOpen: false, collapsedSectionIds: ["text", "border"] },
		});

		expect(sidebars).toEqual({
			isExpanded: true,
			left: { isOpen: true },
			right: { isOpen: false },
			panels: {
				stencilLibrary: { collapsedSectionIds: ["basic"] },
				properties: { collapsedSectionIds: ["text", "border"] },
			},
		});
	});

	it("seeds the chrome back from what it reported", () => {
		const chromeSidebars = {
			isChromeExpanded: true,
			stencilLibraryPanel: { isOpen: false, collapsedSectionIds: ["basic"] },
			propertyPanel: { isOpen: true, collapsedSectionIds: ["text"] },
		};

		expect(seedChromeSidebars(resolveSidebarsState(chromeSidebars))).toEqual(
			chromeSidebars,
		);
	});

	it("starts collapsed with both panels closed when nothing is restored", () => {
		expect(seedChromeSidebars(undefined)).toEqual({
			isChromeExpanded: false,
			stencilLibraryPanel: { isOpen: false, collapsedSectionIds: [] },
			propertyPanel: { isOpen: false, collapsedSectionIds: [] },
		});
	});

	/** A state saved before the form was reported restores collapsed, its panels kept for the next expand. */
	it("defaults the keys a partial restore leaves out, the form to collapsed", () => {
		expect(
			seedChromeSidebars({
				right: { isOpen: true },
				panels: { stencilLibrary: { collapsedSectionIds: ["basic"] } },
			}),
		).toEqual({
			isChromeExpanded: false,
			stencilLibraryPanel: { isOpen: false, collapsedSectionIds: ["basic"] },
			propertyPanel: { isOpen: true, collapsedSectionIds: [] },
		});
	});
});

describe("isStencilLibraryPanelShown / isPropertyPanelShown", () => {
	const chrome = (isChromeExpanded: boolean, isOpen: boolean) => ({
		isChromeExpanded,
		stencilLibraryPanel: { isOpen, collapsedSectionIds: [] },
		propertyPanel: { isOpen, collapsedSectionIds: [] },
	});

	it.each([
		[false, false, false],
		[false, true, false],
		[true, false, false],
		[true, true, true],
	])(
		"expanded %s, open %s → shown %s",
		(isChromeExpanded, isOpen, expected) => {
			expect(isStencilLibraryPanelShown(chrome(isChromeExpanded, isOpen))).toBe(
				expected,
			);
			expect(isPropertyPanelShown(chrome(isChromeExpanded, isOpen))).toBe(
				expected,
			);
		},
	);
});
