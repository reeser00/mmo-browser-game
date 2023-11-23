import * as THREE from '/js/three/three.module.js';
import { OrbitControls } from '/js/three/OrbitControls.js';

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
) 

const renderer = new THREE.WebGLRenderer()
renderer.shadowMap.enabled = true
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)

class Box extends THREE.Mesh {
  constructor({
    width,
    height,
    depth,
    color = '#FFFFFF',
    velocity = { x: 0, y: 0, z: 0 },
    position = { x: 0, y: 0, z: 0 }
  }) {
    super(
      new THREE.BoxGeometry(width, height, depth),
      new THREE.MeshStandardMaterial({ color: color })
    )

    this.width = width
    this.height = height
    this.depth = depth
    this.gravity = 0.005;
    this.position.set(position.x, position.y, position.z)

    this.bottom = this.position.y - this.height / 2
    this.top = this.position.y + this.height / 2
    this.left = this.position.x - this.width / 2
    this.right = this.position.x + this.width / 2
    this.front = this.position.z + this.depth / 2
    this.back = this.position.z - this.depth / 2

    this.velocity = velocity
  }
  updateSides() {
    this.bottom = this.position.y - this.height / 2
    this.top = this.position.y + this.height / 2
    this.left = this.position.x - this.width / 2
    this.right = this.position.x + this.width / 2
    this.front = this.position.z + this.depth / 2
    this.back = this.position.z - this.depth / 2
  }

  update(ground) {
    this.updateSides()

    this.position.x += this.velocity.x
    this.position.z += this.velocity.z

    //detect collision
    

    this.applyGravity(ground)
  }

  applyGravity(ground) {
    this.velocity.y -= this.gravity

    //ground collision
    if (boxCollision(this, ground)) {
      this.velocity.y *= 0.8;
      this.velocity.y = -this.velocity.y
    } else {
      this.position.y += this.velocity.y
    }
  }
}

function boxCollision(box1, box2) {
  const xCollision = box1.left + box1.velocity.x <= box2.right && box1.right + box1.velocity.x >= box2.left
  const yCollision = box1.bottom + box1.velocity.y <= box2.top && box1.top + box1.velocity.y >= box2.bottom
  const zCollision = box1.front + box1.velocity.z >= box2.back && box1.back + + box1.velocity.z <= box2.front

  return xCollision && yCollision && zCollision
}

const cube = new Box({
  width: 1,
  height: 1,
  depth: 1,
  color: '#0000ff',
  velocity: { x: 0, y: -0.1, z: 0 }
})

cube.castShadow = true
scene.add(cube)

const ground = new Box({
  width: 10,
  height: 0.5,
  depth: 10,
  color: '#00ff00',
  position: { x: 0, y: -2, z: 0 }
})
ground.receiveShadow = true
scene.add(ground)

const light = new THREE.DirectionalLight(0xffffff, 1)
light.position.y = 3
light.position.z = 2
light.castShadow = true
scene.add(light)

camera.position.z = 5

console.log(cube.bottom)
console.log(ground.top)

const keys = {
  a: { pressed: false },
  d: { pressed: false },
  w: { pressed: false },
  s: { pressed: false }
}

window.addEventListener('keydown', (e) => {
  switch (e.code){
    case 'KeyA':
      keys.a.pressed = true
      break
    case 'KeyD':
      keys.d.pressed = true
      break
    case 'KeyW':
      keys.w.pressed = true
      break
    case 'KeyS':
      keys.s.pressed = true
      break
  }
})

window.addEventListener('keyup', (e) => {
  switch (e.code){
    case 'KeyA':
      keys.a.pressed = false
      break
    case 'KeyD':
      keys.d.pressed = false
      break
    case 'KeyW':
      keys.w.pressed = false
      break
    case 'KeyS':
      keys.s.pressed = false
      break
  }
})


function animate() {
  const animationId = requestAnimationFrame(animate)

  renderer.render(scene, camera)
  //movement
  if (keys.a.pressed) {
    cube.velocity.x = -0.1
  } else if (keys.d.pressed) {
    cube.velocity.x = 0.1
  } else {
    cube.velocity.x *= 0.8
  }

  if (keys.w.pressed) {
    cube.velocity.z = -0.1
  }
  else if (keys.s.pressed) {
    cube.velocity.z = 0.1
  } else {
    cube.velocity.z *= 0.8
  }

  cube.update(ground)
  /* cube.rotation.x += 0.01
  cube.rotation.y += 0.01 */
}
animate()