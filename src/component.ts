/**
 * This interface represents the component in an entity component system. Components store data and
 * provide a type-safe interface for accessing that data.
 */
interface Component<State> {
  /**
   * Get a value from the component's state.
   * @param key - The key of the value to retrieve
   * @returns The value associated with the key
   */
  get<Key extends keyof State>(key: Key): State[Key];

  /**
   * Set a value in the component's state.
   * @param key - The key of the value to set
   * @param value - The value to store
   */
  set<Key extends keyof State>(key: Key, value: State[Key]): void;
}

/**
 * Type representing a component constructor function. This allows the ECS to work with component
 * classes in a type-safe way.
 */
export type ComponentConstructor<T = Component<unknown>> = new (props: any) => T;

export default Component; 
