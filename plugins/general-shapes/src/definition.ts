import type { ObjectTypeDefinition } from "@workspace/canvas";
import {
	calcBelowLabelTextRegion,
	calcBelowLabelVisualBounds,
	createFrameBehavior,
} from "@workspace/canvas-sdk";

import {
	actorDocDefinition,
	browserWindowDocDefinition,
	cloudDocDefinition,
	envelopeDocDefinition,
	fileDocDefinition,
	folderDocDefinition,
	gearDocDefinition,
	laptopDocDefinition,
	lockDocDefinition,
	packageDocDefinition,
	queueDocDefinition,
	serverDocDefinition,
	shieldDocDefinition,
	smartphoneDocDefinition,
	terminalWindowDocDefinition,
} from "./doc";
import { Actor } from "./presentation/Actor";
import {
	BrowserWindow,
	browserWindowOutline,
} from "./presentation/BrowserWindow";
import { Cloud, calcCloudTextRegion, cloudOutline } from "./presentation/Cloud";
import { Envelope, envelopeOutline } from "./presentation/Envelope";
import { File, calcFileTextRegion, fileOutline } from "./presentation/File";
import {
	Folder,
	calcFolderTextRegion,
	folderOutline,
} from "./presentation/Folder";
import { Gear, gearOutline } from "./presentation/Gear";
import {
	Laptop,
	calcLaptopTextRegion,
	laptopOutline,
} from "./presentation/Laptop";
import { Lock, lockOutline } from "./presentation/Lock";
import { Package, packageOutline } from "./presentation/Package";
import { Queue, queueOutline } from "./presentation/Queue";
import { Server, serverOutline } from "./presentation/Server";
import { calcWindowTextRegion } from "./presentation/shared";
import {
	Shield,
	calcShieldTextRegion,
	shieldOutline,
} from "./presentation/Shield";
import {
	Smartphone,
	calcSmartphoneTextRegion,
	smartphoneOutline,
} from "./presentation/Smartphone";
import {
	TerminalWindow,
	terminalWindowOutline,
} from "./presentation/TerminalWindow";
import type { ActorDoc } from "./schema/actor/ActorDoc";
import type { BrowserWindowDoc } from "./schema/browserWindow/BrowserWindowDoc";
import type { CloudDoc } from "./schema/cloud/CloudDoc";
import type { EnvelopeDoc } from "./schema/envelope/EnvelopeDoc";
import type { FileDoc } from "./schema/file/FileDoc";
import type { FolderDoc } from "./schema/folder/FolderDoc";
import type { GearDoc } from "./schema/gear/GearDoc";
import type { LaptopDoc } from "./schema/laptop/LaptopDoc";
import type { LockDoc } from "./schema/lock/LockDoc";
import type { PackageDoc } from "./schema/package/PackageDoc";
import type { QueueDoc } from "./schema/queue/QueueDoc";
import type { ServerDoc } from "./schema/server/ServerDoc";
import type { ShieldDoc } from "./schema/shield/ShieldDoc";
import type { SmartphoneDoc } from "./schema/smartphone/SmartphoneDoc";
import type { TerminalWindowDoc } from "./schema/terminalWindow/TerminalWindowDoc";
import { actorToDoc, actorToState } from "./state/actor/ActorMapper";
import type { ActorState } from "./state/actor/ActorState";
import { isValidActorState } from "./state/actor/validateActorState";
import {
	browserWindowToDoc,
	browserWindowToState,
} from "./state/browserWindow/BrowserWindowMapper";
import type { BrowserWindowState } from "./state/browserWindow/BrowserWindowState";
import { isValidBrowserWindowState } from "./state/browserWindow/validateBrowserWindowState";
import { cloudToDoc, cloudToState } from "./state/cloud/CloudMapper";
import type { CloudState } from "./state/cloud/CloudState";
import { isValidCloudState } from "./state/cloud/validateCloudState";
import {
	envelopeToDoc,
	envelopeToState,
} from "./state/envelope/EnvelopeMapper";
import type { EnvelopeState } from "./state/envelope/EnvelopeState";
import { isValidEnvelopeState } from "./state/envelope/validateEnvelopeState";
import { fileToDoc, fileToState } from "./state/file/FileMapper";
import type { FileState } from "./state/file/FileState";
import { isValidFileState } from "./state/file/validateFileState";
import { folderToDoc, folderToState } from "./state/folder/FolderMapper";
import type { FolderState } from "./state/folder/FolderState";
import { isValidFolderState } from "./state/folder/validateFolderState";
import { gearToDoc, gearToState } from "./state/gear/GearMapper";
import type { GearState } from "./state/gear/GearState";
import { isValidGearState } from "./state/gear/validateGearState";
import { laptopToDoc, laptopToState } from "./state/laptop/LaptopMapper";
import type { LaptopState } from "./state/laptop/LaptopState";
import { isValidLaptopState } from "./state/laptop/validateLaptopState";
import { lockToDoc, lockToState } from "./state/lock/LockMapper";
import type { LockState } from "./state/lock/LockState";
import { isValidLockState } from "./state/lock/validateLockState";
import { packageToDoc, packageToState } from "./state/package/PackageMapper";
import type { PackageState } from "./state/package/PackageState";
import { isValidPackageState } from "./state/package/validatePackageState";
import { queueToDoc, queueToState } from "./state/queue/QueueMapper";
import type { QueueState } from "./state/queue/QueueState";
import { isValidQueueState } from "./state/queue/validateQueueState";
import { serverToDoc, serverToState } from "./state/server/ServerMapper";
import type { ServerState } from "./state/server/ServerState";
import { isValidServerState } from "./state/server/validateServerState";
import { shieldToDoc, shieldToState } from "./state/shield/ShieldMapper";
import type { ShieldState } from "./state/shield/ShieldState";
import { isValidShieldState } from "./state/shield/validateShieldState";
import {
	smartphoneToDoc,
	smartphoneToState,
} from "./state/smartphone/SmartphoneMapper";
import type { SmartphoneState } from "./state/smartphone/SmartphoneState";
import { isValidSmartphoneState } from "./state/smartphone/validateSmartphoneState";
import {
	terminalWindowToDoc,
	terminalWindowToState,
} from "./state/terminalWindow/TerminalWindowMapper";
import type { TerminalWindowState } from "./state/terminalWindow/TerminalWindowState";
import { isValidTerminalWindowState } from "./state/terminalWindow/validateTerminalWindowState";
import { ActorStencils } from "./stencil/ActorStencils";
import { BrowserWindowStencils } from "./stencil/BrowserWindowStencils";
import { CloudStencils } from "./stencil/CloudStencils";
import { EnvelopeStencils } from "./stencil/EnvelopeStencils";
import { FileStencils } from "./stencil/FileStencils";
import { FolderStencils } from "./stencil/FolderStencils";
import { GearStencils } from "./stencil/GearStencils";
import { LaptopStencils } from "./stencil/LaptopStencils";
import { LockStencils } from "./stencil/LockStencils";
import { PackageStencils } from "./stencil/PackageStencils";
import { QueueStencils } from "./stencil/QueueStencils";
import { ServerStencils } from "./stencil/ServerStencils";
import { ShieldStencils } from "./stencil/ShieldStencils";
import { SmartphoneStencils } from "./stencil/SmartphoneStencils";
import { TerminalWindowStencils } from "./stencil/TerminalWindowStencils";

