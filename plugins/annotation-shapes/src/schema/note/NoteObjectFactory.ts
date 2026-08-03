import { createFrameObjectFactory } from "@workspace/canvas/unstable-doc";

import { NOTE_DOC_DEFAULTS } from "./NoteDoc";

/** Factory for creating Note shapes (Frame-family shared logic generated from defaults). */
export const NoteObjectFactory = createFrameObjectFactory(NOTE_DOC_DEFAULTS);
