import * as THREE from "three";
import {Block} from "./block";
import {Chunk, Material} from "./chunk";

export class Minecraft {
  static setBlock(pos, material, update=true) {
    const x = Math.floor(pos.x / 16);
    const z = Math.floor(pos.z / 16);

    if (!Chunk.getChunkAt(new THREE.Vector3(x, 0, z))) new Chunk(new THREE.Vector3(x, 0, z));
    Chunk.getChunkAt(new THREE.Vector3(x, 0, z)).setBlockAt(pos, material, false);

    if (update) this.update();
  }

  static getBlock(pos, create=true) {
    const x = Math.floor(pos.x / 16);
    const y = Math.floor(pos.y / 16);
    const z = Math.floor(pos.z / 16);

    const chunk = Chunk.getChunkAt(new THREE.Vector3(x, y, z));
    if (!chunk) {
      if (create) {
        new Chunk(new THREE.Vector3(x, y, z));
      } else {
        return new Block(Material.AIR, pos.clone(), new THREE.Vector3(x, y, z));
      }
    }

    return Chunk.getChunkAt(new THREE.Vector3(x, y, z)).getBlockAt(pos);
  }

  static fill(v1, v2, material) {
    const min = v1.clone().min(v2);
    const max = v1.clone().max(v2);

    for (let x = min.x; x <= max.x; x++) {
      for (let y = min.y; y <= max.y; y++) {
        for (let z = min.z; z <= max.z; z++) {
          Minecraft.setBlock(new THREE.Vector3(x, y, z), material, false);
        }
      }
    }
    this.update();
  }

  static update() {
    Chunk.chunks.forEach(e => {
      e.update();
    });
  }
}