/**
 * The label hangs below the geometry box, so `visualBounds` is what keeps
 * zoom-to-fit and the export viewBox from cropping it (calcBelowLabelVisualBounds).
 * `menu` stays undeclared, so it is derived from the features as before the move.
 */
export const actorDefinition: ObjectTypeDefinition<ActorDoc, ActorState> = {
	...actorDocDefinition,
	mapper: { toDoc: actorToDoc, toState: actorToState },
	stateValidator: isValidActorState,
	component: Actor,
	textRegion: calcBelowLabelTextRegion,
	visualBounds: calcBelowLabelVisualBounds,
	behavior: createFrameBehavior<ActorState>(),
	stencils: ActorStencils,
};

/**
 * `outline` is what attaches a connector's center anchor to the bumpy silhouette
 * instead of the bounding box (cloudOutline). `menu` stays undeclared, so it is
 * derived from the features as before the move.
 */
export const cloudDefinition: ObjectTypeDefinition<CloudDoc, CloudState> = {
	...cloudDocDefinition,
	mapper: { toDoc: cloudToDoc, toState: cloudToState },
	stateValidator: isValidCloudState,
	component: Cloud,
	textRegion: calcCloudTextRegion,
	outline: cloudOutline,
	behavior: createFrameBehavior<CloudState>(),
	stencils: CloudStencils,
};

