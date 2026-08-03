import type { ObjectDocValidateFn } from "@workspace/canvas-sdk/doc";
import { createFrameDocValidator } from "@workspace/canvas-sdk/doc";

import { NoteFeatures } from "./NoteDoc";

/**
 * Validates a NoteDoc (Frame-family shared logic generated from features). The
 * note carries no fields of its own — the fold is a fixed ratio, not a property.
 */
export const validateNoteDoc: ObjectDocValidateFn =
	createFrameDocValidator(NoteFeatures);
