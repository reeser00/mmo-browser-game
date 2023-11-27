import * as THREE from '/js/three/three.module.js';

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
        new THREE.MeshStandardMaterial({ color: color, transparent: true })
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

export {
    Box
}