import type { ObjectType } from "@jiscribe/doc/model/objects/types/ObjectType";

import type {
	MoveByDeltaFunction,
	ObjectBehaviorEntry,
	RotateByGroupFunction,
	TransformByGroupFunction,
} from "./ObjectBehaviorTypes";
import type { ObjectState } from "../../../states/objects/base/ObjectState";

export class ObjectBehaviorRegistry {
	private readonly entries = new Map<ObjectType, ObjectBehaviorEntry>();

	register<TState extends ObjectState>(
		type: ObjectType,
		entry: ObjectBehaviorEntry<TState>,
	): void {
		this.entries.set(type, entry as unknown as ObjectBehaviorEntry);
	}

	getMoveByDelta(type: ObjectType): MoveByDeltaFunction | undefined {
		return this.entries.get(type)?.moveByDelta;
	}

	getTransformByGroup(type: ObjectType): TransformByGroupFunction | undefined {
		return this.entries.get(type)?.transformByGroup;
	}

	getRotateByGroup(type: ObjectType): RotateByGroupFunction | undefined {
		return this.entries.get(type)?.rotateByGroup;
	}

	clear(): void {
		this.entries.clear();
	}
}

export const createObjectBehaviorRegistry = (): ObjectBehaviorRegistry =>
	new ObjectBehaviorRegistry();
