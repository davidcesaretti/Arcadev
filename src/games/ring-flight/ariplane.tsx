import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { Matrix4, Quaternion, Vector3, type Group, type Mesh } from 'three'
import { updatePlaneAxis, turbo } from './controls'
import { audioManager } from '../../audio/AudioManager'

const x = new Vector3(1, 0, 0)
const y = new Vector3(0, 1, 0)
const z = new Vector3(0, 0, 1)

export const planePosition = new Vector3(0, 3, 7)

const delayedRotMatrix = new Matrix4()
const delayedQuaternion = new Quaternion()

export function Airplane(props: Record<string, unknown>) {
  const { nodes, materials } = useGLTF(
    '/assets/ring-flight/models/airplane.glb'
  )
  const groupRef = useRef<Group>(null)
  const helixMeshRef = useRef<Mesh>(null)

  useFrame(({ camera }, delta) => {
    if (!groupRef.current) return

    updatePlaneAxis(x, y, z, planePosition, camera, delta)

    const rotMatrix = new Matrix4().makeBasis(x, y, z)

    const matrix = new Matrix4()
      .multiply(
        new Matrix4().makeTranslation(
          planePosition.x,
          planePosition.y,
          planePosition.z
        )
      )
      .multiply(rotMatrix)

    groupRef.current.matrixAutoUpdate = false
    groupRef.current.matrix.copy(matrix)
    groupRef.current.matrixWorldAutoUpdate = true

    let quaternionA = new Quaternion().copy(delayedQuaternion)
    let quaternionB = new Quaternion()
    quaternionB.setFromRotationMatrix(rotMatrix)

    let interpolationFactor = 0.0175
    let interpolatedQuaternion = new Quaternion().copy(quaternionA)
    interpolatedQuaternion.slerp(quaternionB, interpolationFactor)
    delayedQuaternion.copy(interpolatedQuaternion)

    delayedRotMatrix.identity()
    delayedRotMatrix.makeRotationFromQuaternion(delayedQuaternion)

    const cameraMatrix = new Matrix4()
      .multiply(
        new Matrix4().makeTranslation(
          planePosition.x,
          planePosition.y,
          planePosition.z
        )
      )
      .multiply(delayedRotMatrix)
      .multiply(new Matrix4().makeRotationX(-0.2))
      .multiply(new Matrix4().makeTranslation(0, 0.015, 0.3))

    camera.matrixAutoUpdate = false
    camera.matrix.copy(cameraMatrix)
    camera.matrixWorldNeedsUpdate = true

    if (helixMeshRef.current) helixMeshRef.current.rotation.z -= 1.0

    // Actualizar parámetros de audio por frame
    // turbo 0..1 → speedNormalized 0.3..1.0 (el avión siempre avanza)
    const speedNormalized = 0.3 + turbo * 0.7
    audioManager.setEngineParams(speedNormalized, turbo > 0.05)
  })

  const supports = nodes.supports as Mesh
  const chassis = nodes.chassis as Mesh
  const helix = nodes.helix as Mesh

  return (
    <>
      <group ref={groupRef}>
        <group {...props} dispose={null} scale={0.01} rotation-y={Math.PI}>
          <mesh
            geometry={supports.geometry}
            material={materials['Material.004']}
          />
          <mesh
            geometry={chassis.geometry}
            material={materials['Material.005']}
          />
          <mesh
            geometry={helix.geometry}
            material={materials['Material.005']}
            ref={helixMeshRef}
          />
        </group>
      </group>
    </>
  )
}
