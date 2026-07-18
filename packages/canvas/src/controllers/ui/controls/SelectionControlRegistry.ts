import type { SelectionControlDefinition } from "./SelectionControlTypes";
import type { ObjectType } from "../../../schemas/objects/types/ObjectType";
import type { ObjectState } from "../../../states/objects/base/ObjectState";

/**
 * Per-type registry of selection controls (see SelectionControlTypes).
 * Types without registered controls simply render no extra handles.
 */
export class SelectionControlRegistry {
	private readonly entries = new Map<
		ObjectType,
		SelectionControlDefinition[]
	>();

	register<TState extends ObjectState>(
		type: ObjectType,
		controls: SelectionControlDefinition<TState>[],
	): void {
		const widenedControls = controls as unknown as SelectionControlDefinition[];
		const parts = new Set<string>();
		for (const control of widenedControls) {
			if (control.handler.objectType !== type) {
				throw new Error(
					`Selection control "${control.handler.part}" cannot be registered for type "${type}"`,
				);
			}
			if (parts.has(control.handler.part)) {
				throw new Error(
					`Duplicate selection control part "${control.handler.part}"`,
				);
			}
			parts.add(control.handler.part);
		}
		this.entries.set(type, widenedControls);
	}

	get(type: ObjectType): readonly SelectionControlDefinition[] | undefined {
		return this.entries.get(type);
	}

	clear(): void {
		this.entries.clear();
	}
}

export const createSelectionControlRegistry = (): SelectionControlRegistry =>
	new SelectionControlRegistry();