/** Rack units fill the box, so the label hangs below it; `outline` rounds its corners. */
export const serverDefinition: ObjectTypeDefinition<ServerDoc, ServerState> = {
	...serverDocDefinition,
	mapper: { toDoc: serverToDoc, toState: serverToState },
	stateValidator: isValidServerState,
	component: Server,
	textRegion: calcBelowLabelTextRegion,
	visualBounds: calcBelowLabelVisualBounds,
	outline: serverOutline,
	behavior: createFrameBehavior<ServerState>(),
	stencils: ServerStencils,
};

/** Text goes in the content area under the title bar (calcWindowTextRegion). */
export const browserWindowDefinition: ObjectTypeDefinition<
	BrowserWindowDoc,
	BrowserWindowState
> = {
	...browserWindowDocDefinition,
	mapper: { toDoc: browserWindowToDoc, toState: browserWindowToState },
	stateValidator: isValidBrowserWindowState,
	component: BrowserWindow,
	textRegion: calcWindowTextRegion,
	outline: browserWindowOutline,
	behavior: createFrameBehavior<BrowserWindowState>(),
	stencils: BrowserWindowStencils,
};

/** Shares the browser's frame and therefore its text region. */
export const terminalWindowDefinition: ObjectTypeDefinition<
	TerminalWindowDoc,
	TerminalWindowState
> = {
	...terminalWindowDocDefinition,
	mapper: { toDoc: terminalWindowToDoc, toState: terminalWindowToState },
	stateValidator: isValidTerminalWindowState,
	component: TerminalWindow,
	textRegion: calcWindowTextRegion,
	outline: terminalWindowOutline,
	behavior: createFrameBehavior<TerminalWindowState>(),
	stencils: TerminalWindowStencils,
};

/** `outline` puts a connector's center anchor on the tab's slanted edge. */
export const folderDefinition: ObjectTypeDefinition<FolderDoc, FolderState> = {
	...folderDocDefinition,
	mapper: { toDoc: folderToDoc, toState: folderToState },
	stateValidator: isValidFolderState,
	component: Folder,
	textRegion: calcFolderTextRegion,
	outline: folderOutline,
	behavior: createFrameBehavior<FolderState>(),
	stencils: FolderStencils,
};

/** `outline` puts a connector's center anchor on the folded corner's diagonal. */
export const fileDefinition: ObjectTypeDefinition<FileDoc, FileState> = {
	...fileDocDefinition,
	mapper: { toDoc: fileToDoc, toState: fileToState },
	stateValidator: isValidFileState,
	component: File,
	textRegion: calcFileTextRegion,
	outline: fileOutline,
	behavior: createFrameBehavior<FileState>(),
	stencils: FileStencils,
};

/**
 * The hexagon leaves every corner of the bounding box empty, so `outline` is
 * what keeps a connector from stopping in mid-air.
 */
export const packageDefinition: ObjectTypeDefinition<PackageDoc, PackageState> =
	{
		...packageDocDefinition,
		mapper: { toDoc: packageToDoc, toState: packageToState },
		stateValidator: isValidPackageState,
		component: Package,
		textRegion: calcBelowLabelTextRegion,
		visualBounds: calcBelowLabelVisualBounds,
		outline: packageOutline,
		behavior: createFrameBehavior<PackageState>(),
		stencils: PackageStencils,
	};

/** The flap crosses the whole body, so the label hangs below the box. */
export const envelopeDefinition: ObjectTypeDefinition<
	EnvelopeDoc,
	EnvelopeState
