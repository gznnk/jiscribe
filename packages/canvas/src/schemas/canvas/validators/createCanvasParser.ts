import type { CanvasParseResult } from "./parseWithRegistry";
import { parseWithRegistry } from "./parseWithRegistry";
import { defaultObjectParserExtensions } from "../../registry/defaultObjectParserExtensions";
import type { ObjectParserExtension } from "../../registry/ObjectDocValidatorRegistry";
import { createObjectDocValidatorRegistry } from "../../registry/ObjectDocValidatorRegistry";

export type { ObjectParserExtension } from "../../registry/ObjectDocValidatorRegistry";
export { defaultObjectParserExtensions } from "../../registry/defaultObjectParserExtensions";

export type CanvasParser = {
	parse(text: string): CanvasParseResult;
};

/**
 * Builds a {@link CanvasParser} instance backed by its own doc-validator registry, so
 * multiple parsers (e.g. the default one and a plugin-aware one) can coexist without
 * mutating shared global state.
 *
 * `presetExtensions` defaults to {@link defaultObjectParserExtensions} (every built-in
 * type). To swap out a built-in type for a plugin's own extension, filter it out of
 * `presetExtensions` and add the replacement via `extensions`; a `type` present in both
 * `presetExtensions` and `extensions` (or repeated within either) is rejected at
 * construction time rather than silently last-wins, so an accidental duplicate registration
 * fails loudly instead of quietly picking one.
 */
export const createCanvasParser = (config?: {
	presetExtensions?: readonly ObjectParserExtension[];
	extensions?: readonly ObjectParserExtension[];
}): CanvasParser => {
	const presetExtensions =
		config?.presetExtensions ?? defaultObjectParserExtensions;
	const extensions = config?.extensions ?? [];
	const allExtensions = [...presetExtensions, ...extensions];

	const seenTypes = new Set<string>();
	const duplicateTypes = new Set<string>();
	allExtensions.forEach((extension) => {
		if (seenTypes.has(extension.type)) {
			duplicateTypes.add(extension.type);
		}
		seenTypes.add(extension.type);
	});
	if (duplicateTypes.size > 0) {
		throw new Error(
			`createCanvasParser: duplicate object type(s) registered: ${[...duplicateTypes].join(", ")}`,
		);
	}

	const registry = createObjectDocValidatorRegistry();
	allExtensions.forEach((extension) => {
		registry.register(
			extension.type,
			extension.validateDoc,
			extension.features,
		);
	});

	return {
		parse: (text: string) => parseWithRegistry(text, registry),
	};
};
