import type { DiagramSelectEvent } from "../../events/DiagramSelectEvent";

/**
 * Properties for selectable diagram components.
 * Defines event handlers for selection state changes.
 */
export type SelectableProps = {
	onSelect?: (e: DiagramSelectEvent) => void;
};
