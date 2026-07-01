/**
 * Line height shared by text display (TextOverlay) and text editing (TextEditor).
 *
 * Because a textarea is a form element, it does not inherit line-height from its
 * ancestors and instead uses the UA default (normal ≈ 1.2). A div, on the other
 * hand, does inherit, so without an explicit value the line spacing of display and
 * editing can diverge depending on the host app's global CSS. Setting the same
 * value explicitly on both keeps text position consistent while editing.
 */
export const TEXT_LINE_HEIGHT = 1.5;
