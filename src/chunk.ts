import * as THREE from 'three';
import {Object3D, Texture} from "three";
import {Block, BlockFace} from "./block";
import {Minecraft} from "./minecraft";

export const scene = new THREE.Scene();

export const Package = 'normal';
export class Material {
  public static AIR = new Material('AIR');
  public static GRASS = new Material('GRASS');
  public static DIRT = new Material('DIRT');

  public type: String;
  constructor(type: string) {
    this.type = type;
  }
}

const face_type = {
  up:    'top',
  down:  'bottom',

  left:  'side',
  right: 'side',

  front: 'side',
  back:  'side',
};

export function isTransparent(material: Material) {
  return material === Material.AIR;
}

export class Chunk {
  public blocks: Block[];
  public position: THREE.Vector3;

  public faces: [[THREE.Quaternion, THREE.Vector3], THREE.Texture][] = [];

  public static chunks: Chunk[] = [];
  constructor(pos) {
    Chunk.chunks.push(this);

    // this.block_data = new Array(4096).fill(null);
    // this.blocks_new = new Uint16Array(4096).fill(0);

    this.blocks = [];
    this.position = pos;

    this.generate();
    this.update();
  }

  getBlockAt(pos) {
    const block = this.blocks.find(block => block.position.equals(pos));
    if (block) return block;

    return new Block(Material.AIR, pos.clone(), this.position.clone());
  }

  checkFace(block, x, y, z, type): [BlockFace[keyof BlockFace], string] {
    const offset = new THREE.Vector3(x, y, z);
    const pos = block.position.clone().add(offset);

    const b = Minecraft.getBlock(pos, false);
    if (!isTransparent(b.material)) return;

    const side = Block.getSide(block.material, face_type[type]);
    return [block.Face[type], side];
  }

  update() {
    this.faces = this.blocks.reduce((acc, block) => {
     const f = [
       this.checkFace(block, -1,  0,  0, 'left'),
       this.checkFace(block,  1,  0,  0, 'right'),

       this.checkFace(block,  0,  1,  0, 'up'),
       this.checkFace(block,  0,  -1,  0, 'down'),

       this.checkFace(block,  0,  0, -1, 'back'),
       this.checkFace(block,  0,  0,  1, 'front'),
     ].filter(v => !!v);

     return acc.concat(f);
    }, []);

    const all_faces = Chunk.chunks.reduce((acc, chunk) => {
      return acc.concat(chunk.faces);
    }, []);
    postMessage(all_faces);
  }

  setBlockAt(v, material, update=true) {
    const block = this.getBlockAt(v);
    if (block.material != Material.AIR) this.blocks.splice(this.blocks.findIndex(e => e.position.equals(v)),1);
    if (material != Material.AIR) this.blocks.push(new Block(material, v.clone(), this.position.clone()));

    if (update) this.update();
  }

  fill(v1, v2, material, update=true) {
    const min = v1.clone().min(v2);
    const max = v1.clone().max(v2);

    for (let x = min.x; x <= max.x; x++) {
      for (let y = min.y; y <= max.y; y++) {
        for (let z = min.z; z <= max.z; z++) {
          this.setBlockAt(new THREE.Vector3(x, y, z), material, false);
        }
      }
    }

    if (update) this.update();
  }

  static getChunkAt(v) {
    return Chunk.chunks.find(e => e.position.equals(v));
  }

  generate() {
    Chunk.generator.generate(this);
    Chunk.chunks.filter(v => v.position.manhattanDistanceTo(this.position) <= 1).forEach(v => v.update());
  }

  public static generator: ChunkGenerator;
}

abstract class ChunkGenerator {
  public abstract generate(chunk: Chunk): void;
}

class ClassicGenerator extends ChunkGenerator {
  public generate(chunk: Chunk) {
    const x = chunk.position.x * 16;
    const z = chunk.position.z * 16;

    chunk.fill(new THREE.Vector3(x,  0, z), new THREE.Vector3(x + 15,  9, z + 15),  Material.DIRT, false);
    chunk.fill(new THREE.Vector3(x, 10, z), new THREE.Vector3(x + 15, 10, z + 15), Material.GRASS, false);
  }
}
Chunk.generator = new ClassicGenerator();