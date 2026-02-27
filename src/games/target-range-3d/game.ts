import * as THREE from 'three'
import type { TargetRangeCallbacks } from './types'

export function createTargetRangeScene(
  container: HTMLDivElement,
  callbacks: TargetRangeCallbacks
): () => void {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x1a1a2e)

  const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 100)
  camera.position.z = 4

  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  container.appendChild(renderer.domElement)

  const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5)
  const material = new THREE.MeshNormalMaterial()
  const cube = new THREE.Mesh(geometry, material)
  scene.add(cube)

  const onResize = () => {
    const w = container.clientWidth
    const h = container.clientHeight
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)
  }
  window.addEventListener('resize', onResize)

  const onPointerDown = () => {
    callbacks.onClick()
  }
  renderer.domElement.addEventListener('pointerdown', onPointerDown)

  let frameId = 0
  const animate = () => {
    frameId = requestAnimationFrame(animate)
    cube.rotation.x += 0.01
    cube.rotation.y += 0.01
    renderer.render(scene, camera)
  }
  animate()

  return () => {
    cancelAnimationFrame(frameId)
    window.removeEventListener('resize', onResize)
    renderer.domElement.removeEventListener('pointerdown', onPointerDown)
    renderer.dispose()
    geometry.dispose()
    material.dispose()
    if (container.contains(renderer.domElement)) {
      container.removeChild(renderer.domElement)
    }
  }
}
