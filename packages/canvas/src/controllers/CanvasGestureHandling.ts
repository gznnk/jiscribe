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
 * - `"cooperative"`: plain scrolling is left to the browser, so a host document
 *   scrolls past the canvas the way it scrolls past an image. On touch the
 *   split runs by what the finger lands on: a one-finger drag on the background
 *   scrolls the page, a one-finger drag on a shape drags the shape, and moving
 *   the view itself takes two fingers (the embedded-map convention). For a
 *   canvas embedded in a scrolling page (a landing hero, an article figure),
 *   where trapping the wheel or the touch scroll would strand the reader.
 */
export type CanvasGestureHandling = "greedy" | "cooperative";
