import type { DiagramChangeEvent } from "../../events/DiagramChangeEvent";

/**
 * Props for having child diagrams component.
 *
 * @property {function} onDiagramChange - Event handler for diagram change.
 *                                        Trigger this handler when notifying changes in the properties of a diagram.
 */
export type ItemableProps = {
	onDiagramChange?: (e: DiagramChangeEvent) => void;
};
