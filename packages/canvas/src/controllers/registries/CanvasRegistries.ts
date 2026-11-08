import type { ObjectType } from "@jiscribe/doc/model/objects/types/ObjectType";

import type { ICanvasRegistries } from "./ICanvasRegistries";
import type { CanvasPlugin } from "../../plugin/CanvasPlugin";
import type { ObjectComponentRegistry } from "../../rendering/objects/registry/ObjectComponentRegistry";
import type { ObjectSvgDefsRegistry } from "../../rendering/objects/registry/ObjectSvgDefsRegistry";
import type { ObjectTextMeasurerRegistry } from "../../rendering/objects/registry/ObjectTextMeasurerRegistry";
import type { ObjectStateValidatorRegistry } from "../../states/registry/ObjectStateValidatorRegistry";
import type {
	Camera,
	CanvasInitialSidebars,
	ScrollBoundsConfig,
} from "../CanvasTypes";
import type { CommandRegistry } from "../commands/CommandRegistry";
import type { GestureHandlerRegistry } from "../gestures/registry/GestureHandlerRegistry";
import type { ObjectTransformHandlesRegistry } from "../ui/controls/ObjectTransformHandlesRegistry";
import type { SelectionControlRegistry } from "../ui/controls/SelectionControlRegistry";
import type { ObjectTextEditLineBreaksRegistry } from "../ui/editors/ObjectTextEditLineBreaksRegistry";
import type { ObjectTextEditOverflowRegistry } from "../ui/editors/ObjectTextEditOverflowRegistry";
import type { ObjectMenuRegistry } from "../ui/menu/ObjectMenu/ObjectMenuRegistry";
import type { PropertyPanelRegistry } from "../ui/menu/PropertyPanel/PropertyPanelRegistry";

/**
 * The full set of UI registries a single `<Canvas>` instance operates against (see
 * `createCanvasRegistries`): the {@link ICanvasRegistries} contract, its `command`
 * narrowed to the real class, plus what the pure tree does not read.
 *
 * The doc validators are intentionally NOT part of this bundle: they are used only
 * during parse-time validation at the input boundary (before a `<Canvas>` exists),
 * so their registry is parser-scoped rather than canvas-scoped and is built by
 * `createCanvasParser`.
 */
export type CanvasRegistries = Omit<ICanvasRegistries, "command"> & {
	// --- State ---

	objectStateValidator: ObjectStateValidatorRegistry;

	// --- Drawing ---

	objectComponent: ObjectComponentRegistry;
	objectSvgDefs: ObjectSvgDefsRegistry;

	// --- Text ---

	/**
	 * Per-type measurers for a body the type lays out itself; a type without one is
	 * measured as plain text.
	 */
	objectTextMeasurer: ObjectTextMeasurerRegistry;
	objectTextEditOverflow: ObjectTextEditOverflowRegistry;
	objectTextEditLineBreaks: ObjectTextEditLineBreaksRegistry;

	// --- Interaction ---

	selectionControl: SelectionControlRegistry;
	objectTransformHandles: ObjectTransformHandlesRegistry;
	gestureHandler: GestureHandlerRegistry;

	// --- Commands / UI ---

	command: CommandRegistry;
	objectMenu: ObjectMenuRegistry;
	propertyPanel: PropertyPanelRegistry;
};

/**
 * The capability set passed to `createCanvasRegistries`: which object types,
 * commands, and plugins a `<Canvas>` operates against.
 *
 * All fields are optional; omitting them reproduces the full built-in set.
 * An object of a type `objectTypes` leaves out is held as an opaque object:
 * kept in place and written back on save, but not drawn (see `canvasToState`).
 */
export type CanvasCapabilities = {
	/** Enabled object types. Default: all registered types. */
	objectTypes?: ObjectType[];
	/** Enabled command ids. Default: all registered commands. */
	commands?: string[];
	/**
	 * Plugins applied in declared order after the built-ins
	 * (packages/canvas/docs/12-plugin-architecture.md). A type already claimed
	 * by a built-in or an earlier plugin throws at construction time.
	 */
	plugins?: readonly CanvasPlugin[];
};

/**
 * Mount-time configuration for `<Canvas initialConfig={...}>`: the capability
 * set (`CanvasCapabilities`) plus the view setup — where the camera starts, how
 * far it may be scrolled, and how the sidebars open. Read **once at mount** — the
 * configuration is part of a canvas's identity, so later changes are ignored; to
 * reconfigure, remount with a new React `key` (`<Canvas key={configId} .../>`).
 *
 * `autoFocus` is deliberately NOT here: it is a top-level `<Canvas>` prop,
 * following the React-idiomatic spelling that already signals mount-time intent.
 */
export type CanvasConfig = CanvasCapabilities & {
	/**
	 * Initial camera (pan + zoom) applied once at mount, so the first paint lands
	 * at the host's view (restore a saved view, …) instead of the doc default. To
	 * move the view after mount, use `ref.current.viewport.setViewport` — not this.
	 *
	 * Setting it also suppresses the document's own `view.open` framing, which is
	 * why a host with nothing better than a default should leave it out rather than
	 * pass one: omitted, the document decides; set, it does not get to.
	 */
	viewport?: Camera;
	/**
	 * Limits how far the canvas can be scrolled ({@link ScrollBoundsConfig}).
	 * `{ mode: "content" }` keeps the view over the area the objects occupy,
	 * growing and shrinking with them.
	 *
	 * Like `viewport`, setting it takes the decision away from the document: it
	 * suppresses the loaded document's own `view.scroll`, and the document's
	 * `view.padding` plays no part in the wall it puts up. Omitted, each document
	 * decides for itself, and one that declares nothing is the infinite canvas.
	 *
	 * The limit applies to the deliberate view scrolls — the wheel, the
	 * middle-/right-button grab pan and the one-finger touch pan — and to nothing
	 * else. Zooming, a camera set through `ref.current.viewport` (or `viewport`
	 * above), a container resize, and the scroll a drag carries with it (the wheel
	 * turned mid-drag, a drag held at the container edge) all move the view freely,
	 * outside the range included. A view left outside is never yanked back: it can
	 * only be scrolled back toward the range, never further away.
	 */
	scrollBounds?: ScrollBoundsConfig;
	/**
	 * How the chrome and the two sidebars start out ({@link CanvasInitialSidebars}),
	 * so a host can restore the form and the panels the user left. Every key is
	 * optional and a missing one takes its default: the chrome starts collapsed,
	 * an edge closed, a panel with every section expanded.
	 *
	 * Read once at mount and never again: the chrome is the user's from then on,
	 * and passing a new value does not move it. Its live state is reported
	 * through `onSidebarsChange` — read-only, so there is no controlled mode to
	 * feed it back into. Loading another document (a new `docLoadId` included)
	 * leaves the chrome as the user left it. The first paint already has the
	 * restored form, so restoring it does not move the camera.
	 */
	sidebars?: CanvasInitialSidebars;
};
