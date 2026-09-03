import type { Ajv2020, ErrorObject, ValidateFunction } from "ajv/dist/2020";

/** The slice of the official schema this fold reads: the object union and its branches. */
export type ObjectUnionSchema = {
	$id?: string;
	$defs?: Record<
		string,
		{
			oneOf?: { $ref?: string }[];
			properties?: { type?: { const?: unknown } };
		}
	>;
};

/** Validator for the one union branch a `type` value names, or undefined for an unknown type. */
export type ObjectBranchResolver = (
	typeName: string,
) => ValidateFunction | undefined;

/**
 * The union every placeable object is checked against. `GroupChildDoc` is the same
 * list minus `ConnectorDoc`, so resolving against this one covers both positions;
 * a connector written into a group's children resolves to a branch that accepts it
 * and is caught by the empty-result safety valve in {@link foldObjectOneOfErrors}.
 */
const OBJECT_UNION_DEF = "AnyObjectDoc";

/**
 * Builds the `type` → branch-validator lookup the fold needs, reading the union's
 * branch list out of the schema itself so a new shape needs no change here.
 *
 * @param ajv - The instance the whole schema was compiled on; branches are pulled from its cache by `$id`-qualified JSON pointer, so they share the compiled code rather than being recompiled
 * @param schema - The parsed official schema, which must carry `$id` (ajv resolves branch pointers against it)
 * @returns A resolver that memoises each branch validator it hands out
 */
export const createObjectBranchResolver = (
	ajv: Ajv2020,
	schema: ObjectUnionSchema,
): ObjectBranchResolver => {
	const branchRefByType = new Map<string, string>();
	for (const branch of schema.$defs?.[OBJECT_UNION_DEF]?.oneOf ?? []) {
		const ref = branch.$ref;
		if (typeof ref !== "string" || !ref.startsWith("#/$defs/")) {
			continue;
		}
		const typeName =
			schema.$defs?.[ref.slice("#/$defs/".length)]?.properties?.type?.const;
		if (typeof typeName === "string") {
			branchRefByType.set(typeName, `${schema.$id ?? ""}${ref}`);
		}
	}

	const validatorByType = new Map<string, ValidateFunction>();
	return (typeName) => {
		const cached = validatorByType.get(typeName);
		if (cached) {
			return cached;
		}
		const ref = branchRefByType.get(typeName);
		if (ref === undefined) {
			return undefined;
		}
		const validate = ajv.getSchema(ref);
		if (validate) {
			validatorByType.set(typeName, validate);
		}
		return validate;
	};
};

/** Value an ajv `instancePath` points at, or undefined when the path leads nowhere. */
const resolveAtPath = (data: unknown, instancePath: string): unknown => {
	let current: unknown = data;
	for (const rawSegment of instancePath.split("/").slice(1)) {
		if (typeof current !== "object" || current === null) {
			return undefined;
		}
		const segment = rawSegment.replace(/~1/g, "/").replace(/~0/g, "~");
		current = (current as Record<string, unknown>)[segment];
	}
	return current;
};

/** True when `instancePath` is the object at `prefix` or something inside it. */
const isAtOrUnder = (instancePath: string, prefix: string): boolean =>
	instancePath === prefix || instancePath.startsWith(`${prefix}/`);

/** The object a union branch would be picked for: one with a `type` to pick by. */
const readTypedObject = (
	data: unknown,
	instancePath: string,
): { type: string } | undefined => {
	const value = resolveAtPath(data, instancePath);
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		return undefined;
	}
	const typeName = (value as { type?: unknown }).type;
	return typeof typeName === "string" ? (value as { type: string }) : undefined;
};

/**
 * Outermost instance paths whose `oneOf` failure is an object picking a branch by
 * `type`. Nested ones are dropped: folding the outer object re-derives them, and the
 * recursion folds them there. Unions with no `type` to pick by (a connector endpoint,
 * an anchor) are left alone — they have few branches and no marker to fold on.
 */
