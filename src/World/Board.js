import * as THREE from 'three';
import { IceBlock } from './IceBlock.js';
import { Penguin } from './Penguin.js';


export class Board {
    constructor(scene) {
        this.scene = scene;
        this.blocks = [];
        this.gridSize = 3; // Hexagonal grid radius
        this.penguin = null;
        this.gameOver = false;
    }


    createGrid() {
        const hexRadius = 1;
        const hexHeight = Math.sqrt(3) * hexRadius; // Height of hexagon
        const hexWidth = 2 * hexRadius;
        // Distance between centers
        const xOffset = hexWidth * 0.75;
        const zOffset = hexHeight;

        // Generate hexagonal grid
        // Using axial coordinates (q, r)
        for (let q = -this.gridSize; q <= this.gridSize; q++) {
            const r1 = Math.max(-this.gridSize, -q - this.gridSize);
            const r2 = Math.min(this.gridSize, -q + this.gridSize);
            for (let r = r1; r <= r2; r++) {
                const x = hexRadius * (3 / 2 * q);
                const z = hexRadius * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r);

                this.addBlock(x, z);
            }
        }

        // Add Penguin at center
        this.penguin = new Penguin(this.scene);
        this.penguin.setPosition(0, 0);
    }


    addBlock(x, z) {
        const block = new IceBlock(x, z);
        this.scene.add(block.mesh);
        this.blocks.push(block);
    }

    getBlockFromMesh(mesh) {
        return this.blocks.find(block => block.mesh === mesh);
    }

    update() {
        this.blocks.forEach(block => block.update());
        if (this.penguin) {
            this.penguin.update();

            // Check if penguin should fall
            if (!this.gameOver && !this.penguin.isFalling) {
                // Find block under penguin (simplified: assuming penguin at 0,0 for now, or track position)
                // Actually penguin doesn't move autonomously yet. It stays at 0,0.
                // So check block at 0,0.
                const centerBlock = this.blocks.find(b => Math.abs(b.mesh.position.x) < 0.1 && Math.abs(b.mesh.position.z) < 0.1);

                if (!centerBlock || centerBlock.isFalling) {
                    this.penguin.isFalling = true;
                    this.gameOver = true;
                    console.log("Game Over!");
                    // Dispatch event or UI update here
                    const event = new Event('gameover');
                    window.dispatchEvent(event);
                }
            }
        }
    }

}
