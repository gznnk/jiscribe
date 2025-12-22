import type { DiagramChangeEvent } from "../../events/DiagramChangeEvent";
import type { DiagramTextChangeEvent } from "../../events/DiagramTextChangeEvent";

/**
 * Props for components that can display and edit text.
 * Provides properties to control text editing behavior and associated event handlers.
 */
export type TextableProps = {
	isTextEditEnabled?: boolean;
	onTextChange?: (e: DiagramTextChangeEvent) => void;
	onDiagramChange?: (e: DiagramChangeEvent) => void;
};
