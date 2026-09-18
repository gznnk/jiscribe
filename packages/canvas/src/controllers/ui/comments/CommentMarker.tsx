import { memo } from "react";

import { CheckGlyph } from "./CommentGlyphs";
import {
	CommentMarkerCountBadge,
	CommentMarkerRoot,
} from "./CommentMarkerStyled";
import { COMMENT_MARKER_TARGET_KIND } from "./CommentsConstants";

type CommentMarkerProps = {
	/** Object the threads belong to; the gesture handler reads it back off `data-id`. */
	objectId: string;
	/** Number of threads still open; 0 draws a check, 2 or more adds the count badge. */
	openCount: number;
	/** Whether the panel is currently showing this object's threads. */
	isActive: boolean;
	/** Offset from the overlay's origin in px, already multiplied by the zoom. */
	left: number;
	/** Offset from the overlay's origin in px, already multiplied by the zoom. */
	top: number;
	/** Tooltip; the layer composes it from the message set. */
	title: string;
};

/**
 * The pin drawn over an object that carries comment threads: three dots while
 * any thread is open (with the count once there are two), a check once every
 * one is resolved.
 *
 * It is a gesture target of its own (`data-kind="comment-marker"`), handled by
 * CommentMarkerHandler: a click selects the object and opens the panel, and a
 * press does nothing, so the marker neither starts a drag nor drops the
 * selection.
 */
const CommentMarkerComponent: React.FC<CommentMarkerProps> = ({
	objectId,
	openCount,
	isActive,
	left,
	top,
	title,
}) => (
	<CommentMarkerRoot
		data-kind={COMMENT_MARKER_TARGET_KIND}
		data-id={objectId}
		data-testid="comment-marker"
		data-state={openCount > 0 ? "open" : "resolved"}
		data-open-count={openCount}
		isActive={isActive}
		isAllResolved={openCount === 0}
		title={title}
		style={{ left, top }}
	>
		{openCount > 0 ? (
			// Drawn 1:1 in px with the dots on whole pixels; a scaled viewBox lands
			// their edges between pixels and blurs them.
			<svg width="14" height="4" viewBox="0 0 14 4" aria-hidden="true">
				<circle cx="2" cy="2" r="2" fill="currentColor" />
				<circle cx="7" cy="2" r="2" fill="currentColor" />
				<circle cx="12" cy="2" r="2" fill="currentColor" />
			</svg>
		) : (
			<CheckGlyph size={14} />
		)}
		{openCount > 1 && (
			<CommentMarkerCountBadge>{openCount}</CommentMarkerCountBadge>
		)}
	</CommentMarkerRoot>
);

export const CommentMarker = memo(CommentMarkerComponent);
