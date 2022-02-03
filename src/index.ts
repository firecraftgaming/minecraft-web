import * as THREE from 'three';
import {Group, Vector3} from "three";
import * as CANNON from 'cannon-es'

export let scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
camera.rotation.order =  'YXZ';
camera.position.setY(20);

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

const render_distance = 8;

let cache = new Map<string, THREE.MeshBasicMaterial>();
const geometry = new THREE.PlaneGeometry(1, 1);

class ChunkObject {
  public position: THREE.Vector3;
  public group: THREE.Group;

  public should_render = true;

  private static chunks: ChunkObject[] = [];
  constructor(position: THREE.Vector3) {
    this.position = position;
    this.group = null;

    ChunkObject.chunks.push(this);
  }

  static update(position: THREE.Vector3, mesh: THREE.Mesh[]) {
    let chunk = ChunkObject.chunks.find(chunk => chunk.position.equals(position));
    if (!chunk) chunk = new ChunkObject(position);

    chunk.update(mesh);
  }

  update(mesh: THREE.Mesh[]) {
    const group = new Group();
    mesh.forEach(m => group.add(m));

    scene.add(group);
    scene.remove(this.group);
    this.group = group;
  }

  static shouldRender(chunk_pos: THREE.Vector3) {
    ChunkObject.chunks.forEach(v => {
      v.shouldRender(chunk_pos);
    });
  }

  static getFaces() {
    return ChunkObject.chunks.reduce((acc, v) => {
      return v.should_render ? acc.concat(v.group.children) : acc;
    }, []);
  }

  shouldRender(chunk_pos: Vector3) {
    const distance = this.position.manhattanDistanceTo(chunk_pos);
    this.changeRender(distance <= render_distance);
  }

  changeRender(should_render: boolean) {
    if (this.should_render === should_render) return;

    if (should_render) {
      scene.add(this.group);
    } else {
      scene.remove(this.group);
    }

    this.should_render = should_render;
  }
}

const worker = new Worker('/worker.js');
worker.onmessage = (e) => {
  const mesh = e.data.faces.map(v => {
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

    return mesh;
  });

  const p = e.data.position;
  ChunkObject.update(new Vector3(p.x, p.y, p.z), mesh);
};

const speed = 0.5;
function animate() {
  requestAnimationFrame(animate);

  const velocity = new THREE.Vector3();
  for (const control of controls) if (control.down) velocity.add(control.vector.clone().multiplyScalar(speed));

  const directionVector = new THREE.Vector3();
  directionVector.y += velocity.y;

  directionVector.x += velocity.x * -Math.cos(camera.rotation.y);
  directionVector.z += velocity.x * Math.sin(camera.rotation.y);

  directionVector.x += velocity.z * -Math.sin(camera.rotation.y);
  directionVector.z += velocity.z * -Math.cos(camera.rotation.y);

  // const normalized = new Vector3(Math.sign(directionVector.x), Math.sign(directionVector.y), Math.sign(directionVector.z));
  // console.log(normalized);
  //
  // const collidableMeshList = ChunkObject.getFaces();
  // let ray;
  //
  // ray = new THREE.Raycaster( camera.position, new Vector3(normalized.x, 0, 0) );
  // const collisionResults_x = ray.intersectObjects( collidableMeshList );
  //
  // ray = new THREE.Raycaster( camera.position, new Vector3(0, normalized.y, 0) );
  // const collisionResults_y = ray.intersectObjects( collidableMeshList );
  //
  // ray = new THREE.Raycaster( camera.position, new Vector3(0, 0, normalized.z) );
  // const collisionResults_z = ray.intersectObjects( collidableMeshList );
  //
  // if ( collisionResults_x.length > 0 && collisionResults_x[0].distance < Math.abs(directionVector.x + 0.1) ) directionVector.setX( normalized.x * ( collisionResults_x[0].distance - 0.1 ) );
  // if ( collisionResults_y.length > 0 && collisionResults_y[0].distance < Math.abs(directionVector.y) - 1.5 ) directionVector.setY( normalized.y * ( collisionResults_y[0].distance ) + 1.5 );
  // if ( collisionResults_z.length > 0 && collisionResults_z[0].distance < Math.abs(directionVector.z + 0.1) ) directionVector.setZ( normalized.z * ( collisionResults_z[0].distance - 0.1 ) );

  camera.position.add(directionVector);

  worker.postMessage({
    type: 'update',
    data: {
      pos: camera.position,
    }
  });

  ChunkObject.shouldRender(camera.position.clone().divideScalar(16).setY(0));
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