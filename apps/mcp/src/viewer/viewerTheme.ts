import { lightCanvasTheme } from "@jiscribe/canvas";
import type { CanvasTheme } from "@jiscribe/canvas";

/**
 * The one theme the viewer draws with — the canvas and the chrome around it
 * both. The canvas injects its tokens as `--jiscribe-*` on its own root, which
 * the chrome outside that root does not inherit, so anything drawn beside the
 * canvas reads the tokens from here instead.
 */
export const viewerTheme: CanvasTheme = lightCanvasTheme;
