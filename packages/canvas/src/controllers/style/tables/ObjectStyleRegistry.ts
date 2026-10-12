import type { ObjectType } from "@jiscribe/doc/model/objects/types/ObjectType";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { StyleTable } from "../StyleEntry";

const NO_DECLARED_KINDS: ReadonlySet<string> = new Set();

/**
 * Per-type style tables: which intents a type takes, and where each of them
 * lands in its data. Filled from every type's definition at bundle creation
 * (applyObjectDefinition hands over `coreStyleTable` and the type's own
 * `ObjectTypeDefinition.styleEntries`), and read by the two walkers —
 * applyStyleIntent and readSelectionStyle — so writing and reporting a style
 * consult the very same answer.
 *
 * A type absent from the registry, or one whose table leaves the kind out, takes
 * nothing for that intent: the walkers skip it rather than guessing a field
 * (fail-closed).
 *
 * Which kinds a type declared itself is kept beside the table: the ObjectMenu
 * and the properties sidebar keep a control under a text-slot pick only when the
 * type has answered for its kinds (filterTextSlotMenuSections,
 * filterTextSlotPropertyPanelSections).
 */
export class ObjectStyleRegistry {
	private readonly tablesByType = new Map<
		ObjectType,
		StyleTable<ObjectState>
	>();

	private readonly declaredKindsByType = new Map<
		ObjectType,
		ReadonlySet<string>
	>();

	/**
	 * @param type - The object type the table belongs to; registering twice replaces both the table and its declared kinds
	 * @param derivedTable - What the type's features imply (coreStyleTable)
	 * @param declaredTable - What the type declares itself; a kind it holds replaces the derived one of the same name, and an `undefined` entry declares nothing
	 */
	register(
		type: ObjectType,
		derivedTable: StyleTable<ObjectState>,
		declaredTable: StyleTable<ObjectState>,
	): void {
		this.tablesByType.set(type, { ...derivedTable, ...declaredTable });
		this.declaredKindsByType.set(
			type,
			new Set(
				Object.entries(declaredTable)
					.filter(([, entry]) => entry !== undefined)
					.map(([kind]) => kind),
			),
		);
	}

	/**
	 * The table of one type, or undefined when it has none registered.
	 *
	 * @param type - The object type to look up
	 */
	get(type: ObjectType): StyleTable<ObjectState> | undefined {
		return this.tablesByType.get(type);
	}

	/**
	 * The kinds one type declared in its own table, core and extra alike.
	 *
	 * @param type - The object type to look up
	 * @returns Empty for a type that declared nothing or is not registered
	 */
	declaredKinds(type: ObjectType): ReadonlySet<string> {
		return this.declaredKindsByType.get(type) ?? NO_DECLARED_KINDS;
	}

	clear(): void {
		this.tablesByType.clear();
		this.declaredKindsByType.clear();
	}
}

export const createObjectStyleRegistry = (): ObjectStyleRegistry =>
	new ObjectStyleRegistry();
