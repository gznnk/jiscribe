import type { ObjectStateValidator } from "@workspace/canvas";
import { createFrameStateValidator } from "@workspace/canvas-sdk";

import { NoteFeatures } from "../../schema/note/NoteDoc";

/** Validates NoteState (Frame-family common logic generated from features). */
export const isValidNoteState: ObjectStateValidator =
	createFrameStateValidator(NoteFeatures);
