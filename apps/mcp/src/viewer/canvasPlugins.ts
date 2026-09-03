// The shape set the viewer handles. The UI plugins (for Canvas rendering) and the
// doc plugins (for parsing) come out of one place.
//
// **It must be the same set as the server's canvasDefinitions.ts.** Once they drift,
// the viewer rejects a shape the AI added through a tool as an unknown type, and the
// screen stops updating.

import { createCanvasParser } from "@jiscribe/doc";
import { standardPlugins } from "@jiscribe/standard-shapes";
import { standardDocPlugins } from "@jiscribe/standard-shapes/doc";

/** The full set of UI plugins handed to Canvas's initialConfig */
export const plugins = standardPlugins;

/** The parser that turns the text arriving over the WebSocket into a doc */
export const canvasParser = createCanvasParser({ plugins: standardDocPlugins });
