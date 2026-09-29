import { builtinObjectDocDefinitions } from "./builtinObjectDocDefinitions";
import type { CanvasDocPlugin } from "./CanvasDocPlugin";
import type { ObjectDocDefinition } from "./ObjectDocDefinition";

export type DocDefinitionsConfig = {
	presetDefinitions?: Readonly<Partial<Record<string, ObjectDocDefinition>>>;
	/** A full `CanvasPlugin` is assignable, its `objects` values being UI definitions that extend {@link ObjectDocDefinition}. */
	plugins?: readonly CanvasDocPlugin[];
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
 * (declared order).
 */
export const resolveDocDefinitions = (
	config: DocDefinitionsConfig | undefined,
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
			`duplicate object type(s) in doc definitions config: ${duplicateMessages.join(", ")}`,
		);
	}

	return resolved;
};
