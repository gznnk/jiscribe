import type { RichText } from "@jiscribe/doc/model/objects/types/text/RichText";
import type { BoundingBox } from "@jiscribe/geometry";
import { type Dispatch, useCallback, useMemo } from "react";

import { useRevealTextEditCaret } from "./useRevealTextEditCaret";
import { useTextEditDraftState } from "./useTextEditDraftState";
import type { CanvasControllerState } from "../CanvasTypes";
import { SelectNextTextSlotCommand } from "../commands/selection/SelectNextTextSlotCommand";
import { SelectPreviousTextSlotCommand } from "../commands/selection/SelectPreviousTextSlotCommand";
import { CommitTextEditCommand } from "../commands/text/CommitTextEditCommand";
import { toggleTextFormatCommandId } from "../commands/text/ToggleTextFormatCommands";
import type { CanvasAction } from "../reducer/CanvasActions";
import type { CanvasRegistries } from "../registries/CanvasRegistries";
import type { TextFormat } from "../style/TextFormat";
import { graftTextEditDraft } from "../utils/graftTextEditDraft";
import { readOpenTextEdit } from "../utils/readOpenTextEdit";

/** The TextEditorLayer callbacks, named as its props so they can be spread onto it. */
type TextEditorHandlers = {
	onTextChange: (text: RichText) => void;
	onEscape: () => void;
	onCommit: () => void;
	onCaretMove: (caretWorldBox: BoundingBox) => void;
	onSelectionChange: (selection: { start: number; end: number }) => void;
	onToggleFormat: (format: TextFormat) => void;
	onTab: (step: 1 | -1) => void;
};

type TextEditSessionParams = {
	canvasState: CanvasControllerState;
	dispatch: Dispatch<CanvasAction>;
	/** Passed in rather than read from context: Canvas is the registries provider. */
	registries: CanvasRegistries;
};

type TextEditSession = {
	/** `state.objects` with the uncommitted editor text grafted onto the edited slot. */
	draftObjects: CanvasControllerState["objects"];
	/** The object or connector the open editor covers, or null when none is open. */
	textEditObjectId: string | null;
	/** The shape slot the open editor covers; null for a connector label or no session. */
	editingTextSlotId: string | null;
	/** `canvasState` carrying `draftObjects`, for the menus anchored to the drawn extent. */
	menuCanvasState: CanvasControllerState;
	/** Referentially stable as a whole and per handler. */
	editorHandlers: TextEditorHandlers;
};

/**
 * Dispatches `action` only when `commandId` is registered, so a host that left
 * the command out of `config.commands` gets the keystroke swallowed instead.
 */
const dispatchIfCommandRegistered = (
	registries: CanvasRegistries,
	dispatch: Dispatch<CanvasAction>,
	commandId: string,
	action: CanvasAction,
): void => {
	if (registries.command.get(commandId) === undefined) {
		return;
	}
	dispatch(action);
};

/** The id of the shape or connector the open editor covers, or null when none is open. */
const readTextEditObjectId = (
	textEdit: ReturnType<typeof readOpenTextEdit>,
): string | null => {
	if (textEdit === null) {
		return null;
	}
	return textEdit.kind === "shape" ? textEdit.object.id : textEdit.connector.id;
};

/**
 * Derives what the open in-place text edit draws over, and builds the editor
 * callbacks that feed its keystrokes back into the canvas.
 */
