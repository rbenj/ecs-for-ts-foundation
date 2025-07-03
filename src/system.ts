/**
 * This interface represents the system in an entity component system. Systems contain the logic
 * that operates on entities with specific components.
 */
interface System {
  /**
   * Update method called each frame to process entities.
   * @param dt - Delta time in milliseconds since last update
   * @param data - Optional data passed to the system (can be commands, state, etc.)
   */
  update(dt: number, data?: unknown): void;
}

export default System; 
