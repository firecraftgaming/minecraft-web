import * as THREE from "three";
import {Material, Package} from "./chunk";
import {Quaternion, Vector3} from "three";

function fromAxis(x: number, y: number, z: number, r: number) {
  const q = new THREE.Quaternion();
  q.setFromAxisAngle( new THREE.Vector3( x, y, z ), Math.PI * r / 2 );

  return q;
}

function offset(v: THREE.Vector3, x: number, y: number, z: number) {
  const offset_vector = new THREE.Vector3(x, y, z).multiplyScalar(1 / 2);
  return v.clone().add(offset_vector);
}

const axis = {
  up:    fromAxis(1, 0, 0,  1),
  down:  fromAxis(1, 0, 0, -1),

  left:  fromAxis(0, 1, 0, -1),
  right: fromAxis(0, 1, 0,  1),

  front: fromAxis(0, 1, 0,  0),
  back:  fromAxis(0, 1, 0,  2),
};

let cache = new Map<string, THREE.Texture>();

export interface BlockFace {
  up:    [Quaternion, Vector3],
  down:  [Quaternion, Vector3],

  right: [Quaternion, Vector3],
  left:  [Quaternion, Vector3],

  front: [Quaternion, Vector3],
  back:  [Quaternion, Vector3],
}

export class Block {
  public material: Material;

  public position: THREE.Vector3;
  public chunk: THREE.Vector3;

  constructor(type: Material, pos: THREE.Vector3, chunk: THREE.Vector3) {
    this.material = type;

    this.position = pos;
    this.chunk = chunk;
  }

  get Face(): BlockFace {
    return {
      up:    [axis.up,    offset(this.position, 0,  1,  0)],
      down:  [axis.down,  offset(this.position, 0, -1,  0)],

      right: [axis.right, offset(this.position, 1,  0,  0)],
      left:  [axis.left,  offset(this.position, -1,  0,  0)],

      front: [axis.front, offset(this.position, 0,  0,  1)],
      back:  [axis.back,  offset(this.position, 0,  0, -1)],
    };
  }

  static getSide(material, url): string {
    let path = ['texturepacks', Package, material.type.toLowerCase(), url + '.png'].join('/');
    return path;

    // if (!cache.has(path)) {
    //   const texture = new THREE.TextureLoader().load(path);
    //   texture.magFilter = THREE.NearestFilter;
    //
    //   cache.set(path, texture);
    // }
    // return cache.get(path);
  }
}