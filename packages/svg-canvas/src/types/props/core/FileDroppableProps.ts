import type { FileDropEvent } from "../../events/FileDropEvent";

/**
 * Props for file droppable component.
 */
export type FileDroppableProps = {
	onFileDrop?: (e: FileDropEvent) => void;
};
