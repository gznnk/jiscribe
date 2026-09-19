/**
 * The names the comment marker is addressed by, shared between the DOM that
 * draws it (`controllers/ui/comments`) and the handler that reads it back.
 *
 * They live in the gesture layer rather than beside the marker because the
 * layer stack only allows values to travel upwards: `ui` may read these, the
 * handler may not read anything of `ui`'s.
 */

/** `data-kind` of the marker element, which is what routes its events here. */
export const COMMENT_MARKER_TARGET_KIND = "comment-marker";

/**
 * Id of the ObjectMenu section holding the comment panel, and so the value
 * `objectMenuOpenId` carries while either placement of that panel is shown.
 * Written by this handler, by the button's `toggle:` part, and read by the
 * marker layer to decide whether it has to draw the panel itself.
 */
export const COMMENTS_SECTION_ID = "comments";