export const useTextEditSession = ({
	canvasState,
	dispatch,
	registries,
}: TextEditSessionParams): TextEditSession => {
	// Neither memo below reads the caret, so both key on the session held through
	// caret-only moves.
	const textEditDraftState = useTextEditDraftState(canvasState.textEditState);

	// The slot being edited carries the uncommitted editor text, so geometry derived from
	// it follows every keystroke instead of jumping on commit. Rendering, selection
	// feedback, editor placement and the menu anchor only — hit testing and snapping
	// still read committed state.objects.
	const draftObjects = useMemo(
		() =>
			graftTextEditDraft(
				{
					objects: canvasState.objects,
					selection: canvasState.selection,
					textEditState: textEditDraftState,
				},
				registries.objectContentResizer,
			),
		[
			canvasState.objects,
			canvasState.selection,
			textEditDraftState,
			registries,
		],
	);

	// What the open editing session is on, for the layers that only need to know
	// which object and slot the in-place editor covers (culling keeps it rendered,
	// the overlay hands its slot over to the editor).
	const textEdit = useMemo(
		() =>
			readOpenTextEdit({
				objects: canvasState.objects,
				selection: canvasState.selection,
				textEditState: textEditDraftState,
			}),
		[canvasState.objects, canvasState.selection, textEditDraftState],
	);
	const textEditObjectId = readTextEditObjectId(textEdit);
	const editingTextSlotId =
		textEdit?.kind === "shape" ? textEdit.textSlotId : null;

	// The menu is anchored below the drawn extent, which during a text edit is the
	// draft-grafted box (a keystroke regrows an auto-sized text before commit), so
	// the menu reads the same objects the rendering layers draw.
	const menuCanvasState = useMemo(
		() =>
			draftObjects === canvasState.objects
				? canvasState
				: { ...canvasState, objects: draftObjects },
		[canvasState, draftObjects],
	);

	const revealCaret = useRevealTextEditCaret({
		viewport: canvasState.viewport,
		dispatch,
	});

	// Editor handlers with stable identities: TextEditorLayer is memoized, and
	// TextEditor keys its native-listener effects on these, so inline literals
	// here would re-attach those listeners on every canvas dispatch mid-edit.
	const handleTextChange = useCallback(
		(text: RichText) => {
			dispatch({ type: "UPDATE_TEXT_EDIT", text });
		},
		[dispatch],
	);
	const handleEscape = useCallback(() => {
		dispatch({ type: "END_TEXT_EDIT", commit: false });
	}, [dispatch]);
	const handleSelectionChange = useCallback(
		(selection: { start: number; end: number }) => {
			dispatch({ type: "UPDATE_TEXT_EDIT_SELECTION", selection });
		},
		[dispatch],
	);
	// The editor's keystrokes never reach useKeyboardShortcuts (it skips an
	// editable target), so the editor raises the format's command itself — the
	// same one the canvas shortcut and the format buttons run, swallowed as it
	// would be on the canvas when the host left it out.
	const handleToggleFormat = useCallback(
		(format: TextFormat) => {
			const commandId = toggleTextFormatCommandId(format);
			dispatchIfCommandRegistered(registries, dispatch, commandId, {
				type: "COMMAND",
				commandId,
			});
		},
		[dispatch, registries],
	);

	// Cmd/Ctrl+Enter in the editor commits through its command.
	const handleCommit = useCallback(() => {
		dispatchIfCommandRegistered(
			registries,
			dispatch,
			CommitTextEditCommand.id,
			{
				type: "COMMAND",
				commandId: CommitTextEditCommand.id,
			},
		);
	}, [dispatch, registries]);

	// Tab in the editor walks the slots as Tab on the canvas does, gated on that
	// walk's command though it dispatches the step directly.
	const handleTab = useCallback(
		(step: 1 | -1) => {
			const commandId =
				step === 1
					? SelectNextTextSlotCommand.id
					: SelectPreviousTextSlotCommand.id;
			dispatchIfCommandRegistered(registries, dispatch, commandId, {
				type: "STEP_TEXT_EDIT",
				step,
			});
		},
		[dispatch, registries],
	);

	const editorHandlers = useMemo<TextEditorHandlers>(
		() => ({
			onTextChange: handleTextChange,
			onEscape: handleEscape,
			onCommit: handleCommit,
			onCaretMove: revealCaret,
			onSelectionChange: handleSelectionChange,
			onToggleFormat: handleToggleFormat,
			onTab: handleTab,
		}),
		[
			handleTextChange,
			handleEscape,
			handleCommit,
			revealCaret,
			handleSelectionChange,
			handleToggleFormat,
			handleTab,
		],
	);

	return {
		draftObjects,
		textEditObjectId,
		editingTextSlotId,
		menuCanvasState,
		editorHandlers,
	};
};
