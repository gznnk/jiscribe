import type { SemanticDiagnostic } from "./types";
import type { ObjectDoc } from "../../objects/base/ObjectDoc";
import type { GroupDoc } from "../../objects/primitives/GroupDoc";
import type { CanvasDoc } from "../CanvasDoc";

export function validateSemantics(doc: CanvasDoc): SemanticDiagnostic[] {
	const errors: SemanticDiagnostic[] = [];
	const seenIds = new Set<string>();

	const traverse = (objects: ObjectDoc[], currentPath: string) => {
		objects.forEach((obj, index) => {
			const objPath = `${currentPath}[${index}]`;

			if (seenIds.has(obj.id)) {
				errors.push({
					path: objPath,
					message: `ID "${obj.id}" is duplicated.`,
					id: obj.id,
				});
			}
			seenIds.add(obj.id);

			if (obj.type === "group") {
				const group = obj as GroupDoc;
				if (group.children) {
					traverse(group.children, `${objPath}.children`);
				}
			}
		});
	};

	if (doc.root) {
		traverse(doc.root, "root");
	}

	if (doc.connectors) {
		doc.connectors.forEach((connector, index) => {
			const connPath = `connectors[${index}]`;

			if (seenIds.has(connector.id)) {
				errors.push({
					path: connPath,
					message: `Connector ID "${connector.id}" is duplicated.`,
					id: connector.id,
				});
			}
			seenIds.add(connector.id);

			if (connector.source?.owner?.id && !seenIds.has(connector.source.owner.id)) {
				errors.push({
					path: `${connPath}.source`,
					message: `Source target ID "${connector.source.owner.id}" does not exist.`,
					id: connector.source.owner.id,
				});
			}
			if (connector.target?.owner?.id && !seenIds.has(connector.target.owner.id)) {
				errors.push({
					path: `${connPath}.target`,
					message: `Target target ID "${connector.target.owner.id}" does not exist.`,
					id: connector.target.owner.id,
				});
			}
		});
	}

	return errors;
}
