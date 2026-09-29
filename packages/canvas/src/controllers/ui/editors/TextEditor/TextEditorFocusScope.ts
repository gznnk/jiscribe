const TEXT_EDITOR_FOCUS_SCOPE_ATTRIBUTE = "data-text-editor-focus-scope";

/**
 * Spread onto a container whose controls style the text being edited, so a
 * press inside it leaves the focus on the open editor, and the focus a control
 * of its own gives up is handed back to the editor (TextEditor).
 */
export const TEXT_EDITOR_FOCUS_SCOPE_PROPS = {
	[TEXT_EDITOR_FOCUS_SCOPE_ATTRIBUTE]: "",
} as const;

/** Matches a container marked with TEXT_EDITOR_FOCUS_SCOPE_PROPS. */
export const TEXT_EDITOR_FOCUS_SCOPE_SELECTOR = `[${TEXT_EDITOR_FOCUS_SCOPE_ATTRIBUTE}]`;
