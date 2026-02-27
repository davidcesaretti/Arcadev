import { BackSide } from 'three'
import { useTexture } from '@react-three/drei'

export function SphereEnv() {
  const map = useTexture('/assets/ring-flight/envmap.jpg')

  return (
    <mesh>
      <sphereGeometry args={[60, 50, 50]} />
      <meshBasicMaterial side={BackSide} map={map} />
    </mesh>
  )
}
