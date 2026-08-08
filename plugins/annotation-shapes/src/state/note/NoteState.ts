import type { CreateObjectState } from "@workspace/canvas";

import type { NoteFeatures } from "../../schema/note/NoteDoc";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const NoteStateBrand: unique symbol;

export type NoteState = CreateObjectState<
	typeof NoteFeatures,
	typeof NoteStateBrand
>;
