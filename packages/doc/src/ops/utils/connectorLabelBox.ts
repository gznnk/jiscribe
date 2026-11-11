import {
	CONNECTOR_LABEL_DEFAULTS,
	type ConnectorDoc,
} from "../../model/objects/connector/ConnectorDoc";
import { calcTextBlockSize } from "../../text/block/calcTextBlockSize";

/** The box a connector's label is drawn in (see calcTextBlockSize), or undefined without a label. */
export const measureLabelBox = (
	connector: ConnectorDoc,
): { width: number; height: number } | undefined => {
	const { label } = connector;
	if (label === undefined || label.text === "") {
		return undefined;
	}
	const border = (label.strokeWidth ?? 0) * 2;
	const { width, height } = calcTextBlockSize(label.text, {
		fontSize: label.fontSize ?? CONNECTOR_LABEL_DEFAULTS.fontSize,
		fontFamily: label.fontFamily ?? CONNECTOR_LABEL_DEFAULTS.fontFamily,
		fontWeight: label.fontWeight ?? CONNECTOR_LABEL_DEFAULTS.fontWeight,
	});
	return { width: width + border, height: height + border };
};
