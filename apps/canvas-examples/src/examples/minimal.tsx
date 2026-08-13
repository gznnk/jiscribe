import { Canvas } from "@jiscribe/canvas";
import type { CanvasDoc } from "@jiscribe/canvas";

const emptyDoc: CanvasDoc = { version: 1, root: [] };

/**
 * The smallest setup: an example that only mounts Canvas with an empty document.
 * Theme, callbacks and the rest are all optional; the defaults are the dark theme and
 * uncontrolled behaviour.
 */
export function MinimalExample() {
	return <Canvas doc={emptyDoc} />;
}
