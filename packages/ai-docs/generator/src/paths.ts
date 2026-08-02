import { fileURLToPath } from "node:url";

/** Absolute path of a template file under generator/templates/. */
export function templatePath(fileName: string): string {
	return fileURLToPath(new URL(`../templates/${fileName}`, import.meta.url));
}

/** Absolute path under assets/, the canonical output directory of this package. */
export function assetsPath(fileName: string): string {
	return fileURLToPath(new URL(`../../assets/${fileName}`, import.meta.url));
}
