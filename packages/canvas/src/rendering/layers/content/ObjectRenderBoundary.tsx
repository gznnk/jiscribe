import { Component } from "react";
import type { ReactNode } from "react";

type ObjectRenderBoundaryProps = {
	/** The object's id, named in the warning. */
	objectId: string;
	/** The object's type, named in the warning. */
	objectType: string;
	/**
	 * The state the object is drawn from. A throw is held against this very
	 * object: the next state (an undo, an external sync) is drawn again.
	 */
	objectState: object;
	/** The object's own component. Replaced by nothing while it throws. */
	children: ReactNode;
};

type ObjectRenderBoundaryState = {
	/** The state whose drawing threw, or null while the object draws. */
	failedState: object | null;
	/** Set by React on the throw, before `failedState` is known. */
	hasFailed: boolean;
};

/**
 * Keeps one object's drawing from taking the canvas down with it. React unmounts
 * the whole tree on an exception thrown during render — the canvas, the toolbar,
 * the host's own page where it has no boundary of its own — so a shape whose
 * renderer throws (an invariant broken in its data: a cell with no region) is
 * drawn as nothing and named in a warning, while every other object stays drawn,
 * editable and saved.
 *
 * The failure is held against the state object that threw, not the id: once the
 * object's state is replaced the drawing is tried again, which is what lets an
 * undo or an outside correction bring the object back without a reload.
 */
export class ObjectRenderBoundary extends Component<
	ObjectRenderBoundaryProps,
	ObjectRenderBoundaryState
> {
	state: ObjectRenderBoundaryState = { failedState: null, hasFailed: false };

	static getDerivedStateFromError(): Partial<ObjectRenderBoundaryState> {
		return { hasFailed: true };
	}

	static getDerivedStateFromProps(
		props: ObjectRenderBoundaryProps,
		state: ObjectRenderBoundaryState,
	): Partial<ObjectRenderBoundaryState> | null {
		if (state.failedState !== null && state.failedState !== props.objectState) {
			return { failedState: null, hasFailed: false };
		}
		return null;
	}

	componentDidCatch(error: unknown): void {
		const { objectId, objectType, objectState } = this.props;
		console.warn(
			`[Canvas] ${objectType} ${objectId} could not be drawn: ${error instanceof Error ? error.message : String(error)}`,
		);
		this.setState({ failedState: objectState });
	}

	render(): ReactNode {
		return this.state.hasFailed ? null : this.props.children;
	}
}
