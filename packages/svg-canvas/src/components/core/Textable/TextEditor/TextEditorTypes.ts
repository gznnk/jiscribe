import type {
	DiagramTextChangeEvent,
	TextEditorAttributes,
} from "../../../../types/events/DiagramTextChangeEvent";

/**
 * Type for the state of the TextEditor.
 */
export type TextEditorState = TextEditorAttributes & {
	id: string;
	isActive: boolean;
};

/**
 * Props for the TextEditor component.
 */
export type TextEditorProps = TextEditorState & {
	onTextChange?: (e: DiagramTextChangeEvent) => void;
};
