import type { MenuSectionFactory, MenuSectionGroup } from "./ObjectMenuTypes";
import type { ObjectType } from "../../../../schemas/objects/types/ObjectType";
import type { ObjectState } from "../../../../states/objects/base/ObjectState";

class MenuRegistry {
	private readonly factories = new Map<ObjectType, MenuSectionFactory>();

	register<TState extends ObjectState>(
		type: ObjectType,
		factory: MenuSectionFactory<TState>,
	): void {
		this.factories.set(type, factory as MenuSectionFactory);
	}

	getGroups(type: ObjectType, state: ObjectState): MenuSectionGroup[] {
		return this.factories.get(type)?.(state) ?? [];
	}

	clear(): void {
		this.factories.clear();
	}
}

export const menuRegistry = new MenuRegistry();
