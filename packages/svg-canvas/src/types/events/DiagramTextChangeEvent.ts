import type { TransformedFrame } from "@workspace/geometry";

import type { EventPhase } from "./EventPhase";
import type { TextableData } from "../data/core/TextableData";

/**
 * Attributes for the text editor component.
 */
export type TextEditorAttributes = TransformedFrame & TextableData;

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
