import {Chunk} from "./chunk";
import * as THREE from "three";
import {Vector3} from "three";

onmessage = function (e) {
    const data = e.data;
    if (data.type === 'update') {
        const position = data.data.pos as Vector3;

        const chunk_x = Math.floor(position.x / 16);
        const chunk_z = Math.floor(position.z / 16);

        const d = 2;
        for (let x = -d; x <= d; x++) {
            for (let z = -d; z <= d; z++) {
                this.setTimeout(() => {
                    const pos = new THREE.Vector3(chunk_x + x, 0, chunk_z + z);

                    const chunk = Chunk.getChunkAt(pos);
                    if (!chunk) new Chunk(pos);
                }, 0);
            }
        }
    }
};