import { createObjectTextStyleDefaultsRegistry } from "@jiscribe/doc/plugin/ObjectTextStyleDefaultsRegistry";
import { DEFAULT_FONT_FAMILY } from "@jiscribe/doc/text/style/fontFamilies";
import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { TextSlots } from "../../../states/objects/types/TextSlots";
import type { DocFontRequest } from "../collectDocFontRequests";
import { collectDocFontRequests } from "../collectDocFontRequests";

const textStyleDefaults = createObjectTextStyleDefaultsRegistry();

const shape = (id: string, text: TextSlots, type = "rect"): ObjectState =>
	({ id, type, text }) as unknown as ObjectState;

const connector = (
	id: string,
	label: Record<string, unknown> | undefined,
): ObjectState =>
	({
		id,
		type: "connector",
		source: { x: 0, y: 0 },
		target: { x: 1, y: 1 },
		label,
	}) as unknown as ObjectState;

/** The request's characters as a set, since the collector fixes no order. */
const charactersOf = (request: DocFontRequest): string[] =>
	[...request.text].sort();

describe("collectDocFontRequests", () => {
	it("yields nothing for a document with no objects", () => {
		expect(collectDocFontRequests({}, textStyleDefaults)).toEqual([]);
	});

	it("merges objects that resolve to the same face into one request", () => {
		const objects = {
			a: shape("a", { body: { text: "Hi" } }),
			b: shape("b", { body: { text: "there" } }),
		};

		const requests = collectDocFontRequests(objects, textStyleDefaults);

		expect(requests).toHaveLength(1);
		expect(requests[0]).toMatchObject({
			fontStyle: "normal",
			fontWeight: "normal",
			fontFamily: DEFAULT_FONT_FAMILY,
		});
		expect(charactersOf(requests[0])).toEqual([..."Hitehr"].sort());
	});

	it("splits a run that overrides the face off into its own request", () => {
		const objects = {
			a: shape("a", {
				body: {
					text: [{ text: "plain" }, { text: "bold", fontWeight: "bold" }],
				},
			}),
		};

		const requests = collectDocFontRequests(objects, textStyleDefaults);

		expect(requests.map((request) => request.fontWeight)).toEqual([
			"normal",
			"bold",
		]);
		expect(charactersOf(requests[0])).toEqual([..."plain"].sort());
		expect(charactersOf(requests[1])).toEqual([..."bold"].sort());
	});

	it("takes each row of a row-partitioned slot", () => {
		const objects = {
			a: shape("a", { rows: { text: ["one", "two"] } }, "record"),
		};

		const requests = collectDocFontRequests(objects, textStyleDefaults);

		expect(requests).toHaveLength(1);
		expect(charactersOf(requests[0])).toEqual([..."onetw"].sort());
	});

	it("resolves a slot through the type's own defaults", () => {
		const registry = createObjectTextStyleDefaultsRegistry();
		registry.register("sticky", { body: { fontWeight: "bold" } });
		const objects = { a: shape("a", { body: { text: "note" } }, "sticky") };

		const requests = collectDocFontRequests(objects, registry);

		expect(requests[0].fontWeight).toBe("bold");
	});

	it("puts a connector label on the label's own defaults", () => {
		const objects = { a: connector("a", { text: "edge" }) };

		const requests = collectDocFontRequests(objects, textStyleDefaults);

		expect(requests).toEqual([
			{
				fontStyle: "normal",
				fontWeight: "normal",
				fontFamily: DEFAULT_FONT_FAMILY,
				text: "edg",
			},
		]);
	});

	it("skips texts that draw nothing, so an empty document asks for no face", () => {
		const objects = {
			a: shape("a", { body: { text: "  \n " } }),
			b: connector("b", { text: "" }),
			c: connector("c", undefined),
		};

		expect(collectDocFontRequests(objects, textStyleDefaults)).toEqual([]);
	});
});
