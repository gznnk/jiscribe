/**
 * Creates a type-safe Data to State mapper using a DefaultState template.
 * This function takes a Data object and merges it with the DefaultState,
 * effectively overwriting default values with the provided data.
 *
 * @template TState - The target State type
 * @param defaultState - Default state template object
 * @returns A function that maps any compatible Data to State
 *
 * @example
 * ```typescript
 * type UserData = { id: string; name: string; };
 * type UserState = UserData & { isLoading: boolean; isSelected: boolean };
 *
 * const defaultUserState: UserState = { id: '', name: '', isLoading: false, isSelected: false };
 * const mapper = createDataToStateMapper(defaultUserState);
 *
 * const data: UserData = { id: '1', name: 'John' };
 * const state = mapper(data); // { id: '1', name: 'John', isLoading: false, isSelected: false }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createDataToStateMapper = <TState extends Record<string, any>>(
	defaultState: TState,
) => {
	return <TData extends Partial<TState>>(data: TData): TState => {
		return {
			...defaultState,
			...data,
		} as TState;
	};
};
