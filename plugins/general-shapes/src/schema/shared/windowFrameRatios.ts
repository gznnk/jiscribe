/**
 * Height of the title bar as a fraction of the window height. Shared by the
 * browser and the terminal — the two differ only in what sits in the bar, so a
 * change here must keep them looking like one family. Declared here rather than
 * beside the frame builder because the text region is derived from it, and that
 * declaration is headless (see ../textRegions).
 */
export const WINDOW_TITLE_BAR_RATIO = 0.24;
