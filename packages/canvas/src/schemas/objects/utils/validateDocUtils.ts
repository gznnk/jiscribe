import {
	isCssSafeValue,
	isNumber,
	isString,
} from "@workspace/basic-validators";

import type { SemanticDiagnostic } from "../../canvas/validators/types";
import { isArrowType } from "../types/ArrowType";
import { isConnectPointId } from "../types/EndpointRef";
import { isPoly } from "../types/Poly";
import { isStrokeDashType } from "../types/StrokeDashType";
import { isTextAlign } from "../types/TextAlign";
import { isTextType } from "../types/TextType";
import { isVerticalAlign } from "../types/VerticalAlign";

export function validatePolyFields(
	o: Record<string, unknown>,
	path: string,
): SemanticDiagnostic[] {
	if (!isPoly(o)) {
		return [
			{ path: `${path}.points`, message: "must be a valid points array" },
		];
	}
	if (o.points.length < 2) {
		return [{ path: `${path}.points`, message: "must have at least 2 points" }];
	}
	return [];
}

/**
 * Connector の points（中間経由点）を検証する。
 * 端点座標は source/target の EndpointRef が持つため、
 * polyline/polygon と異なり空配列（= 直線コネクター）を許容する。
 */
export function validateWaypointFields(
	o: Record<string, unknown>,
	path: string,
): SemanticDiagnostic[] {
	if (!isPoly(o)) {
		return [
			{ path: `${path}.points`, message: "must be a valid points array" },
		];
	}
	return [];
}

export function validateEndpointRef(
	ref: unknown,
	path: string,
): SemanticDiagnostic[] {
	if (typeof ref !== "object" || ref === null) {
		return [];
	}
	const r = ref as Record<string, unknown>;

	// owner の有無で OwnedEndpointRef / FreeEndpointRef を判別
	const hasOwner = "owner" in r && r.owner != null;
	return hasOwner
		? validateOwnedEndpointRef(r, path)
		: validateFreeEndpointRef(r, path);
}

function validateOwnedEndpointRef(
	r: Record<string, unknown>,
	path: string,
): SemanticDiagnostic[] {
	const errors: SemanticDiagnostic[] = [];

	if (typeof r.owner !== "object") {
		errors.push({ path: `${path}.owner`, message: "must be an object" });
	} else {
		const owner = r.owner as Record<string, unknown>;
		if (!isString(owner.id)) {
			errors.push({ path: `${path}.owner.id`, message: "must be a string" });
		}
		if (!isString(owner.type)) {
			errors.push({ path: `${path}.owner.type`, message: "must be a string" });
		}
	}

	errors.push(...validateNonFreeAnchor(r.anchor, path));
	return errors;
}

function validateFreeEndpointRef(
	r: Record<string, unknown>,
	path: string,
): SemanticDiagnostic[] {
	return validateFreeAnchor(r.anchor, path);
}

function validateNonFreeAnchor(
	anchor: unknown,
	path: string,
): SemanticDiagnostic[] {
	if (typeof anchor !== "object" || anchor === null) {
		return [{ path: `${path}.anchor`, message: "must be an object" }];
	}

	const a = anchor as Record<string, unknown>;
	if (a.kind === "center") {
		return [];
	}
	if (a.kind === "connectPoint") {
		if (!isConnectPointId(a.id)) {
			return [
				{
					path: `${path}.anchor.id`,
					message: "must be a valid ConnectPointId",
				},
			];
		}
		return [];
	}
	return [
		{
			path: `${path}.anchor.kind`,
			message: "must be 'center' or 'connectPoint' for owned endpoint",
		},
	];
}

function validateFreeAnchor(
	anchor: unknown,
	path: string,
): SemanticDiagnostic[] {
	if (typeof anchor !== "object" || anchor === null) {
		return [{ path: `${path}.anchor`, message: "must be an object" }];
	}

	const a = anchor as Record<string, unknown>;
	if (a.kind !== "free") {
		return [
			{
				path: `${path}.anchor.kind`,
				message: "must be 'free' for free endpoint",
			},
		];
	}

	const errors: SemanticDiagnostic[] = [];
	if (typeof a.point !== "object" || a.point === null) {
		errors.push({ path: `${path}.anchor.point`, message: "must be an object" });
	} else {
		const p = a.point as Record<string, unknown>;
		if (!isNumber(p.x)) {
			errors.push({
				path: `${path}.anchor.point.x`,
				message: "must be a number",
			});
		}
		if (!isNumber(p.y)) {
			errors.push({
				path: `${path}.anchor.point.y`,
				message: "must be a number",
			});
		}
	}
	return errors;
}

