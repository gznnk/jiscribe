import type { ObjectType } from "@jiscribe/doc/model/objects/types/ObjectType";
import type { ObjectShapeStyleDefaultsRegistry } from "@jiscribe/doc/registries/ObjectShapeStyleDefaultsRegistry";
import type { ObjectTextStyleDefaultsRegistry } from "@jiscribe/doc/registries/ObjectTextStyleDefaultsRegistry";

import type { StyleTable } from "./StyleEntry";
import type { ObjectState } from "../../states/objects/base/ObjectState";

/**
 * Per-type style tables: which intents a type takes, and where each of them
 * lands in its data. Filled from every type's definition at bundle creation
 * (applyObjectDefinition registers `coreStyleTable(definition.features)`), and
 * read by the two walkers — applyStyleIntent and readStyleIntent — so writing
 * and reporting a style consult the very same answer.
 *
 * A type absent from the registry, or one whose table leaves the kind out, takes
 * nothing for that intent: the walkers skip it rather than guessing a field
 * (fail-closed, as StylePropertyRegistry is).
 */
export class ObjectStyleRegistry {
	private readonly tablesByType = new Map<
		ObjectType,
		StyleTable<ObjectState>
	>();

	/**
	 * @param type - The object type the table belongs to; registering twice replaces
	 * @param table - What that type answers for, by intent kind
	 */
	register(type: ObjectType, table: StyleTable<ObjectState>): void {
		this.tablesByType.set(type, table);
	}

	/**
	 * The table of one type, or undefined when it has none registered.
	 *
	 * @param type - The object type to look up
	 */
	get(type: ObjectType): StyleTable<ObjectState> | undefined {
		return this.tablesByType.get(type);
	}

	clear(): void {
		this.tablesByType.clear();
	}
}

export const createObjectStyleRegistry = (): ObjectStyleRegistry =>
	new ObjectStyleRegistry();

/**
 * The registries a style walk reads: the tables, plus the defaults an entry's
 * `read` resolves through. Declared as its own shape so the walkers take a slice
 * rather than the whole canvas bundle, which stays structurally assignable to it
 * (ICanvasRegistries).
 */
export type StyleIntentRegistries = {
	objectStyle: ObjectStyleRegistry;
	objectShapeStyleDefaults: ObjectShapeStyleDefaultsRegistry;
	objectTextStyleDefaults: ObjectTextStyleDefaultsRegistry;
};
