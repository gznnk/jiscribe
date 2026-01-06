import type { ObjectDoc } from "../../../schemas/objects/base/ObjectDoc";
import type { ObjectState } from "../../../states/objects/base/ObjectState";

/**
 * Function type that converts ObjectDoc to ObjectState.
 * Used in object registry for type-specific mapping.
 *
 * @template TDoc - Specific ObjectDoc type (e.g., RectDoc, EllipseDoc)
 * @template TState - Specific ObjectState type (e.g., RectState, EllipseState)
 */
export type DocToStateMapper<
	TDoc extends ObjectDoc = ObjectDoc,
	TState extends ObjectState = ObjectState,
> = (doc: TDoc) => TState;

/**
 * Function type that converts ObjectState to ObjectDoc.
 * Used in object registry for type-specific mapping.
 *
 * @template TState - Specific ObjectState type (e.g., RectState, EllipseState)
 * @template TDoc - Specific ObjectDoc type (e.g., RectDoc, EllipseDoc)
 */
export type StateToDocMapper<
	TState extends ObjectState = ObjectState,
	TDoc extends ObjectDoc = ObjectDoc,
> = (state: TState) => TDoc;

/**
 * Bidirectional mapper for converting between ObjectDoc and ObjectState.
 * Used in object registry to provide both conversion directions.
 *
 * @template TDoc - Specific ObjectDoc type (e.g., RectDoc, EllipseDoc)
 * @template TState - Specific ObjectState type (e.g., RectState, EllipseState)
 */
export type ObjectMapperType<
	TDoc extends ObjectDoc = ObjectDoc,
	TState extends ObjectState = ObjectState,
> = {
	/**
	 * Converts ObjectDoc to ObjectState.
	 */
	toState: DocToStateMapper<TDoc, TState>;

	/**
	 * Converts ObjectState to ObjectDoc.
	 */
	toDoc: StateToDocMapper<TState, TDoc>;
};
