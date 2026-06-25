import { objectDocValidatorRegistry } from "./ObjectDocValidatorRegistry";
import { StickyFeatures } from "../objects/annotations/sticky/StickyDoc";
import { validateStickyDoc } from "../objects/annotations/sticky/validateStickyDoc";
import { ConnectorFeatures } from "../objects/connections/connector/ConnectorDoc";
import { validateConnectorDoc } from "../objects/connections/connector/validateConnectorDoc";
import { DiamondFeatures } from "../objects/primitives/diamond/DiamondDoc";
import { validateDiamondDoc } from "../objects/primitives/diamond/validateDiamondDoc";
import { EllipseFeatures } from "../objects/primitives/ellipse/EllipseDoc";
import { validateEllipseDoc } from "../objects/primitives/ellipse/validateEllipseDoc";
import { GroupFeatures } from "../objects/primitives/group/GroupDoc";
import { validateGroupDoc } from "../objects/primitives/group/validateGroupDoc";
import { PolygonFeatures } from "../objects/primitives/polygon/PolygonDoc";
import { validatePolygonDoc } from "../objects/primitives/polygon/validatePolygonDoc";
import { PolylineFeatures } from "../objects/primitives/polyline/PolylineDoc";
import { validatePolylineDoc } from "../objects/primitives/polyline/validatePolylineDoc";
import { RectFeatures } from "../objects/primitives/rect/RectDoc";
import { validateRectDoc } from "../objects/primitives/rect/validateRectDoc";
import { SvgFeatures } from "../objects/primitives/svg/SvgDoc";
import { validateSvgDoc } from "../objects/primitives/svg/validateSvgDoc";

/**
 * 型ごとの doc バリデータと features を {@link objectDocValidatorRegistry} に登録する。
 *
 * これは「テキストを CanvasDoc にパース・検証するだけ」に必要な、スキーマ層だけで
 * 完結する初期化。React / @emotion などの UI 依存を一切取り込まないため、VSCode 拡張の
 * Node 側（パーサー専用エントリ `./parser`）からも安全に呼べる。
 *
 * UI 側（{@link import("../../controllers/setup/initializeObjectRegistry")}）は、
 * コンポーネント・ジェスチャ・メニューなどの他レジストリと併せてこの関数を呼ぶことで、
 * doc バリデータ登録の単一情報源をここに集約する。
 *
 * 新しいオブジェクト型を追加する場合は、ここへの登録も忘れないこと
 * （ここが空だと {@link import("../canvas/validators/validateSemantics").validateSemantics}
 * の接続可能性判定が全て false になり、誤検知が発生する）。
 */
export const initializeObjectDocValidatorRegistry = (): void => {
	objectDocValidatorRegistry.clear();
	objectDocValidatorRegistry.register("rect", validateRectDoc, RectFeatures);
	objectDocValidatorRegistry.register(
		"ellipse",
		validateEllipseDoc,
		EllipseFeatures,
	);
	objectDocValidatorRegistry.register(
		"diamond",
		validateDiamondDoc,
		DiamondFeatures,
	);
	objectDocValidatorRegistry.register("group", validateGroupDoc, GroupFeatures);
	objectDocValidatorRegistry.register(
		"polygon",
		validatePolygonDoc,
		PolygonFeatures,
	);
	objectDocValidatorRegistry.register(
		"polyline",
		validatePolylineDoc,
		PolylineFeatures,
	);
	objectDocValidatorRegistry.register(
		"connector",
		validateConnectorDoc,
		ConnectorFeatures,
	);
	objectDocValidatorRegistry.register(
		"sticky",
		validateStickyDoc,
		StickyFeatures,
	);
	objectDocValidatorRegistry.register("svg", validateSvgDoc, SvgFeatures);
};
