import { describe, it, expect } from "vitest";

import { defaultCanvasMessages } from "../../../../../messages/CanvasMessages";
import { jaCanvasMessages } from "../../../../../messages/jaCanvasMessages";
import type { LocaleMessages } from "../../../../../messages/resolveLocaleMessages";
import { resolvePropertyPanelSectionLabel } from "../resolvePropertyPanelSectionLabel";

describe("resolvePropertyPanelSectionLabel", () => {
	it("resolves each core section id through the English message set", () => {
		expect(
			resolvePropertyPanelSectionLabel(
				"layout",
				"unused",
				defaultCanvasMessages,
				"en",
			),
		).toBe(defaultCanvasMessages.propertyPanelSectionLayout);
		expect(
			resolvePropertyPanelSectionLabel(
				"arrange",
				"unused",
				defaultCanvasMessages,
				"en",
			),
		).toBe(defaultCanvasMessages.propertyPanelSectionArrange);
	});

	it("resolves the connector's label section, which core declares by hand", () => {
		expect(
			resolvePropertyPanelSectionLabel(
				"label",
				"Label",
				defaultCanvasMessages,
				"en",
			),
		).toBe(defaultCanvasMessages.propertyPanelSectionLabel);
		expect(
			resolvePropertyPanelSectionLabel(
				"label",
				"Label",
				jaCanvasMessages,
				"ja",
			),
		).toBe(jaCanvasMessages.propertyPanelSectionLabel);
	});

	it("resolves the connector's label-border section the same way", () => {
		expect(
			resolvePropertyPanelSectionLabel(
				"label-border",
				"Label border",
				defaultCanvasMessages,
				"en",
			),
		).toBe(defaultCanvasMessages.propertyPanelSectionLabelBorder);
		expect(
			resolvePropertyPanelSectionLabel(
				"label-border",
				"Label border",
				jaCanvasMessages,
				"ja",
			),
		).toBe(jaCanvasMessages.propertyPanelSectionLabelBorder);
	});

	it("a Japanese message set changes a core id's heading", () => {
		expect(
			resolvePropertyPanelSectionLabel(
				"fill",
				"unused",
				jaCanvasMessages,
				"ja",
			),
		).toBe(jaCanvasMessages.propertyPanelSectionFill);
	});

	it("an unknown id with a string label passes the label through, ignoring messages", () => {
		expect(
			resolvePropertyPanelSectionLabel(
				"plugin-section",
				"Custom heading",
				defaultCanvasMessages,
				"en",
			),
		).toBe("Custom heading");
	});

	it("an unknown id with a dictionary label resolves it for the locale", () => {
		const label: LocaleMessages<string> = { en: "Custom", ja: "カスタム" };
		expect(
			resolvePropertyPanelSectionLabel(
				"plugin-section",
				label,
				defaultCanvasMessages,
				"ja-JP",
			),
		).toBe("カスタム");
	});

	it("falls back to en when the locale and its language subtag are both absent", () => {
		const label: LocaleMessages<string> = { en: "Custom" };
		expect(
			resolvePropertyPanelSectionLabel(
				"plugin-section",
				label,
				defaultCanvasMessages,
				"fr-FR",
			),
		).toBe("Custom");
	});
});
