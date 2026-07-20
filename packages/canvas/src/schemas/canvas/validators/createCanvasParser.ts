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
 * The slice of `CanvasPlugin` this module reads. Structural (not imported from
 * `controllers/setup`) so the schema layer doesn't depend on the controllers
 * layer's `CanvasPlugin` type (docs/05_extensibility/canvas-plugin-design.md §5).
 */
type ParserPlugin = {
	id: string;
	parser?: readonly ObjectParserExtension[];
};

/**
 * Builds a {@link CanvasParser} instance backed by its own doc-validator registry, so
 * multiple parsers (e.g. the default one and a plugin-aware one) can coexist without
 * mutating shared global state.
 *
 * `presetExtensions` defaults to {@link defaultObjectParserExtensions} (every built-in
 * type). To swap out a built-in type for a plugin's own extension, filter it out of
 * `presetExtensions` and add the replacement via `extensions`; a `type` present in
 * `presetExtensions`, `extensions`, or any `plugins` entry's `parser` (or repeated
 * within any of them) is rejected at construction time rather than silently
 * last-wins, so an accidental duplicate registration fails loudly instead of
 * quietly picking one. Merge order is `presetExtensions` → `extensions` →
 * `plugins` (declared order).
 */
export const createCanvasParser = (config?: {
	presetExtensions?: readonly ObjectParserExtension[];
	extensions?: readonly ObjectParserExtension[];
	plugins?: readonly ParserPlugin[];
}): CanvasParser => {
	const presetExtensions =
		config?.presetExtensions ?? defaultObjectParserExtensions;
	const extensions = config?.extensions ?? [];
	const plugins = config?.plugins ?? [];

	type SourcedExtension = { extension: ObjectParserExtension; origin: string };
	const sourcedExtensions: SourcedExtension[] = [
		...presetExtensions.map((extension) => ({
			extension,
			origin: "presetExtensions",
		})),
		...extensions.map((extension) => ({ extension, origin: "extensions" })),
		...plugins.flatMap((plugin) =>
			(plugin.parser ?? []).map((extension) => ({
				extension,
				origin: `plugin "${plugin.id}"`,
			})),
		),
	];

	const originByType = new Map<string, string>();
	const duplicateMessages: string[] = [];
	sourcedExtensions.forEach(({ extension, origin }) => {
		const firstOrigin = originByType.get(extension.type);
		if (firstOrigin !== undefined) {
			duplicateMessages.push(
				`"${extension.type}" (${origin} conflicts with ${firstOrigin})`,
			);
		} else {
			originByType.set(extension.type, origin);
		}
	});
	if (duplicateMessages.length > 0) {
		throw new Error(
			`createCanvasParser: duplicate object type(s) registered: ${duplicateMessages.join(", ")}`,
		);
	}

	const registry = createObjectDocValidatorRegistry();
	sourcedExtensions.forEach(({ extension }) => {
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
