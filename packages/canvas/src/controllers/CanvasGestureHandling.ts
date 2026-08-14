/**
 * How the canvas shares gestures with the page embedding it, after the
 * `gestureHandling` option of embedded maps.
 *
 * The line it draws runs between scrolling and zooming, not between the wheel
 * and everything else: zoom belongs to the canvas under either value — Ctrl+wheel
 * (what a trackpad pinch sends), a two-finger pinch and the toolbar's zoom
 * controls all keep zooming the view.
 *
 * - `"greedy"`: every gesture over the canvas is the canvas's, and the host page
 *   never moves. The value an editor filling the window wants.
 * - `"cooperative"`: plain scrolling — the wheel, and on touch a drag along the
 *   page's scroll axis — is left to the browser, so a host document scrolls past
 *   the canvas the way it scrolls past an image; only deliberate, modified
 *   gestures reach the view. For a canvas embedded in a scrolling page (a
 *   landing hero, an article figure), where trapping the wheel would strand the
 *   reader.
 */
export type CanvasGestureHandling = "greedy" | "cooperative";
