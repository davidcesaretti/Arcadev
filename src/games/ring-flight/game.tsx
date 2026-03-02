import {
  Environment,
  OrbitControls,
  PerspectiveCamera,
} from '@react-three/drei'
import { EffectComposer, HueSaturation } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { MotionBlur } from './motionBlur'
import { SphereEnv } from './sphereEnv'
import { Landscape } from './landScape'
import { Airplane } from './ariplane'
import { Targets } from './targets'

function FlightGame() {
  return (
    <>
      <SphereEnv />
      <Environment
        background={false}
        files="/assets/ring-flight/meadow_4k.hdr"
      />
      <PerspectiveCamera makeDefault position={[0, 10, 10]} />
      <OrbitControls target={[0, 0, 0]} />

      <Landscape />
      <Airplane />
      <Targets />

      <directionalLight
        castShadow
        color={'#f3d29a'}
        intensity={2}
        position={[10, 5, 4]}
        shadow-bias={-0.0005}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={0.01}
        shadow-camera-far={20}
        shadow-camera-left={-6.2}
        shadow-camera-right={6.4}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
      />

      <EffectComposer>
        <MotionBlur />
        <HueSaturation
          blendFunction={BlendFunction.NORMAL}
          hue={-0.15}
          saturation={0.1}
        />
      </EffectComposer>
    </>
  )
}

export default FlightGame
