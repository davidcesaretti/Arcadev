import { useFrame } from '@react-three/fiber'
import { useState, useMemo, useRef } from 'react'
import { Vector3, Quaternion, TorusGeometry, BufferGeometry } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { planePosition } from './ariplane'
import { emitRingCollected, emitAllCollected } from './gameEvents'

interface Target {
  center: Vector3
  direction: Vector3
  hit?: boolean
}

function randomPoint(scale: Vector3 = new Vector3(1, 1, 1)) {
  return new Vector3(
    Math.random() * 2 - 1,
    Math.random() * 2 - 1,
    Math.random() * 2 - 1
  ).multiply(scale)
}

const TARGET_RAD = 0.35
/** Milisegundos sin agarrar un anillo para resetear el combo. */
const COMBO_RESET_MS = 2000

export function Targets() {
  const [targets, setTargets] = useState<Target[]>(() => {
    const arr: Target[] = []
    for (let i = 0; i < 25; i++) {
      arr.push({
        center: randomPoint(new Vector3(12, 1, 12)).add(
          new Vector3(0, 3 + Math.random() * 4, 0)
        ),
        direction: randomPoint().normalize(),
        hit: false,
      })
    }
    return arr
  })

  const comboRef      = useRef(0)
  const comboTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wonRef        = useRef(false)

  const geometry = useMemo(() => {
    let geo: BufferGeometry | undefined
    targets.forEach((target) => {
      const torusGeo = new TorusGeometry(TARGET_RAD, 0.035, 16, 48)
      torusGeo.applyQuaternion(
        new Quaternion().setFromUnitVectors(
          new Vector3(0, 0, 1),
          target.direction
        )
      )
      torusGeo.translate(target.center.x, target.center.y, target.center.z)

      if (!geo) geo = torusGeo
      else geo = mergeGeometries([geo, torusGeo]) ?? geo
    })
    return geo
  }, [targets])

  useFrame(() => {
    targets.forEach((target) => {
      if (target.hit) return

      const v    = planePosition.clone().sub(target.center)
      const dist = target.direction.dot(v)
      const projected = planePosition
        .clone()
        .sub(target.direction.clone().multiplyScalar(dist))

      const hitDist = projected.distanceTo(target.center)
      if (hitDist < TARGET_RAD && Math.abs(dist) < 0.05) {
        target.hit = true
      }
    })

    const hits = targets.filter((t) => t.hit)
    if (hits.length === 0) return

    // Incrementar combo con reset automático
    comboRef.current += hits.length
    if (comboTimerRef.current) clearTimeout(comboTimerRef.current)
    comboTimerRef.current = setTimeout(() => {
      comboRef.current = 0
    }, COMBO_RESET_MS)

    // Emitir evento por cada anillo recogido
    hits.forEach(() => {
      emitRingCollected(comboRef.current)
    })

    const remaining = targets.filter((t) => !t.hit)
    setTargets(remaining)

    // Victoria al recoger todos
    if (remaining.length === 0 && !wonRef.current) {
      wonRef.current = true
      // Puntos bonus: POINTS_PER_RING * combo como extra
      emitAllCollected()
    }
  })

  if (!geometry) return null

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial roughness={0.5} metalness={0.5} />
    </mesh>
  )
}
