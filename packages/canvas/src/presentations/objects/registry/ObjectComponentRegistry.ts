import type { FC } from "react";

import type { ObjectType } from "../../../schemas/objects/types/ObjectType";

export class ObjectComponentRegistry {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private readonly components = new Map<ObjectType, FC<any>>();

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	register(type: ObjectType, component: FC<any>): void {
		this.components.set(type, component);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	get(type: ObjectType): FC<any> | undefined {
		return this.components.get(type);
	}

	clear(): void {
		this.components.clear();
	}
}

export const createObjectComponentRegistry = (): ObjectComponentRegistry =>
	new ObjectComponentRegistry();
