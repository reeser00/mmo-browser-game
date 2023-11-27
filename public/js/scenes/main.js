import * as THREE from '/js/three/three.module.js';
import { OrbitControls } from '/js/three/OrbitControls.js';
import { GLTFLoader } from '/js/three/GLTFLoader.js';
import * as meshes from '/js/classes/meshes.js';

const skeletonUrl = new URL('/models/skeleton.glb', import.meta.url);

const socket = io('http://localhost:3000');

//////GLOBALS//////
let buildingMode = false;

let mixer;
const assetLoader = new GLTFLoader();



assetLoader.load(skeletonUrl.href, (gltf) => {
    const model = gltf.scene;
    scene.add(model);
    model.position.set(1, -1.5, 1);
    mixer = new THREE.AnimationMixer(model);
    const clips = gltf.animations;
    const clip = THREE.AnimationClip.findByName(clips, 'idle');
    const action = mixer.clipAction(clip);
    action.play();

}, undefined, (error) => {
    console.error(error);
});

document.getElementById('login-button').addEventListener('click', (e) => {
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('ui').classList.remove('hidden');
    socket.emit('login', document.getElementById('username-input').value);
});

socket.on('loadworld', (world) => {
    world.objectsPlaced.forEach(object => {
      const newObject = sphereMesh.clone();
      newObject.position.copy(object.position);
      newObject.rotation.copy(object.rotation);
      newObject.scale.copy(object.scale);
      scene.add(newObject);
      objects.push(newObject);
      objectsPlaced.push({name: 'sphere', position: newObject.position, rotation: newObject.rotation, scale: newObject.scale});
    });


});

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

const cube = new meshes.Box({
  width: 1,
  height: 1,
  depth: 1,
  color: '#0000ff',
  velocity: { x: 0, y: -0.1, z: 0 }
})

cube.castShadow = true
scene.add(cube)

const ground = new meshes.Box({
  width: 20,
  height: 1,
  depth: 20,
  color: '#00ff00',
  position: { x: 0, y: -2, z: 0 }
})
ground.name = 'ground';
ground.receiveShadow = true
scene.add(ground)

const light = new THREE.DirectionalLight(0xffffff, 1)
light.position.y = 3
light.position.z = 2
light.castShadow = true
scene.add(light)

camera.position.z = 5

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

///BUILDING MODE///
document.getElementById('buildmode-button').addEventListener('click', (e) => {
    if (buildingMode) {
        buildingMode = false;
        document.getElementById('buildmode-button').innerHTML = 'Building Mode: Off';

        window.removeEventListener('mousedown', builderMouseDownHandler);

        ground.material.opacity = 1;
        scene.remove(grid);
        scene.remove(highlightMesh);
        console.log(objects);
        socket.emit('saveworld', objectsPlaced);
    }
    else {
        buildingMode = true;
        document.getElementById('buildmode-button').innerHTML = 'Building Mode: On';

        ground.material.opacity = 0;
        scene.add(grid);
        scene.add(highlightMesh);
        window.addEventListener('mousedown', builderMouseDownHandler);
    }
});

const grid = new THREE.GridHelper(ground.width, ground.width, 0xFFFFFF, 0xFFFFFF);
grid.position.set(ground.position.x, ground.position.y + ground.height / 2, ground.position.z);

const highlightMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, transparent: true, opacity: 0.5})
);
highlightMesh.rotateX(Math.PI / 2);
highlightMesh.position.set(0.5, ground.position.y + ground.height / 2 +0.01, 0.5);

const mousePosition = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
let intersects;

window.addEventListener('mousemove', (e) => {
    mousePosition.x = (e.clientX / window.innerWidth) * 2 - 1;
    mousePosition.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mousePosition, camera);
    intersects = raycaster.intersectObjects(scene.children);
    intersects.forEach((intersect) => {
        if (intersect.object.name === 'ground') {
            const highlightPosition = new THREE.Vector3().copy(intersect.point).floor().addScalar(0.5);
            highlightMesh.position.set(highlightPosition.x, ground.position.y + ground.height / 2 +0.01, highlightPosition.z);

            const objectExists = objects.find((object) => {
                return object.position.equals(highlightMesh.position);
            });

            if (!objectExists) {
                highlightMesh.material.color.setHex(0xFFFFFF);
            }
            else
            {
                highlightMesh.material.color.setHex(0xFF0000);
            }
        }
    });
});

//example object
const objects = [];
const objectsPlaced = [];

const sphereMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.4, 4, 2),
    new THREE.MeshBasicMaterial({ wireframe: true, color: 0xff0000 })
);

const builderMouseDownHandler = (e) => {
    if (e.button === 0 && buildingMode){

        const objectExists = objects.find((object) => {
            return object.position.equals(highlightMesh.position);
        });

        if (!objectExists) {
            intersects.forEach((intersect) => {
                if (intersect.object.name === 'ground') {
                    const sphereClone = sphereMesh.clone();
                    sphereClone.position.copy(highlightMesh.position);
                    scene.add(sphereClone);
                    objects.push(sphereClone);
                    objectsPlaced.push({name: 'sphere', position: sphereClone.position, rotation: sphereClone.rotation, scale: sphereClone.scale});
                    highlightMesh.material.color.setHex(0xFF0000);
                }
            });
        }
    
    }else if (e.button === 2 && buildingMode) {
        intersects.forEach((intersect) => {
            if (intersect.object.name === 'ground') {
                const objectExists = objects.find((object) => {
                    return object.position.equals(highlightMesh.position);
                });
                const objectExistsPlaced = objectsPlaced.find((object) => {
                    return object.position == objectExists.position;
                });
                if (objectExists) {
                    scene.remove(objectExists);
                    objects.splice(objects.indexOf(objectExists), 1);
                    objectsPlaced.splice(objectsPlaced.indexOf(objectExistsPlaced), 1);
                }
            }
        });
    }
};
    
///END-BUILDING MODE///


const clock = new THREE.Clock();
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
  if (mixer) {
    mixer.update(clock.getDelta());
  }
}
animate()

//check if user rezised window
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()

  renderer.setSize(window.innerWidth, window.innerHeight)
});