export let controls = {}

function easeOutQuad(x) {
  return 1 - (1 - x) * (1 - x)
}

window.addEventListener('keydown', (e) => {
  controls[e.key.toLowerCase()] = true
})

window.addEventListener('keyup', (e) => {
  controls[e.key.toLowerCase()] = false
})

// Velocidades en radianes por segundo (independiente del framerate)
let maxVelocityJaw = 7.5 // A/D — giro lateral
let maxVelocityPitch = 3.5 // W/S — arriba/abajo
let jawVelocity = 0
let pitchVelocity = 0
let planeSpeed = 0.6 // avance moderado para poder girar dentro del terreno

export let turbo = 0

export function updatePlaneAxis(x, y, z, planePosition, camera, delta) {
  const dt =
    typeof delta === 'number' && delta > 0 ? Math.min(delta, 0.1) : 1 / 60

  jawVelocity *= 0.94
  pitchVelocity *= 0.94

  if (controls['a']) jawVelocity += 24 * dt
  if (controls['d']) jawVelocity -= 24 * dt
  if (controls['w']) pitchVelocity -= 11 * dt
  if (controls['s']) pitchVelocity += 11 * dt

  if (Math.abs(jawVelocity) > maxVelocityJaw)
    jawVelocity = Math.sign(jawVelocity) * maxVelocityJaw
  if (Math.abs(pitchVelocity) > maxVelocityPitch)
    pitchVelocity = Math.sign(pitchVelocity) * maxVelocityPitch

  if (controls['r']) {
    jawVelocity = 0
    pitchVelocity = 0
    turbo = 0
    x.set(1, 0, 0)
    y.set(0, 1, 0)
    z.set(0, 0, 1)
    planePosition.set(0, 3, 7)
  }

  const jawAngle = jawVelocity * dt
  const pitchAngle = pitchVelocity * dt

  x.applyAxisAngle(z, jawAngle)
  y.applyAxisAngle(z, jawAngle)

  y.applyAxisAngle(x, pitchAngle)
  z.applyAxisAngle(x, pitchAngle)

  x.normalize()
  y.normalize()
  z.normalize()

  if (controls.shift) {
    turbo += 0.025
  } else {
    turbo *= 0.95
  }
  turbo = Math.min(Math.max(turbo, 0), 1)

  // Aumentamos ligeramente el aporte del turbo al avance
  let turboSpeed = easeOutQuad(turbo) * 0.012

  camera.fov = 45 + turboSpeed * 900
  camera.updateProjectionMatrix()

  planePosition.add(z.clone().multiplyScalar(-(planeSpeed + turboSpeed) * dt))
}
