import { createFrameMapper } from "@workspace/canvas-sdk";

import type { NoteState } from "./NoteState";
import type { NoteDoc } from "../../schema/note/NoteDoc";
import { NoteFeatures } from "../../schema/note/NoteDoc";

/** NoteDoc ↔ NoteState conversion (Frame-family shared logic generated from features). */
export const { toState: noteToState, toDoc: noteToDoc } = createFrameMapper<
	NoteDoc,
	NoteState
>(NoteFeatures);
