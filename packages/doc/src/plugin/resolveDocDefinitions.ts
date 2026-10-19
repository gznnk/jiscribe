import { builtinObjectDocDefinitions } from "./builtinObjectDocDefinitions";
import type { CanvasDocPlugin } from "./CanvasDocPlugin";
import type { ObjectDocDefinition } from "./ObjectDocDefinition";
import { isSingleBodyText } from "../model/objects/types/text/TextType";

export type DocDefinitionsConfig = {
	presetDefinitions?: Readonly<Partial<Record<string, ObjectDocDefinition>>>;
	/** A full `CanvasPlugin` is assignable, its `objects` values being UI definitions that extend {@link ObjectDocDefinition}. */
	plugins?: readonly CanvasDocPlugin[];
};

/**
 * Refuses a type declaring `features.textVerticalBasis` without a single body to
 * place: the basis says which box that one body's `verticalAlign` is measured
 * against, and a type holding named slots or no text at all has no such body —
 * the field would be accepted, written, and never read.
 */
const checkTextVerticalBasisFeature = (
	type: string,
	definition: ObjectDocDefinition,
): void => {
	if (
		definition.features.textVerticalBasis === true &&
		!isSingleBodyText(definition.features.text)
	) {
		throw new Error(
			`ObjectDocDefinition "${type}": textVerticalBasis needs a single body text (features.text)`,
		);
	}
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
 *
 * @param config - The preset / plugin sources to merge; omit for the built-in set as-is
 * @returns One definition per type, keyed by the `type` each was registered under
 * @throws When two sources claim one type, or when a definition's own declarations
 *   contradict each other ({@link checkTextVerticalBasisFeature})
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
		checkTextVerticalBasisFeature(type, definition);
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
