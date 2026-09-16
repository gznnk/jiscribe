import { memo } from "react";

import {
	COMMENT_MARKER_BUBBLE_CLASS,
	CommentMarkerLabel,
	CommentMarkerRoot,
} from "./CommentMarkerStyled";
import {
	COMMENT_MARKER_HEIGHT,
	COMMENT_MARKER_TARGET_KIND,
	COMMENT_MARKER_WIDTH,
} from "./CommentsConstants";

type CommentMarkerProps = {
	/** Object the threads belong to; the gesture handler reads it back off `data-id`. */
	objectId: string;
	/** Number of threads still open; 0 draws a check instead of a number. */
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
 * The speech bubble drawn over an object that carries comment threads.
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
		isActive={isActive}
		isAllResolved={openCount === 0}
		title={title}
		style={{ left, top }}
	>
		<svg
			width={COMMENT_MARKER_WIDTH}
			height={COMMENT_MARKER_HEIGHT}
			viewBox="0 0 24 20"
			xmlns="http://www.w3.org/2000/svg"
		>
			{/* Rounded bubble with a tail dropping from its bottom-left */}
			<path
				className={COMMENT_MARKER_BUBBLE_CLASS}
				d="M4 1 H20 a3 3 0 0 1 3 3 V12 a3 3 0 0 1 -3 3 H9 L5 19 V15 H4 a3 3 0 0 1 -3 -3 V4 a3 3 0 0 1 3 -3 Z"
				strokeWidth="1.5"
				strokeLinejoin="round"
			/>
			{openCount > 0 ? (
				<CommentMarkerLabel
					x="12"
					y="8"
					textAnchor="middle"
					dominantBaseline="central"
				>
					{openCount}
				</CommentMarkerLabel>
			) : (
				<path
					d="M8 8.5 L10.5 11 L16 5"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
			)}
		</svg>
	</CommentMarkerRoot>
);

export const CommentMarker = memo(CommentMarkerComponent);
