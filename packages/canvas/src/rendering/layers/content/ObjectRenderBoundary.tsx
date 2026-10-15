import { Component } from "react";
import type { ComponentType, ReactNode } from "react";

/** What the boundary hands an object's component on top of the object's own state. */
type ObjectComponentExtraProps = {
	isEditing: boolean;
	editingTextSlotId: string | undefined;
};

type ObjectRenderBoundaryProps<TObjectState extends object> = {
	/** The object's id, named in the warning. */
	objectId: string;
	/** The object's type, named in the warning. */
	objectType: string;
	/**
	 * The state the object is drawn from. A throw is held against this very
	 * object: the next state (an undo, an external sync) is drawn again.
	 */
	objectState: TObjectState;
	/**
	 * The object's own component, drawn with `objectState` spread into its props.
	 * Replaced by nothing while it throws.
	 */
	component: ComponentType<TObjectState & ObjectComponentExtraProps>;
	/** Whether the text editor is open on this object. */
	isEditing: boolean;
	/**
	 * Slot the editor is over; undefined for every object but the edited one, so
	 * starting or ending an edit leaves the others' props as they were.
	 */
	editingTextSlotId: string | undefined;
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
 *
 * The boundary builds the object's element itself and re-renders only when what
 * that element is built from changes, so a render of the canvas that leaves an
 * object's state alone (a drag frame elsewhere, a keystroke) skips it.
 */
export class ObjectRenderBoundary<
	TObjectState extends object = object,
> extends Component<
	ObjectRenderBoundaryProps<TObjectState>,
	ObjectRenderBoundaryState
> {
	state: ObjectRenderBoundaryState = { failedState: null, hasFailed: false };

	static getDerivedStateFromError(): Partial<ObjectRenderBoundaryState> {
		return { hasFailed: true };
	}

	static getDerivedStateFromProps(
		props: ObjectRenderBoundaryProps<object>,
		state: ObjectRenderBoundaryState,
	): Partial<ObjectRenderBoundaryState> | null {
		if (state.failedState !== null && state.failedState !== props.objectState) {
			return { failedState: null, hasFailed: false };
		}
		return null;
	}

	shouldComponentUpdate(
		nextProps: ObjectRenderBoundaryProps<TObjectState>,
		nextState: ObjectRenderBoundaryState,
	): boolean {
		const { props, state } = this;
		return (
			nextProps.objectId !== props.objectId ||
			nextProps.objectType !== props.objectType ||
			nextProps.objectState !== props.objectState ||
			nextProps.component !== props.component ||
			nextProps.isEditing !== props.isEditing ||
			nextProps.editingTextSlotId !== props.editingTextSlotId ||
			nextState.failedState !== state.failedState ||
			nextState.hasFailed !== state.hasFailed
		);
	}

	componentDidCatch(error: unknown): void {
		const { objectId, objectType, objectState } = this.props;
		console.warn(
			`[Canvas] ${objectType} ${objectId} could not be drawn: ${error instanceof Error ? error.message : String(error)}`,
		);
		this.setState({ failedState: objectState });
	}

	render(): ReactNode {
		if (this.state.hasFailed) {
			return null;
		}
		const {
			component: ObjectComponent,
			objectState,
			isEditing,
			editingTextSlotId,
		} = this.props;
		return (
			<ObjectComponent
				{...objectState}
				isEditing={isEditing}
				editingTextSlotId={editingTextSlotId}
			/>
		);
	}
}
