import * as THREE from 'three';

export class IceBlock {
    constructor(x, z) {
        this.startPosition = new THREE.Vector3(x, 0, z);

        // Ice Material
        const geometry = new THREE.CylinderGeometry(1, 1, 0.5, 6);
        const material = new THREE.MeshPhysicalMaterial({
            color: 0xaaccff,
            transmission: 0.5, // Glass-like
            opacity: 0.8,
            metalness: 0,
            roughness: 0.1,
            ior: 1.5,
            thickness: 1.0,
            transparent: true,
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(this.startPosition);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;

        this.isFalling = false;
        this.velocity = new THREE.Vector3();
    }

    hit() {
        if (!this.isFalling) {
            this.isFalling = true;
            // Slightly randomize fall direction
            this.velocity.set(
                (Math.random() - 0.5) * 0.1,
                -0.1,
                (Math.random() - 0.5) * 0.1
            );
        }
    }

    update() {
        if (this.isFalling) {
            this.velocity.y -= 0.01; // Gravity
            this.mesh.position.add(this.velocity);
            this.mesh.rotation.x += this.velocity.z;
            this.mesh.rotation.z -= this.velocity.x;

            if (this.mesh.position.y < -10) {
                this.mesh.visible = false;
                // Ideally remove from scene and memory, but visibility hidden is ok for now
            }
        }
    }

}
