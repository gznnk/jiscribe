// 汎用ピクトグラムの外部パッケージ。収載の線引きは「記法に属さない、実物・人・場を
// 表す図形」で、flowchart / UML のような特定記法の語彙（それぞれ専用パッケージ）とも、
// 装飾系（star / heart / バナー等。図に意味を足さない）とも分ける。core 残留はゼロ
// （generalToolbarEntry も全図形をここから供給する）。
// schema/** の headless 部品 (createFrameObjectFactory / createFrameDocValidator /
// AUTO_COLOR / DEFAULT_FONT_FAMILY) は `@workspace/canvas/unstable-doc`、presentation /
// state 部品 (createFrameObject / createFrameBehavior / createFrameMapper /
// createFrameStateValidator / measureTextWidth / calcVisualLineCount / readTextSlot /
// OUTLINE_CURVE_SEGMENTS / centeredPolygonOutline) は `@workspace/canvas/unstable`
// 経由。headless な parse 入口は ./doc (generalDocPlugin)。
// 図形は 1 図形 1 フォルダ（schema/<id>/ ・ state/<id>/ ・ presentation/<Pascal>/）で、
// 複数図形が共有する部品は各層の shared/ に置く。
// (docs/05_extensibility/plugin-architecture-requirements.md 参照)。
export * from "./schema/actor/ActorDoc";
export { ActorObjectFactory } from "./schema/actor/ActorObjectFactory";
export { validateActorDoc } from "./schema/actor/validateActorDoc";
export * from "./schema/browserWindow/BrowserWindowDoc";
export { BrowserWindowObjectFactory } from "./schema/browserWindow/BrowserWindowObjectFactory";
export { validateBrowserWindowDoc } from "./schema/browserWindow/validateBrowserWindowDoc";
export * from "./schema/cloud/CloudDoc";
export { CloudObjectFactory } from "./schema/cloud/CloudObjectFactory";
export { validateCloudDoc } from "./schema/cloud/validateCloudDoc";
export * from "./schema/envelope/EnvelopeDoc";
export { EnvelopeObjectFactory } from "./schema/envelope/EnvelopeObjectFactory";
export { validateEnvelopeDoc } from "./schema/envelope/validateEnvelopeDoc";
export * from "./schema/file/FileDoc";
export { FileObjectFactory } from "./schema/file/FileObjectFactory";
export { validateFileDoc } from "./schema/file/validateFileDoc";
export * from "./schema/folder/FolderDoc";
export { FolderObjectFactory } from "./schema/folder/FolderObjectFactory";
export { validateFolderDoc } from "./schema/folder/validateFolderDoc";
export * from "./schema/gear/GearDoc";
export { GearObjectFactory } from "./schema/gear/GearObjectFactory";
export { validateGearDoc } from "./schema/gear/validateGearDoc";
export * from "./schema/laptop/LaptopDoc";
export { LaptopObjectFactory } from "./schema/laptop/LaptopObjectFactory";
export { validateLaptopDoc } from "./schema/laptop/validateLaptopDoc";
export * from "./schema/lock/LockDoc";
export { LockObjectFactory } from "./schema/lock/LockObjectFactory";
export { validateLockDoc } from "./schema/lock/validateLockDoc";
export * from "./schema/package/PackageDoc";
export { PackageObjectFactory } from "./schema/package/PackageObjectFactory";
export { validatePackageDoc } from "./schema/package/validatePackageDoc";
export * from "./schema/queue/QueueDoc";
export { QueueObjectFactory } from "./schema/queue/QueueObjectFactory";
export { validateQueueDoc } from "./schema/queue/validateQueueDoc";
export * from "./schema/server/ServerDoc";
export { ServerObjectFactory } from "./schema/server/ServerObjectFactory";
export { validateServerDoc } from "./schema/server/validateServerDoc";
export * from "./schema/shield/ShieldDoc";
export { ShieldObjectFactory } from "./schema/shield/ShieldObjectFactory";
export { validateShieldDoc } from "./schema/shield/validateShieldDoc";
export * from "./schema/smartphone/SmartphoneDoc";
export { SmartphoneObjectFactory } from "./schema/smartphone/SmartphoneObjectFactory";
export { validateSmartphoneDoc } from "./schema/smartphone/validateSmartphoneDoc";
export * from "./schema/terminalWindow/TerminalWindowDoc";
export { TerminalWindowObjectFactory } from "./schema/terminalWindow/TerminalWindowObjectFactory";
export { validateTerminalWindowDoc } from "./schema/terminalWindow/validateTerminalWindowDoc";

