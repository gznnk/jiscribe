import type { CanvasParseResult } from "./parseWithRegistry";
import { parseWithRegistry } from "./parseWithRegistry";
import type { ObjectFeatures } from "../../objects/types/ObjectFeatures";
import type { ObjectDocDefinition } from "../../plugin/ObjectDocDefinition";
import { builtinObjectDocDefinitions } from "../../registry/builtinObjectDocDefinitions";
import type { ObjectDocValidateFn } from "../../registry/ObjectDocValidatorRegistry";
import { createObjectDocValidatorRegistry } from "../../registry/ObjectDocValidatorRegistry";

export type CanvasParser = {
	parse(text: string): CanvasParseResult;
};

/**
 * The slice of `CanvasPlugin` this module reads: just the headless doc
 * contributions. Structural (not imported from `controllers/registries`) so the
 * schema layer doesn't depend on the controllers layer's `CanvasPlugin` type; a
 * full `CanvasPlugin` (or `CanvasDocPlugin`) is assignable to it because its
 * `objects` values extend {@link ObjectDocDefinition}
 * (docs/05_extensibility/plugin-architecture-requirements.md §3).
 */
type CanvasDocPluginLike = {
	id: string;
	objects?: Readonly<
		Partial<
			Record<
				string,
				{ features: ObjectFeatures; validateDoc: ObjectDocValidateFn }
			>
		>
	>;
};

/**
 * Builds a {@link CanvasParser} instance backed by its own doc-validator registry, so
 * multiple parsers (e.g. the default one and a plugin-aware one) can coexist without
 * mutating shared global state.
 *
 * `presetDefinitions` defaults to {@link builtinObjectDocDefinitions} (every built-in
 * type). To swap out a built-in type for a plugin's own definition, pass a
 * `presetDefinitions` with that type filtered out and add the replacement via a
 * `plugins` entry; a `type` present in both `presetDefinitions` and a plugin (or
 * shared between two plugins) is rejected at construction time rather than silently
 * last-wins, so an accidental duplicate registration fails loudly instead of quietly
 * picking one. Merge order is `presetDefinitions` → `plugins` (declared order).
 */
export const createCanvasParser = (config?: {
	presetDefinitions?: Readonly<Partial<Record<string, ObjectDocDefinition>>>;
	plugins?: readonly CanvasDocPluginLike[];
}): CanvasParser => {
	const presetDefinitions =
		config?.presetDefinitions ?? builtinObjectDocDefinitions;
	const plugins = config?.plugins ?? [];

	type SourcedDefinition = {
		type: string;
		features: ObjectFeatures;
		validateDoc: ObjectDocValidateFn;
		origin: string;
	};
	const sourcedDefinitions: SourcedDefinition[] = [
		...Object.entries(presetDefinitions).flatMap(([type, definition]) =>
			definition
				? [
						{
							type,
							features: definition.features,
							validateDoc: definition.validateDoc,
							origin: "presetDefinitions",
						},
					]
				: [],
		),
		...plugins.flatMap((plugin) =>
			Object.entries(plugin.objects ?? {}).flatMap(([type, definition]) =>
				definition
					? [
							{
								type,
								features: definition.features,
								validateDoc: definition.validateDoc,
								origin: `plugin "${plugin.id}"`,
							},
						]
					: [],
			),
		),
	];

	const originByType = new Map<string, string>();
	const duplicateMessages: string[] = [];
	sourcedDefinitions.forEach(({ type, origin }) => {
		const firstOrigin = originByType.get(type);
		if (firstOrigin !== undefined) {
			duplicateMessages.push(
				`"${type}" (${origin} conflicts with ${firstOrigin})`,
			);
		} else {
			originByType.set(type, origin);
		}
	});
	if (duplicateMessages.length > 0) {
		throw new Error(
			`createCanvasParser: duplicate object type(s) registered: ${duplicateMessages.join(", ")}`,
		);
	}

	const registry = createObjectDocValidatorRegistry();
	sourcedDefinitions.forEach(({ type, features, validateDoc }) => {
		registry.register(type, validateDoc, features);
	});

	return {
		parse: (text: string) => parseWithRegistry(text, registry),
	};
};
