import type { Vector3 } from 'three'
import type { Object3D } from 'three'

export const controls: Record<string, boolean>

export let turbo: number

export function updatePlaneAxis(
  x: Vector3,
  y: Vector3,
  z: Vector3,
  planePosition: Vector3,
  camera: Object3D,
  delta: number
): void
