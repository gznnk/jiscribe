// Keeps a failure while drawing from taking the page down with it.
//
// React unmounts the whole tree on an exception thrown during render, which here
// would close the socket on the way out. A person's window would sit there dead,
// and a headless one — with nobody to reload it — would keep the browser alive for
// a host that has long stopped waiting for it.

import { Component } from "react";
import type { ReactNode } from "react";

export type CanvasErrorBoundaryProps = {
	/**
	 * Told the message of the exception, once. The canvas is not mounted again
	 * afterwards, so this is all that is left to report it with
	 */
	onError: (message: string) => void;
	/** The canvas. Replaced by nothing once it has thrown */
	children: ReactNode;
};

type CanvasErrorBoundaryState = {
	/** Whether the canvas threw while rendering */
	hasFailed: boolean;
};

/** Catches what the canvas throws while rendering, leaving the page itself up. */
export class CanvasErrorBoundary extends Component<
	CanvasErrorBoundaryProps,
	CanvasErrorBoundaryState
> {
	state: CanvasErrorBoundaryState = { hasFailed: false };

	static getDerivedStateFromError(): CanvasErrorBoundaryState {
		return { hasFailed: true };
	}

	componentDidCatch(error: Error): void {
		// Typed as an Error by React, but a throw carries whatever it was given
		this.props.onError(error instanceof Error ? error.message : String(error));
	}

	render(): ReactNode {
		return this.state.hasFailed ? null : this.props.children;
	}
}