> = {
	...envelopeDocDefinition,
	mapper: { toDoc: envelopeToDoc, toState: envelopeToState },
	stateValidator: isValidEnvelopeState,
	component: Envelope,
	textRegion: calcBelowLabelTextRegion,
	visualBounds: calcBelowLabelVisualBounds,
	outline: envelopeOutline,
	behavior: createFrameBehavior<EnvelopeState>(),
	stencils: EnvelopeStencils,
};

/** The cells fill the box, so the label hangs below it. */
export const queueDefinition: ObjectTypeDefinition<QueueDoc, QueueState> = {
	...queueDocDefinition,
	mapper: { toDoc: queueToDoc, toState: queueToState },
	stateValidator: isValidQueueState,
	component: Queue,
	textRegion: calcBelowLabelTextRegion,
	visualBounds: calcBelowLabelVisualBounds,
	outline: queueOutline,
	behavior: createFrameBehavior<QueueState>(),
	stencils: QueueStencils,
};

/**
 * `outline` follows the teeth: the gear never reaches a corner of its box, so the
 * bounding box overshoots it by more than 40% on the diagonals (gearOutline).
 */
export const gearDefinition: ObjectTypeDefinition<GearDoc, GearState> = {
	...gearDocDefinition,
	mapper: { toDoc: gearToDoc, toState: gearToState },
	stateValidator: isValidGearState,
	component: Gear,
	textRegion: calcBelowLabelTextRegion,
	visualBounds: calcBelowLabelVisualBounds,
	outline: gearOutline,
	behavior: createFrameBehavior<GearState>(),
	stencils: GearStencils,
};

/**
 * The shackle encloses nothing, so there is no silhouette to copy; `outline`
 * traces the visible envelope instead — the body block with the arch on it
 * (lockOutline).
 */
export const lockDefinition: ObjectTypeDefinition<LockDoc, LockState> = {
	...lockDocDefinition,
	mapper: { toDoc: lockToDoc, toState: lockToState },
	stateValidator: isValidLockState,
	component: Lock,
	textRegion: calcBelowLabelTextRegion,
	visualBounds: calcBelowLabelVisualBounds,
	outline: lockOutline,
	behavior: createFrameBehavior<LockState>(),
	stencils: LockStencils,
};

/** `outline` follows the taper, which leaves the bottom corners of the box empty. */
export const shieldDefinition: ObjectTypeDefinition<ShieldDoc, ShieldState> = {
	...shieldDocDefinition,
	mapper: { toDoc: shieldToDoc, toState: shieldToState },
	stateValidator: isValidShieldState,
	component: Shield,
	textRegion: calcShieldTextRegion,
	outline: shieldOutline,
	behavior: createFrameBehavior<ShieldState>(),
	stencils: ShieldStencils,
};

/** Text sits on the screen (calcSmartphoneTextRegion), inside the case. */
export const smartphoneDefinition: ObjectTypeDefinition<
	SmartphoneDoc,
	SmartphoneState
> = {
	...smartphoneDocDefinition,
	mapper: { toDoc: smartphoneToDoc, toState: smartphoneToState },
	stateValidator: isValidSmartphoneState,
	component: Smartphone,
	textRegion: calcSmartphoneTextRegion,
	outline: smartphoneOutline,
	behavior: createFrameBehavior<SmartphoneState>(),
	stencils: SmartphoneStencils,
};

/**
 * Text sits on the screen (calcLaptopTextRegion). The drawing is two pieces, but
 * their union is one closed polygon and only the base spans the full width, so
 * `outline` is what keeps a connector off the empty top corners (laptopOutline).
 */
export const laptopDefinition: ObjectTypeDefinition<LaptopDoc, LaptopState> = {
	...laptopDocDefinition,
	mapper: { toDoc: laptopToDoc, toState: laptopToState },
	stateValidator: isValidLaptopState,
	component: Laptop,
	textRegion: calcLaptopTextRegion,
	outline: laptopOutline,
	behavior: createFrameBehavior<LaptopState>(),
	stencils: LaptopStencils,
};
