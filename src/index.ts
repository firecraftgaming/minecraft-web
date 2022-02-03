import * as THREE from 'three';

export let scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
camera.rotation.order =  'YXZ';

const keys = {
  forward: 87, // w
  back: 83, // s
  left: 65, // a
  right: 68, // d
  up: 32, // Space
  down: 16, // Shift
};
let controls = [
  {key: keys.forward, vector: new THREE.Vector3(0,0,1), down:false},
  {key: keys.back, vector: new THREE.Vector3(0,0,-1), down:false},

  {key: keys.up, vector: new THREE.Vector3(0,1,0), down:false},
  {key: keys.down, vector: new THREE.Vector3(0,-1,0), down:false},

  {key: keys.right, vector: new THREE.Vector3(-1,0,0), down:false},
  {key: keys.left, vector: new THREE.Vector3(1,0,0), down:false},
];

let renderer = new THREE.WebGLRenderer();
let canvas = renderer.domElement;

renderer.setSize(window.innerWidth, window.innerHeight);
window.onresize = () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
};


const PI = Math.PI;
const half_PI = PI / 2;

let cache = new Map<string, THREE.MeshBasicMaterial>();
const geometry = new THREE.PlaneGeometry(1, 1);

const worker = new Worker('/worker.js');
worker.onmessage = (e) => {
  scene.clear();
  e.data.forEach(v => {
    const path = v[1];
    if (!cache.has(path)) {
      const texture = new THREE.TextureLoader().load(path);
      texture.magFilter = THREE.NearestFilter;

      const material = new THREE.MeshBasicMaterial( { map: texture, side: THREE.DoubleSide } );
      cache.set(path, material);
    }

    const material = cache.get(path);
    const mesh = new THREE.Mesh( geometry, material );
    mesh.position.copy(v[0][1]);
    mesh.rotation.setFromQuaternion(v[0][0]);

    scene.add(mesh);
  });
};

const speed = 0.2;
function animate() {
  requestAnimationFrame(animate);

  const velocity = new THREE.Vector3();
  for (const control of controls) if (control.down) velocity.add(control.vector.clone().multiplyScalar(speed));

  camera.position.y += velocity.y;

  camera.position.x += velocity.x * -Math.cos(camera.rotation.y);
  camera.position.z += velocity.x * Math.sin(camera.rotation.y);

  camera.position.x += velocity.z * -Math.sin(camera.rotation.y);
  camera.position.z += velocity.z * -Math.cos(camera.rotation.y);

  worker.postMessage({
    type: 'update',
    data: {
      pos: camera.position,
    }
  });

  renderer.render(scene, camera);
}

document.addEventListener('pointerlockchange', lockChangeAlert, false);
canvas.onclick = _ => canvas.requestPointerLock();

let mouse_locked = false;
function lockChangeAlert() {
  mouse_locked = document.pointerLockElement === canvas;
  if (document.pointerLockElement === canvas) document.addEventListener("mousemove", updatePosition, false); else document.removeEventListener("mousemove", updatePosition, false);
}

function updatePosition(e) {
  camera.rotation.y -= e.movementX / 100;
  camera.rotation.x -= e.movementY / 100;
  camera.rotation.x = Math.min(half_PI, Math.max(-half_PI, camera.rotation.x));
}

window.addEventListener("keydown", e => {
  const control = controls.find(a => e.keyCode == a.key);
  if (control && mouse_locked) control.down = true;

  e.preventDefault();
});
window.addEventListener("keyup", e => {
  const control = controls.find(a => e.keyCode == a.key);
  if (control && mouse_locked) control.down = false;

  e.preventDefault();
});


window.onload = _ => {
  document.body.appendChild(canvas);
  animate();
};