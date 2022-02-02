import {Chunk, Material} from "./chunk";
import * as THREE from "three";
import {Minecraft} from "./minecraft";
import {Vector3} from "three";

onmessage = function (e) {
    const data = e.data;
    if (data.type === 'create') {
        const pos = new THREE.Vector3(data.data.x, 0, data.data.z);

        const chunk = Chunk.getChunkAt(pos);
        if (!chunk) new Chunk(pos);
    }
};