export * from "./state/actor/ActorState";
export { actorToDoc, actorToState } from "./state/actor/ActorMapper";
export { isValidActorState } from "./state/actor/validateActorState";
export * from "./state/browserWindow/BrowserWindowState";
export {
	browserWindowToDoc,
	browserWindowToState,
} from "./state/browserWindow/BrowserWindowMapper";
export { isValidBrowserWindowState } from "./state/browserWindow/validateBrowserWindowState";
export * from "./state/cloud/CloudState";
export { cloudToDoc, cloudToState } from "./state/cloud/CloudMapper";
export { isValidCloudState } from "./state/cloud/validateCloudState";
export * from "./state/envelope/EnvelopeState";
export {
	envelopeToDoc,
	envelopeToState,
} from "./state/envelope/EnvelopeMapper";
export { isValidEnvelopeState } from "./state/envelope/validateEnvelopeState";
export * from "./state/file/FileState";
export { fileToDoc, fileToState } from "./state/file/FileMapper";
export { isValidFileState } from "./state/file/validateFileState";
export * from "./state/folder/FolderState";
export { folderToDoc, folderToState } from "./state/folder/FolderMapper";
export { isValidFolderState } from "./state/folder/validateFolderState";
export * from "./state/gear/GearState";
export { gearToDoc, gearToState } from "./state/gear/GearMapper";
export { isValidGearState } from "./state/gear/validateGearState";
export * from "./state/laptop/LaptopState";
export { laptopToDoc, laptopToState } from "./state/laptop/LaptopMapper";
export { isValidLaptopState } from "./state/laptop/validateLaptopState";
export * from "./state/lock/LockState";
export { lockToDoc, lockToState } from "./state/lock/LockMapper";
export { isValidLockState } from "./state/lock/validateLockState";
export * from "./state/package/PackageState";
export { packageToDoc, packageToState } from "./state/package/PackageMapper";
export { isValidPackageState } from "./state/package/validatePackageState";
export * from "./state/queue/QueueState";
export { queueToDoc, queueToState } from "./state/queue/QueueMapper";
export { isValidQueueState } from "./state/queue/validateQueueState";
export * from "./state/server/ServerState";
export { serverToDoc, serverToState } from "./state/server/ServerMapper";
export { isValidServerState } from "./state/server/validateServerState";
export * from "./state/shield/ShieldState";
export { shieldToDoc, shieldToState } from "./state/shield/ShieldMapper";
export { isValidShieldState } from "./state/shield/validateShieldState";
export * from "./state/smartphone/SmartphoneState";
export {
	smartphoneToDoc,
	smartphoneToState,
} from "./state/smartphone/SmartphoneMapper";
export { isValidSmartphoneState } from "./state/smartphone/validateSmartphoneState";
export * from "./state/terminalWindow/TerminalWindowState";
export {
	terminalWindowToDoc,
	terminalWindowToState,
} from "./state/terminalWindow/TerminalWindowMapper";
export { isValidTerminalWindowState } from "./state/terminalWindow/validateTerminalWindowState";

export * from "./presentation/Actor";
export * from "./presentation/BrowserWindow";
export * from "./presentation/Cloud";
export * from "./presentation/Envelope";
export * from "./presentation/File";
export * from "./presentation/Folder";
export * from "./presentation/Gear";
export * from "./presentation/Laptop";
export * from "./presentation/Lock";
export * from "./presentation/Package";
export * from "./presentation/Queue";
export * from "./presentation/Server";
export * from "./presentation/Shield";
export * from "./presentation/Smartphone";
export * from "./presentation/TerminalWindow";
export * from "./presentation/shared";

export { ActorStencils } from "./stencil/ActorStencils";
export { BrowserWindowStencils } from "./stencil/BrowserWindowStencils";
export { CloudStencils } from "./stencil/CloudStencils";
export { EnvelopeStencils } from "./stencil/EnvelopeStencils";
export { FileStencils } from "./stencil/FileStencils";
export { FolderStencils } from "./stencil/FolderStencils";
export { GearStencils } from "./stencil/GearStencils";
export { LaptopStencils } from "./stencil/LaptopStencils";
export { LockStencils } from "./stencil/LockStencils";
export { PackageStencils } from "./stencil/PackageStencils";
export { QueueStencils } from "./stencil/QueueStencils";
export { ServerStencils } from "./stencil/ServerStencils";
export { ShieldStencils } from "./stencil/ShieldStencils";
export { SmartphoneStencils } from "./stencil/SmartphoneStencils";
export { TerminalWindowStencils } from "./stencil/TerminalWindowStencils";
export { generalToolbarEntry } from "./stencil/GeneralToolbarEntry";

export {
	actorDefinition,
	browserWindowDefinition,
	cloudDefinition,
	envelopeDefinition,
	fileDefinition,
	folderDefinition,
	gearDefinition,
	laptopDefinition,
	lockDefinition,
	packageDefinition,
	queueDefinition,
	serverDefinition,
	shieldDefinition,
	smartphoneDefinition,
	terminalWindowDefinition,
} from "./definition";
export {
	actorDocDefinition,
	browserWindowDocDefinition,
	cloudDocDefinition,
	envelopeDocDefinition,
	fileDocDefinition,
	folderDocDefinition,
	gearDocDefinition,
	generalDocPlugin,
	laptopDocDefinition,
	lockDocDefinition,
	packageDocDefinition,
	queueDocDefinition,
	serverDocDefinition,
	shieldDocDefinition,
	smartphoneDocDefinition,
	terminalWindowDocDefinition,
} from "./doc";
export { generalPlugin } from "./plugin";
