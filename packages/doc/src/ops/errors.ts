/**
 * Expected error from docOps whose message can be handed straight back to the caller
 * (an AI or tool-calling client).
 *
 * It covers cases where params are well-typed but do not hold at runtime, such as a target
 * that is not connectable. Adapters (MCP / function calling) distinguish it from internal
 * errors and surface `message` verbatim. A batch op's per-element failure carries the
 * element's own error as `cause`.
 */
export class DocOperationError extends Error {
	// Declared and set here rather than through `ErrorOptions`: a host typechecking these
	// sources may pin a lib below ES2022, where neither the option nor the field exists.
	/** The failure this one wraps, for a batch op's per-element failure; absent otherwise. */
	declare cause?: unknown;

	/**
	 * @param message - Handed back to the caller verbatim
	 * @param cause - The failure being wrapped; omitted leaves `cause` absent
	 */
	constructor(message?: string, cause?: unknown) {
		super(message);
		if (cause !== undefined) {
			this.cause = cause;
		}
	}
}

/**
 * A text op refused an object whose type keeps its texts in fields of its own (a table's
 * `cells`) rather than under `text`, which the text ops do not reach.
 *
 * The doc layer cannot say what does reach them; a host that knows (the tools a plugin
 * offers for the type) recognises the refusal by this class rather than by its message.
 */
export class TextKeptInOwnFieldsError extends DocOperationError {
	/** The id of the refused object. */
	readonly objectId: string;
	/** The refused object's type, as `listTypes` names it. */
	readonly objectType: string;

	constructor(message: string, objectId: string, objectType: string) {
		super(message);
		this.objectId = objectId;
		this.objectType = objectType;
	}
}
