import * as THREE from 'three';
import {Object3D, Texture, Vector3} from "three";
import {Block, BlockData, BlockFace} from "./block";
import {Minecraft} from "./minecraft";
import SimplexNoise from 'simplex-noise';

export const scene = new THREE.Scene();

export const Package = 'normal';
export class Material {
  public static Materials: Material[] = [];

  public static AIR = new Material('AIR');
  public static GRASS = new Material('GRASS');
  public static DIRT = new Material('DIRT');

  public type: String;
  public index: number;
  
  constructor(type: string) {
    this.type = type;
    this.index = Material.Materials.length;
    Material.Materials.push(this);
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

export function isTransparent(block: Block | null): boolean {
  if (!block) return true;
  if (!block.data) return true;
  if (block.data === Material.AIR) return true;

  return false;
}

export class Chunk {
  public index = 1;
  public blocks = new Uint16Array(4096).fill(0);
  public block_data = new Array(4096).fill(null);

  public position: THREE.Vector3;

  public faces: [[THREE.Quaternion, THREE.Vector3], string][] = [];

  public static chunks: Chunk[] = [];
  constructor(pos) {
    Chunk.chunks.push(this);
    this.position = pos;

    this.generate();
    this.update();
  }

  getBlockAt(pos: Vector3): Block {
    const local_position = pos.clone().sub(this.position.clone().multiplyScalar(16));
    return this.getBlockLocal(local_position);
  }

  getIndexLocal(pos: Vector3): number {
    if (pos.x < 0 || pos.x > 15) return -1;
    if (pos.y < 0 || pos.y > 15) return -1;
    if (pos.z < 0 || pos.z > 15) return -1;

    const index = pos.x * 1 + pos.y * 16 + pos.z * 256;
    return index;
  }

  getBlockLocal(pos: Vector3): Block {
    const index = this.getIndexLocal(pos);
    if (index < 0) return;

    const block = this.blocks[index];

    // const data = this.block_data[block];
    const data = Material.Materials[block];
    return new Block(data, pos.clone(), this.position.clone());
  }

  checkFace(block: Block, x: number, y: number, z: number, type: string): [BlockFace[keyof BlockFace], string] {
    const offset = new THREE.Vector3(x, y, z);
    const pos = block.position.clone().add(offset);

    const b = this.getBlockLocal(pos);
    if (!isTransparent(b)) return;

    const side = Block.getSide(block.data, face_type[type]);
    return [block.Face[type], side];
  }

  update() {
    this.faces = [];
    const active_blocks = [];
    
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        for (let z = 0; z < 16; z++) {
          const block = this.getBlockLocal(new Vector3(x, y, z));
          if (!block.data || block.data === Material.AIR) continue;

          const f = [
            this.checkFace(block, -1,  0,  0, 'left'),
            this.checkFace(block,  1,  0,  0, 'right'),
     
            this.checkFace(block,  0,  1,  0, 'up'),
            this.checkFace(block,  0,  -1,  0, 'down'),
     
            this.checkFace(block,  0,  0, -1, 'back'),
            this.checkFace(block,  0,  0,  1, 'front'),
          ].filter(v => !!v);

          if (f.length) active_blocks.push(block.position);
          this.faces = this.faces.concat(f);
        }
      }
    }

    postMessage({
      position: this.position,
      faces: this.faces,

      blocks: active_blocks,
    });
  }

  setBlockAt(pos: Vector3, data: BlockData, update=true) {
    const local_position = pos.clone().sub(this.position.clone().multiplyScalar(16));
    this.setBlockLocal(local_position, data, update);
  }

  setBlockLocal(pos: Vector3, data: BlockData, update=true) {
    const index = this.getIndexLocal(pos);
    if (index < 0) return;

    // this.block_data[this.index] = data;
    this.blocks[index] = data?.index ?? 0;
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

  fillLocal(v1, v2, material, update=true) {
    const min = v1.clone().min(v2);
    const max = v1.clone().max(v2);

    for (let x = min.x; x <= max.x; x++) {
      for (let y = min.y; y <= max.y; y++) {
        for (let z = min.z; z <= max.z; z++) {
          this.setBlockLocal(new THREE.Vector3(x, y, z), material, false);
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
  private static simplex = new SimplexNoise();
  public generate(chunk: Chunk) {
    const chunk_pos = chunk.position.clone().multiplyScalar(16);

    for (let x = 0; x < 16; x++) {
      for (let z = 0; z < 16; z++) {
        const y = Math.round(ClassicGenerator.simplex.noise2D((x + chunk_pos.x) / 30, (z + chunk_pos.z) / 30) * 6 + 8);

        chunk.setBlockLocal(new THREE.Vector3(x, y, z), Material.GRASS, false);
        chunk.fillLocal(new THREE.Vector3(x,  0, z), new THREE.Vector3(x,  y - 1, z),  Material.DIRT, false);
      }
    }
  }
}
Chunk.generator = new ClassicGenerator();