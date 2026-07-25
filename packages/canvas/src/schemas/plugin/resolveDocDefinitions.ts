import type { ObjectDocDefinition } from "./ObjectDocDefinition";
import { builtinObjectDocDefinitions } from "../registry/builtinObjectDocDefinitions";

/**
 * The slice of `CanvasPlugin` the doc layer reads: just the headless doc
 * contributions. Structural (not imported from `controllers/registries`) so the
 * schema layer doesn't depend on the controllers layer's `CanvasPlugin` type; a
 * full `CanvasPlugin` (or `CanvasDocPlugin`) is assignable because its `objects`
 * values are the UI definitions that extend {@link ObjectDocDefinition}
 * (docs/05_extensibility/plugin-architecture-requirements.md §3).
 */
export type CanvasDocPluginLike = {
	id: string;
	objects?: Readonly<Partial<Record<string, ObjectDocDefinition>>>;
};

export type DocDefinitionsConfig = {
	presetDefinitions?: Readonly<Partial<Record<string, ObjectDocDefinition>>>;
	plugins?: readonly CanvasDocPluginLike[];
};

/**
 * Merges `presetDefinitions` and `plugins` into one type → definition map, shared
 * by `createCanvasParser` (parse-time validation) and `createDocOps` (programmatic
 * building).
 *
 * `presetDefinitions` defaults to {@link builtinObjectDocDefinitions} (every built-in
 * type). To swap out a built-in type for a plugin's own definition, pass a
 * `presetDefinitions` with that type filtered out and add the replacement via a
 * `plugins` entry; a `type` present in both `presetDefinitions` and a plugin (or
 * shared between two plugins) is rejected rather than silently last-wins, so an
 * accidental duplicate fails loudly. Merge order is `presetDefinitions` → `plugins`
 * (declared order); `context` prefixes the duplicate-type error with the caller name.
 */
export const resolveDocDefinitions = (
	config: DocDefinitionsConfig | undefined,
	context: string,
): Map<string, ObjectDocDefinition> => {
	const presetDefinitions =
		config?.presetDefinitions ?? builtinObjectDocDefinitions;
	const plugins = config?.plugins ?? [];

	const sourcedDefinitions = [
		...Object.entries(presetDefinitions).flatMap(([type, definition]) =>
			definition ? [{ type, definition, origin: "presetDefinitions" }] : [],
		),
		...plugins.flatMap((plugin) =>
			Object.entries(plugin.objects ?? {}).flatMap(([type, definition]) =>
				definition
					? [{ type, definition, origin: `plugin "${plugin.id}"` }]
					: [],
			),
		),
	];

	const resolved = new Map<string, ObjectDocDefinition>();
	const originByType = new Map<string, string>();
	const duplicateMessages: string[] = [];
	sourcedDefinitions.forEach(({ type, definition, origin }) => {
		const firstOrigin = originByType.get(type);
		if (firstOrigin !== undefined) {
			duplicateMessages.push(
				`"${type}" (${origin} conflicts with ${firstOrigin})`,
			);
		} else {
			originByType.set(type, origin);
			resolved.set(type, definition);
		}
	});
	if (duplicateMessages.length > 0) {
		throw new Error(
			`${context}: duplicate object type(s) registered: ${duplicateMessages.join(", ")}`,
		);
	}

	return resolved;
};