const collectFoldablePaths = (
	errors: readonly ErrorObject[],
	data: unknown,
): string[] => {
	const candidates: string[] = [];
	for (const error of errors) {
		if (
			error.keyword === "oneOf" &&
			!candidates.includes(error.instancePath) &&
			readTypedObject(data, error.instancePath) !== undefined
		) {
			candidates.push(error.instancePath);
		}
	}
	return candidates.filter(
		(path) =>
			!candidates.some((other) => other !== path && isAtOrUnder(path, other)),
	);
};

/** The single error a `type` no branch declares is folded down to. */
const toUnknownObjectTypeError = (
	instancePath: string,
	typeName: string,
): ErrorObject => ({
	keyword: "oneOf",
	instancePath: `${instancePath}/type`,
	schemaPath: "#/oneOf",
	params: {},
	message: `must be a known object type, got "${typeName}"`,
});

/**
 * Replaces one object's whole `oneOf` pile with what its own branch says.
 *
 * @param errors - The full error list, needed for the fallback that keeps every error at this path
 * @param data - The whole document, so the recursion can resolve deeper paths
 * @param instancePath - Path of the object to fold, e.g. `/root/3`
 */
const foldOneObject = (
	errors: readonly ErrorObject[],
	data: unknown,
	instancePath: string,
	resolveBranch: ObjectBranchResolver,
): ErrorObject[] => {
	const keepEverythingHere = (): ErrorObject[] =>
		errors.filter((error) => isAtOrUnder(error.instancePath, instancePath));

	const object = readTypedObject(data, instancePath);
	if (object === undefined) {
		return keepEverythingHere();
	}
	const validateBranch = resolveBranch(object.type);
	if (validateBranch === undefined) {
		return [toUnknownObjectTypeError(instancePath, object.type)];
	}
	validateBranch(object);
	const branchErrors = (validateBranch.errors ?? []).map((error) => ({
		...error,
		instancePath: `${instancePath}${error.instancePath}`,
	}));
	if (branchErrors.length === 0) {
		// The branch its `type` names accepts it, yet `oneOf` failed: it matched a
		// second branch, or it sits somewhere that branch is not offered (a connector
		// among a group's children). Neither is describable from one branch, so keep
		// what ajv said rather than fold an object down to no error at all.
		return keepEverythingHere();
	}
	return foldObjectOneOfErrors(branchErrors, data, resolveBranch);
};

/**
 * Folds the `oneOf` avalanche the object union produces down to the failures of the
 * branch the object actually asked for. Every placeable object is checked against
 * ~50 branches, so with `allErrors` one missing property is reported as ~200 errors,
 * all but one of them saying a shape the document never claimed to be does not fit.
 *
 * Purely a display-layer narrowing: the result is a subset of what ajv found (an
 * unknown `type` being the one summary it writes itself), so whether the document
 * validates is unchanged, and an object that failed still carries at least one error.
 *
 * @param errors - Ajv's errors for the whole document, in the order it reported them; errors outside an object union pass through untouched
 * @param data - The parsed document the errors were produced from, read to find each object's `type`
 * @param resolveBranch - From {@link createObjectBranchResolver}, bound to the same ajv instance the errors came from
 * @returns The narrowed list, each folded object's errors sitting where its first error was
 */
export const foldObjectOneOfErrors = (
	errors: readonly ErrorObject[],
	data: unknown,
	resolveBranch: ObjectBranchResolver,
): ErrorObject[] => {
	const foldablePaths = collectFoldablePaths(errors, data);
	if (foldablePaths.length === 0) {
		return [...errors];
	}
	const foldedPaths = new Set<string>();
	const kept: ErrorObject[] = [];
	for (const error of errors) {
		const path = foldablePaths.find((candidate) =>
			isAtOrUnder(error.instancePath, candidate),
		);
		if (path === undefined) {
			kept.push(error);
			continue;
		}
		if (!foldedPaths.has(path)) {
			foldedPaths.add(path);
			kept.push(...foldOneObject(errors, data, path, resolveBranch));
		}
	}
	return kept;
};
