import type { TextableData } from "../../data/core/TextableData";

/**
 * Interface for diagram elements that can display and edit text.
 * Extends base data with runtime state that should not be persisted.
 */
export type TextableState = TextableData & {
	isTextEditing: boolean;
};
