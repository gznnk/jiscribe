import type { ObjectTypeDefinition } from "@workspace/canvas";
import {
	calcBelowLabelTextRegion,
	calcBelowLabelVisualBounds,
	createFrameObjectDefinition,
	createTypeStencils,
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
import type { ActorState } from "./state/actor/ActorState";
import type { BrowserWindowState } from "./state/browserWindow/BrowserWindowState";
import type { CloudState } from "./state/cloud/CloudState";
import type { EnvelopeState } from "./state/envelope/EnvelopeState";
import type { FileState } from "./state/file/FileState";
import type { FolderState } from "./state/folder/FolderState";
import type { GearState } from "./state/gear/GearState";
import type { LaptopState } from "./state/laptop/LaptopState";
import type { LockState } from "./state/lock/LockState";
import type { PackageState } from "./state/package/PackageState";
import type { QueueState } from "./state/queue/QueueState";
import type { ServerState } from "./state/server/ServerState";
import type { ShieldState } from "./state/shield/ShieldState";
import type { SmartphoneState } from "./state/smartphone/SmartphoneState";
import type { TerminalWindowState } from "./state/terminalWindow/TerminalWindowState";
import { ActorIcon } from "./stencil/ActorIcon";
import { BrowserWindowIcon } from "./stencil/BrowserWindowIcon";
import { CloudIcon } from "./stencil/CloudIcon";
import { EnvelopeIcon } from "./stencil/EnvelopeIcon";
import { FileIcon } from "./stencil/FileIcon";
import { FolderIcon } from "./stencil/FolderIcon";
import { GearIcon } from "./stencil/GearIcon";
import { LaptopIcon } from "./stencil/LaptopIcon";
import { LockIcon } from "./stencil/LockIcon";
import { PackageIcon } from "./stencil/PackageIcon";
import { QueueIcon } from "./stencil/QueueIcon";
import { ServerIcon } from "./stencil/ServerIcon";
import { ShieldIcon } from "./stencil/ShieldIcon";
import { SmartphoneIcon } from "./stencil/SmartphoneIcon";
import { TerminalWindowIcon } from "./stencil/TerminalWindowIcon";

/**
 * The label hangs below the geometry box, so `visualBounds` is what keeps
 * zoom-to-fit and the export viewBox from cropping it (calcBelowLabelVisualBounds).
 * `menu` stays undeclared, so it is derived from the features as before the move.
 */
export const actorDefinition: ObjectTypeDefinition<ActorDoc, ActorState> =
	createFrameObjectDefinition<ActorDoc, ActorState>({
		doc: actorDocDefinition,
		component: Actor,
		textRegion: calcBelowLabelTextRegion,
		visualBounds: calcBelowLabelVisualBounds,
		stencils: createTypeStencils({
			objectType: "actor",
			label: { en: "Actor", ja: "アクター" },
			icon: ActorIcon,
		}),
	});

/**
 * `outline` is what attaches a connector's center anchor to the bumpy silhouette
 * instead of the bounding box (cloudOutline). `menu` stays undeclared, so it is
 * derived from the features as before the move.
 */
export const cloudDefinition: ObjectTypeDefinition<CloudDoc, CloudState> =
	createFrameObjectDefinition<CloudDoc, CloudState>({
		doc: cloudDocDefinition,
		component: Cloud,
		textRegion: calcCloudTextRegion,
		outline: cloudOutline,
		stencils: createTypeStencils({
			objectType: "cloud",
			label: { en: "Cloud", ja: "雲" },
			icon: CloudIcon,
		}),
	});

/** Rack units fill the box, so the label hangs below it; `outline` rounds its corners. */
export const serverDefinition: ObjectTypeDefinition<ServerDoc, ServerState> =
	createFrameObjectDefinition<ServerDoc, ServerState>({
		doc: serverDocDefinition,
		component: Server,
		textRegion: calcBelowLabelTextRegion,
		visualBounds: calcBelowLabelVisualBounds,
		outline: serverOutline,
		stencils: createTypeStencils({
			objectType: "server",
			label: { en: "Server", ja: "サーバー" },
			icon: ServerIcon,
		}),
	});

/** Text goes in the content area under the title bar (calcWindowTextRegion). */
export const browserWindowDefinition: ObjectTypeDefinition<
	BrowserWindowDoc,
	BrowserWindowState
> = createFrameObjectDefinition<BrowserWindowDoc, BrowserWindowState>({
	doc: browserWindowDocDefinition,
	component: BrowserWindow,
	textRegion: calcWindowTextRegion,
	outline: browserWindowOutline,
	stencils: createTypeStencils({
		objectType: "browserWindow",
		label: { en: "Browser window", ja: "ブラウザ画面" },
		icon: BrowserWindowIcon,
	}),
});

/** Shares the browser's frame and therefore its text region. */
export const terminalWindowDefinition: ObjectTypeDefinition<
	TerminalWindowDoc,
	TerminalWindowState
> = createFrameObjectDefinition<TerminalWindowDoc, TerminalWindowState>({
	doc: terminalWindowDocDefinition,
	component: TerminalWindow,
	textRegion: calcWindowTextRegion,
	outline: terminalWindowOutline,
	stencils: createTypeStencils({
		objectType: "terminalWindow",
		label: { en: "Terminal", ja: "端末" },
		icon: TerminalWindowIcon,
	}),
});

/** `outline` puts a connector's center anchor on the tab's slanted edge. */
export const folderDefinition: ObjectTypeDefinition<FolderDoc, FolderState> =
	createFrameObjectDefinition<FolderDoc, FolderState>({
		doc: folderDocDefinition,
		component: Folder,
		textRegion: calcFolderTextRegion,
		outline: folderOutline,
		stencils: createTypeStencils({
			objectType: "folder",
			label: { en: "Folder", ja: "フォルダ" },
			icon: FolderIcon,
		}),
	});

/** `outline` puts a connector's center anchor on the folded corner's diagonal. */
export const fileDefinition: ObjectTypeDefinition<FileDoc, FileState> =
	createFrameObjectDefinition<FileDoc, FileState>({
		doc: fileDocDefinition,
		component: File,
		textRegion: calcFileTextRegion,
		outline: fileOutline,
		stencils: createTypeStencils({
			objectType: "file",
			label: { en: "File", ja: "ファイル" },
			icon: FileIcon,
		}),
	});

/**
 * The hexagon leaves every corner of the bounding box empty, so `outline` is
 * what keeps a connector from stopping in mid-air.
 */
export const packageDefinition: ObjectTypeDefinition<PackageDoc, PackageState> =
	createFrameObjectDefinition<PackageDoc, PackageState>({
		doc: packageDocDefinition,
		component: Package,
		textRegion: calcBelowLabelTextRegion,
		visualBounds: calcBelowLabelVisualBounds,
		outline: packageOutline,
		stencils: createTypeStencils({
			objectType: "package",
			label: { en: "Package", ja: "パッケージ" },
			icon: PackageIcon,
		}),
	});

/** The flap crosses the whole body, so the label hangs below the box. */
export const envelopeDefinition: ObjectTypeDefinition<
	EnvelopeDoc,
	EnvelopeState
> = createFrameObjectDefinition<EnvelopeDoc, EnvelopeState>({
	doc: envelopeDocDefinition,
	component: Envelope,
	textRegion: calcBelowLabelTextRegion,
	visualBounds: calcBelowLabelVisualBounds,
	outline: envelopeOutline,
	stencils: createTypeStencils({
		objectType: "envelope",
		label: { en: "Envelope", ja: "封筒" },
		icon: EnvelopeIcon,
	}),
});

/** The cells fill the box, so the label hangs below it. */
export const queueDefinition: ObjectTypeDefinition<QueueDoc, QueueState> =
	createFrameObjectDefinition<QueueDoc, QueueState>({
		doc: queueDocDefinition,
		component: Queue,
		textRegion: calcBelowLabelTextRegion,
		visualBounds: calcBelowLabelVisualBounds,
		outline: queueOutline,
		stencils: createTypeStencils({
			objectType: "queue",
			label: { en: "Queue", ja: "キュー" },
			icon: QueueIcon,
		}),
	});

/**
 * `outline` follows the teeth: the gear never reaches a corner of its box, so the
 * bounding box overshoots it by more than 40% on the diagonals (gearOutline).
 */
export const gearDefinition: ObjectTypeDefinition<GearDoc, GearState> =
	createFrameObjectDefinition<GearDoc, GearState>({
		doc: gearDocDefinition,
		component: Gear,
		textRegion: calcBelowLabelTextRegion,
		visualBounds: calcBelowLabelVisualBounds,
		outline: gearOutline,
		stencils: createTypeStencils({
			objectType: "gear",
			label: { en: "Gear", ja: "歯車" },
			icon: GearIcon,
		}),
	});

/**
 * The shackle encloses nothing, so there is no silhouette to copy; `outline`
 * traces the visible envelope instead — the body block with the arch on it
 * (lockOutline).
 */
export const lockDefinition: ObjectTypeDefinition<LockDoc, LockState> =
	createFrameObjectDefinition<LockDoc, LockState>({
		doc: lockDocDefinition,
		component: Lock,
		textRegion: calcBelowLabelTextRegion,
		visualBounds: calcBelowLabelVisualBounds,
		outline: lockOutline,
		stencils: createTypeStencils({
			objectType: "lock",
			label: { en: "Lock", ja: "錠" },
			icon: LockIcon,
		}),
	});

/** `outline` follows the taper, which leaves the bottom corners of the box empty. */
export const shieldDefinition: ObjectTypeDefinition<ShieldDoc, ShieldState> =
	createFrameObjectDefinition<ShieldDoc, ShieldState>({
		doc: shieldDocDefinition,
		component: Shield,
		textRegion: calcShieldTextRegion,
		outline: shieldOutline,
		stencils: createTypeStencils({
			objectType: "shield",
			label: { en: "Shield", ja: "盾" },
			icon: ShieldIcon,
		}),
	});

/** Text sits on the screen (calcSmartphoneTextRegion), inside the case. */
export const smartphoneDefinition: ObjectTypeDefinition<
	SmartphoneDoc,
	SmartphoneState
> = createFrameObjectDefinition<SmartphoneDoc, SmartphoneState>({
	doc: smartphoneDocDefinition,
	component: Smartphone,
	textRegion: calcSmartphoneTextRegion,
	outline: smartphoneOutline,
	stencils: createTypeStencils({
		objectType: "smartphone",
		label: { en: "Smartphone", ja: "スマートフォン" },
		icon: SmartphoneIcon,
	}),
});

/**
 * Text sits on the screen (calcLaptopTextRegion). The drawing is two pieces, but
 * their union is one closed polygon and only the base spans the full width, so
 * `outline` is what keeps a connector off the empty top corners (laptopOutline).
 */
export const laptopDefinition: ObjectTypeDefinition<LaptopDoc, LaptopState> =
	createFrameObjectDefinition<LaptopDoc, LaptopState>({
		doc: laptopDocDefinition,
		component: Laptop,
		textRegion: calcLaptopTextRegion,
		outline: laptopOutline,
		stencils: createTypeStencils({
			objectType: "laptop",
			label: { en: "Laptop", ja: "ノート PC" },
			icon: LaptopIcon,
		}),
	});
