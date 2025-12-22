/**
 * Creates a type-safe State to Data mapper using a template Data object.
 * This approach provides better type inference and IDE support.
 *
 * @template TData - The target Data type
 * @param template - Template object of type TData (can be empty)
 * @returns A function that maps any compatible State to Data
 *
 * @example
 * ```typescript
 * type UserData = { id: string; name: string; };
 * type UserState = UserData & { isLoading: boolean; };
 *
 * const userTemplate: UserData = { id: '', name: '' };
 * const mapper = createStateToDataMapper(userTemplate);
 *
 * const state: UserState = { id: '1', name: 'John', isLoading: false };
 * const data = mapper(state); // { id: '1', name: 'John' }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createStateToDataMapper = <TData extends Record<string, any>>(
	template: TData,
) => {
	const dataKeys = Object.keys(
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		template as Record<string, any>,
	) as (keyof TData)[];

	return <TState extends TData>(state: TState): TData => {
		const result = {} as TData;

		for (const key of dataKeys) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(result as any)[key] = (state as any)[key];
		}

		return result;
	};
};
