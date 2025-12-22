import type { EventPhase } from "./EventPhase";
import type { Frame } from "../core/Frame";
import type { TextableData } from "../data/core/TextableData";

/**
 * Attributes for the text editor component.
 */
export type TextEditorAttributes = Frame & TextableData;

/**
 * Event fired when text content is changed on a diagram
 */
export type DiagramTextChangeEvent = {
	eventId: string;
	eventPhase: EventPhase;
	id: string;
	text: string;
	activateEditor?: boolean;
	initializeAttributes?: TextEditorAttributes; // Optional initial attributes for the text editor
};
