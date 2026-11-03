import { describe, expect, it } from "vitest";

import { standardDocPlugins } from "../doc";
import { standardPlugins, standardStencilLibrarySections } from "../index";

/** Every object type a set of plugins registers, sorted. */
const listObjectTypes = (
	plugins: readonly { objects?: Readonly<Record<string, unknown>> }[],
): string[] =>
	plugins.flatMap((plugin) => Object.keys(plugin.objects ?? {})).sort();

/**
 * A host gives standardPlugins to the canvas and standardDocPlugins to its
 * parser, and neither side complains when the two disagree: a type missing
 * from one is drawn but never validated, or validated but never drawn.
 */
describe("the standard set", () => {
	it("registers the same object types on the canvas and on the parser", () => {
		expect(listObjectTypes(standardPlugins)).toEqual(
			listObjectTypes(standardDocPlugins),
		);
		expect(listObjectTypes(standardPlugins)).toEqual(
			expect.arrayContaining(["awsIcon", "awsGroup", "azureIcon", "gcpIcon"]),
		);
	});

	// A registered shape with no section is drawable by no one: the stencil bar
	// pins only six presets and the library is where the rest lives.
	it("files the icon sets in the shape library", () => {
		expect(standardStencilLibrarySections.map(({ id }) => id)).toEqual(
			expect.arrayContaining(["aws", "aws-group", "azure", "gcp"]),
		);
	});
});
