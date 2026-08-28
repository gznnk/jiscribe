// The name of the open file, shown in the toolbar's host slot.
//
// The viewer has no file menu (the AI decides what is open), so this is the one
// place a person can tell which file the canvas is drawing.

import type { CanvasTheme } from "@jiscribe/canvas";
import type { CSSProperties } from "react";

export type FileLabelProps = {
	/** Workspace-relative path of the open file, or null before one has arrived */
	relPath: string | null;
	/** Whether the socket to the host is up. While down, a badge is added */
	isConnected: boolean;
	/**
	 * The tokens of the theme the canvas is drawn with. The label sits inside the
	 * toolbar, so it takes its colors from there rather than from the page
	 */
	tokens: CanvasTheme["tokens"];
};

/** The part after the last separator. The host sends `/` even on Windows */
const calcFileName = (relPath: string): string =>
	relPath.slice(relPath.lastIndexOf("/") + 1);

/**
 * The toolbar's file name. Truncated with an ellipsis at a fixed width so a deep
 * path cannot push the shape tools off the bar; the whole path is in the tooltip.
 *
 * @param props relPath is the full path (shown on hover), of which only the file
 *   name is drawn
 */
export function FileLabel({ relPath, isConnected, tokens }: FileLabelProps) {
	return (
		<div
			className="viewer-file-label"
			style={
				{
					"--app-foreground-muted": tokens.foregroundMuted,
					"--app-error-foreground": tokens.errorFg,
				} as CSSProperties
			}
		>
			<span className="viewer-file-name" title={relPath ?? undefined}>
				{relPath === null ? "（未指定）" : calcFileName(relPath)}
			</span>
			{!isConnected && (
				<span className="viewer-disconnected" title="ホストと切断されました">
					未接続
				</span>
			)}
		</div>
	);
}
