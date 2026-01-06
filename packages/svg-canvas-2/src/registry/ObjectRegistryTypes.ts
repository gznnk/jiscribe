import type { ObjectDoc } from "../schemas/objects/base/ObjectDoc";
import type { ObjectState } from "../states/objects/base/ObjectState";

/**
 * Function type that converts ObjectDoc to ObjectState.
 */
export type DocToStateMapper<
	TDoc extends ObjectDoc = ObjectDoc,
	TState extends ObjectState = ObjectState,
> = (doc: TDoc) => TState;

/**
 * Function type that converts ObjectState to ObjectDoc.
 */
export type StateToDocMapper<
	TState extends ObjectState = ObjectState,
	TDoc extends ObjectDoc = ObjectDoc,
> = (state: TState) => TDoc;

/**
 * Bidirectional mapper for converting between ObjectDoc and ObjectState.
 */
export type ObjectMapperType<
	TDoc extends ObjectDoc = ObjectDoc,
	TState extends ObjectState = ObjectState,
> = {
	toState: DocToStateMapper<TDoc, TState>;
	toDoc: StateToDocMapper<TState, TDoc>;
};

/**
 * Complete definition for an object type in the registry.
 * Includes both data mapping logic and UI component.
 */
export type ObjectDefinition<
	TDoc extends ObjectDoc = ObjectDoc,
	TState extends ObjectState = ObjectState,
> = {
	mapper: ObjectMapperType<TDoc, TState>;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	component: React.FC<any>;
};
