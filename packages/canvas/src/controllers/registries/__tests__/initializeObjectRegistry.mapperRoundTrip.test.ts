import type { ObjectDoc } from "@jiscribe/doc/model/objects/base/ObjectDoc";
import { describe, expect, it } from "vitest";

import { ALL_OBJECT_DEFINITIONS } from "../initializeObjectRegistry";

/**
 * Doc→State→Doc round trip for every registered object type.
 *
 * The mapper factories assemble their result from a runtime allow-list, so the
 * Doc↔State boundary is the one place where the type system cannot check that
 * every declared field survives (`FrameMapper` / see `PolyMapper`). Driving this
 * off the definition table instead of a hand-written list means a type added
 * there is covered without touching this file.
 *
 * The starting Doc comes from each type's own factory, so it carries that type's
 * DOC_DEFAULTS — every field the type declares by default. A field dropped from
 * an allow-list, or one whose two directions disagree, fails here.
 */
const definitions = Object.entries(ALL_OBJECT_DEFINITIONS);

/** Types created only programmatically, so there is no factory to build a starting Doc from. */
const TYPES_WITHOUT_FACTORY = ["group", "connector", "svg"];

const withFactory = definitions.flatMap(([type, definition]) => {
	const factory = definition.factory;
	return factory ? [{ type, definition, factory }] : [];
});

/**
 * An empty body text is the one default that legitimately does not come back:
 * the mapper normalizes it to an absent field, which expands to the same state
 * (see `mapTextStateToDoc`). Everything else must survive verbatim.
 */
const normalizeEmptyText = (doc: ObjectDoc): object => {
	const { text, ...withoutText } = doc as ObjectDoc & { text?: unknown };
	return text === "" ? withoutText : doc;
};

describe("registered object types: Doc→State→Doc round trip", () => {
	it("covers every type that has a factory, and nothing else is silently skipped", () => {
		const skipped = definitions
			.filter(([, definition]) => !definition.factory)
			.map(([type]) => type);

		expect(skipped.sort()).toEqual([...TYPES_WITHOUT_FACTORY].sort());
		expect(withFactory.length).toBe(
			definitions.length - TYPES_WITHOUT_FACTORY.length,
		);
	});

	describe.each(withFactory)("$type", ({ definition, factory }) => {
		it("preserves the type's DOC_DEFAULTS across the round trip", () => {
			const doc = factory.createDoc({ x: 120, y: 80 });

			const roundTripped = definition.mapper.toDoc(
				definition.mapper.toState(doc),
			);

			expect(roundTripped).toEqual(normalizeEmptyText(doc));
		});

		it("preserves rotation and flip across the round trip", () => {
			if (!definition.features.transform) {
				// Poly shapes carry no transform; rotation on their Doc is not a declared field.
				return;
			}

			const doc = factory.createDoc(
				{ x: 120, y: 80 },
				{ rotation: 30, flipX: true },
			);

			const roundTripped = definition.mapper.toDoc(
				definition.mapper.toState(doc),
			);

			expect(roundTripped).toEqual(normalizeEmptyText(doc));
		});
	});
});
