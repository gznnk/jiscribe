// The host menu, shown in the toolbar's host slot ahead of the file name: the
// actions the process owning the canvas host offers (see ../shared/hostActionsRoute).
//
// A browser viewer's host offers none, and then CanvasSurface puts no slot up for
// this at all, so the bar looks as it did without it. The desktop app offers what
// its native File menu used to, and this is where those went.

import type { CanvasTheme } from "@jiscribe/canvas";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

import type { HostActionName } from "../shared/hostActionsRoute";

export type HostMenuProps = {
	/**
	 * The actions the host announced, drawn in the order given: the host lists
	 * them in menu order (HOST_ACTION_NAMES), and the viewer keeps only the names
	 * it knows (files.ts). Never empty: the menu is mounted only when something
	 * is offered
	 */
	actions: readonly HostActionName[];
	/** Called with the action chosen. The menu has closed by then */
	onAction: (action: HostActionName) => void;
	/**
	 * The tokens of the theme the canvas is drawn with. The menu sits inside the
	 * toolbar, so it takes its colors from there rather than from the page
	 */
	tokens: CanvasTheme["tokens"];
};

/** What each action is called on the menu */
const HOST_ACTION_LABELS: Record<HostActionName, string> = {
	openFile: "開く…",
	quit: "終了",
};

const MENU_BUTTON_TITLE = "メニュー";

/**
 * A button opening a dropdown of the offered actions.
 *
 * @param props `actions` is drawn as given, one item each; the caller decides
 *   whether there is a menu at all
 */
export function HostMenu({ actions, onAction, tokens }: HostMenuProps) {
	const [isOpen, setIsOpen] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);

	// Closed on a pointer down outside and on Escape. The Canvas root's handlers
	// stop propagation and read Escape as deselect, so both are listened for in the
	// capture phase on the document, and Escape is stopped there so that closing
	// the menu is all it does
	useEffect(() => {
		if (!isOpen) {
			return;
		}
		const handlePointerDown = (event: PointerEvent): void => {
			if (!menuRef.current?.contains(event.target as Node)) {
				setIsOpen(false);
			}
		};
		const handleKeyDown = (event: KeyboardEvent): void => {
			if (event.key === "Escape") {
				event.preventDefault();
				event.stopPropagation();
				setIsOpen(false);
			}
		};
		document.addEventListener("pointerdown", handlePointerDown, {
			capture: true,
		});
		document.addEventListener("keydown", handleKeyDown, { capture: true });
		return () => {
			document.removeEventListener("pointerdown", handlePointerDown, {
				capture: true,
			});
			document.removeEventListener("keydown", handleKeyDown, {
				capture: true,
			});
		};
	}, [isOpen]);

	return (
		<div
			className="viewer-host-menu"
			ref={menuRef}
			style={
				{
					"--app-radius": tokens.radius,
					"--app-surface": tokens.surface,
					"--app-border": tokens.border,
					"--app-shadow": tokens.shadow,
					"--app-foreground": tokens.foreground,
					"--app-icon-foreground": tokens.iconForeground,
					"--app-surface-hover": tokens.surfaceHover,
					"--app-surface-active": tokens.surfaceActive,
				} as CSSProperties
			}
		>
			<button
				type="button"
				className="viewer-host-menu-button"
				data-testid="host-menu"
				title={MENU_BUTTON_TITLE}
				aria-label={MENU_BUTTON_TITLE}
				aria-haspopup="menu"
				aria-expanded={isOpen}
				onClick={() => setIsOpen((wasOpen) => !wasOpen)}
			>
				<svg
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					aria-hidden="true"
				>
					<line x1="4" y1="6" x2="20" y2="6" />
					<line x1="4" y1="12" x2="20" y2="12" />
					<line x1="4" y1="18" x2="20" y2="18" />
				</svg>
			</button>
			{isOpen && (
				<div className="viewer-host-menu-dropdown" role="menu">
					{actions.map((action) => (
						<button
							key={action}
							type="button"
							role="menuitem"
							className="viewer-host-menu-item"
							data-testid={`host-menu-item:${action}`}
							onClick={() => {
								setIsOpen(false);
								onAction(action);
							}}
						>
							{HOST_ACTION_LABELS[action]}
						</button>
					))}
				</div>
			)}
		</div>
	);
}
