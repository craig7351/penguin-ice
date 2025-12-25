import * as THREE from 'three';

export class Penguin {
    constructor(scene) {
        this.scene = scene;
        this.mesh = this.createPenguinMesh();
        this.currentBlock = null; // The block the penguin is currently standing on

        this.velocity = new THREE.Vector3();
        this.isFalling = false;

        this.scene.add(this.mesh);
    }

    createPenguinMesh() {
        const group = new THREE.Group();

        // Body
        const bodyGeo = new THREE.CapsuleGeometry(0.4, 0.8, 4, 8);
        const bodyMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.6;
        group.add(body);

        // Belly
        const bellyGeo = new THREE.CapsuleGeometry(0.35, 0.7, 4, 8);
        const bellyMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
        const belly = new THREE.Mesh(bellyGeo, bellyMat);
        belly.position.set(0, 0.6, 0.15);
        group.add(belly);

        // Head (integrated in capsule but adding eyes/beak)

        // Beak
        const beakGeo = new THREE.ConeGeometry(0.1, 0.2, 8);
        const beakMat = new THREE.MeshLambertMaterial({ color: 0xffaa00 });
        const beak = new THREE.Mesh(beakGeo, beakMat);
        beak.rotation.x = Math.PI / 2;
        beak.position.set(0, 0.9, 0.35);
        group.add(beak);

        // Eyes
        const eyeGeo = new THREE.SphereGeometry(0.05, 8, 8);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.15, 0.95, 0.3);
        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.15, 0.95, 0.3);
        group.add(leftEye);
        group.add(rightEye);

        group.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        return group;
    }

    setPosition(x, z) {
        // Place penguin on top of the block height
        // Block top is at y = 0.25 (since height is 0.5 and centered at 0)
        // Penguin y=0 is its pivot? My penguin geometry starts at 0 essentially?
        // Body y=0.6, capsule height 1.2 total (0.8 + 2*0.4 radius)
        // Let's set group position.
        this.mesh.position.set(x, 0.25, z);
    }

    update() {
        if (this.isFalling) {
            this.velocity.y -= 0.015;
            this.mesh.position.add(this.velocity);

            // Wobble
            this.mesh.rotation.x += 0.05;
            this.mesh.rotation.z += 0.02;

            if (this.mesh.position.y < -15) {
                // Game Over state triggered elsewhere or callback
            }
        }
    }
}
