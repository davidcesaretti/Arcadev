/**
 * Lógica del juego (Phaser o Three.js).
 * - Recibe el container DOM y callbacks (onScore, etc.).
 * - Devuelve una función cleanup (stop loop, dispose, remove listeners).
 */
export interface TemplateGameCallbacks {
  onScore: (score: number) => void
}

export function createTemplateGame(
  _container: HTMLDivElement,
  _callbacks: TemplateGameCallbacks
): () => void {
  // Inicializar Phaser o Three aquí.
  // Ejemplo: const game = new Phaser.Game(...) o createThreeScene(...)
  const noop = () => {}
  return noop
}
