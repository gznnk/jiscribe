import type { ObjectType } from "../../../schemas/objects/types/ObjectType";
import type { ObjectState } from "../../../states/objects/base/ObjectState";

/**
 * Condenses the state a type's outline / anchor region read beyond the frame
 * fields (cx / cy / width / height / rotation / scaleX / scaleY) into one
 * comparable value, for consumers that memoize connector endpoint resolution on
 * those frame fields (`useResolvedConnectorPoints`). The callout's tail
 * (`@jiscribe/plugin-annotation-shapes`) is the motivating case: it reshapes the
 * outline while every frame field stays put, so without a key the resolved
 * endpoints go stale mid-drag.
 *
 * The return type is deliberately scalar: an array or object would compare
 * unequal on every re-map of the object and defeat the memo it feeds.
 * Implementations declare the extra fields they read on top of `ObjectState`
 * via `TState` (the callout's is
 * `ObjectGeometryKeyCalculator<ObjectState & Pick<CalloutState, "tail">>`, whose
 * optional field keeps it assignable to the default instantiation the registry
 * stores).
 */
export type ObjectGeometryKeyCalculator<
	TState extends ObjectState = ObjectState,
> = (state: TState) => string | number | undefined;

/**
 * Per-type registry of geometry-key calculators. Types without a registered
 * calculator have their resolved geometry fully determined by the frame fields.
 */
export class ObjectGeometryKeyRegistry {
	private readonly calculators = new Map<
		ObjectType,
		ObjectGeometryKeyCalculator
	>();

	register(type: ObjectType, calculator: ObjectGeometryKeyCalculator): void {
		this.calculators.set(type, calculator);
	}

	get(type: ObjectType): ObjectGeometryKeyCalculator | undefined {
		return this.calculators.get(type);
	}

	clear(): void {
		this.calculators.clear();
	}
}

export const createObjectGeometryKeyRegistry = (): ObjectGeometryKeyRegistry =>
	new ObjectGeometryKeyRegistry();
