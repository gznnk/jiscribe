import type { SelectionControlDefinition } from "./SelectionControlTypes";
import type { ObjectType } from "../../../schemas/objects/types/ObjectType";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import {
	createRegisteredSelectionControl,
	type RegisteredSelectionControl,
} from "../../gestures/registry/RegisteredSelectionControl";

/**
 * Per-type registry of selection controls (see SelectionControlTypes).
 * Types without registered controls simply render no extra handles.
 */
export class SelectionControlRegistry {
	private readonly entries = new Map<
		ObjectType,
		RegisteredSelectionControl[]
	>();

	register<TState extends ObjectState>(
		type: ObjectType,
		controls: SelectionControlDefinition<TState>[],
	): void {
		const registered: RegisteredSelectionControl[] = [];
		const parts = new Set<string>();
		for (const control of controls) {
			const entry = createRegisteredSelectionControl(
				type,
				control as unknown as SelectionControlDefinition,
			);
			if (parts.has(entry.part)) {
				throw new Error(`Duplicate selection control part "${entry.part}"`);
			}
			parts.add(entry.part);
			registered.push(entry);
		}
		this.entries.set(type, registered);
	}

	get(type: ObjectType): readonly RegisteredSelectionControl[] | undefined {
		return this.entries.get(type);
	}

	clear(): void {
		this.entries.clear();
	}
}

export const createSelectionControlRegistry = (): SelectionControlRegistry =>
	new SelectionControlRegistry();
