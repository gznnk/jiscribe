/**
 * An error standing for a reason the host cannot be brought up. Its content is
 * guidance for the user, so the tool layer hands it to the AI as it is, as
 * `error: ...` rather than an internal error.
 *
 * It is split out of canvasHost.ts, where values and types live together, because
 * viewerAssets.ts is one of the throwers and a reference back the other way would be
 * a cycle.
 */
export class CanvasHostError extends Error {}