export function validateTransformFields(
	o: Record<string, unknown>,
	path: string,
): SemanticDiagnostic[] {
	const errors: SemanticDiagnostic[] = [];
	if ("rotation" in o && !isNumber(o.rotation)) {
		errors.push({ path: `${path}.rotation`, message: "must be a number" });
	}
	if ("flipX" in o && typeof o.flipX !== "boolean") {
		errors.push({ path: `${path}.flipX`, message: "must be a boolean" });
	}
	if ("flipY" in o && typeof o.flipY !== "boolean") {
		errors.push({ path: `${path}.flipY`, message: "must be a boolean" });
	}
	return errors;
}

export function validateStrokeStyleFields(
	o: Record<string, unknown>,
	path: string,
): SemanticDiagnostic[] {
	const errors: SemanticDiagnostic[] = [];
	if ("stroke" in o && !isCssSafeValue(o.stroke)) {
		errors.push({
			path: `${path}.stroke`,
			message: "must be a safe CSS color value",
			beyondSchema: true,
		});
	}
	if ("strokeWidth" in o && !isNumber(o.strokeWidth)) {
		errors.push({ path: `${path}.strokeWidth`, message: "must be a number" });
	}
	if ("strokeDashType" in o && !isStrokeDashType(o.strokeDashType)) {
		errors.push({
			path: `${path}.strokeDashType`,
			message: "must be one of: solid, dashed, dotted",
		});
	}
	return errors;
}

export function validateFillStyleFields(
	o: Record<string, unknown>,
	path: string,
): SemanticDiagnostic[] {
	const errors: SemanticDiagnostic[] = [];
	if ("fill" in o && !isCssSafeValue(o.fill)) {
		errors.push({
			path: `${path}.fill`,
			message: "must be a safe CSS color value",
			beyondSchema: true,
		});
	}
	return errors;
}

export function validateTextStyleFields(
	o: Record<string, unknown>,
	path: string,
): SemanticDiagnostic[] {
	const errors: SemanticDiagnostic[] = [];
	if ("text" in o && !isString(o.text)) {
		errors.push({ path: `${path}.text`, message: "must be a string" });
	}
	if ("textType" in o && !isTextType(o.textType)) {
		errors.push({
			path: `${path}.textType`,
			message: "must be one of: text, markdown",
		});
	}
	if ("textAlign" in o && !isTextAlign(o.textAlign)) {
		errors.push({
			path: `${path}.textAlign`,
			message: "must be one of: left, center, right",
		});
	}
	if ("verticalAlign" in o && !isVerticalAlign(o.verticalAlign)) {
		errors.push({
			path: `${path}.verticalAlign`,
			message: "must be one of: top, middle, bottom",
		});
	}
	if ("fontColor" in o && !isCssSafeValue(o.fontColor)) {
		errors.push({
			path: `${path}.fontColor`,
			message: "must be a safe CSS color value",
			beyondSchema: true,
		});
	}
	if ("fontSize" in o && !isNumber(o.fontSize)) {
		errors.push({ path: `${path}.fontSize`, message: "must be a number" });
	}
	if ("fontFamily" in o && !isCssSafeValue(o.fontFamily)) {
		errors.push({
			path: `${path}.fontFamily`,
			message: "must be a safe CSS font-family value",
			beyondSchema: true,
		});
	}
	if ("fontWeight" in o && !isCssSafeValue(o.fontWeight)) {
		errors.push({
			path: `${path}.fontWeight`,
			message: "must be a safe CSS font-weight value",
			beyondSchema: true,
		});
	}
	return errors;
}

export function validateRadiusStyleFields(
	o: Record<string, unknown>,
	path: string,
): SemanticDiagnostic[] {
	const errors: SemanticDiagnostic[] = [];
	if ("rx" in o && !isNumber(o.rx)) {
		errors.push({ path: `${path}.rx`, message: "must be a number" });
	}
	return errors;
}

export function validateArrowFields(
	o: Record<string, unknown>,
	path: string,
): SemanticDiagnostic[] {
	const errors: SemanticDiagnostic[] = [];
	if ("startArrow" in o && !isArrowType(o.startArrow)) {
		errors.push({
			path: `${path}.startArrow`,
			message: "must be a valid ArrowType",
		});
	}
	if ("endArrow" in o && !isArrowType(o.endArrow)) {
		errors.push({
			path: `${path}.endArrow`,
			message: "must be a valid ArrowType",
		});
	}
	return errors;
}
