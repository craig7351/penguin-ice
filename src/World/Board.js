import * as THREE from 'three';
import { IceBlock } from './IceBlock.js';
import { Penguin } from './Penguin.js';

export class Board {
    constructor(scene) {
        this.scene = scene;
        this.blocks = [];
        this.blockMap = new Map(); // Key: "q,r", Value: Block
        this.gridSize = 3;
        this.penguin = null;
        this.gameOver = false;
    }

    createGrid() {
        const hexRadius = 1;
        // Generate hexagonal grid
        for (let q = -this.gridSize; q <= this.gridSize; q++) {
            const r1 = Math.max(-this.gridSize, -q - this.gridSize);
            const r2 = Math.min(this.gridSize, -q + this.gridSize);
            for (let r = r1; r <= r2; r++) {
                const x = hexRadius * (3 / 2 * q);
                const z = hexRadius * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r);

                this.addBlock(x, z, q, r);
            }
        }

        // Add Penguin at center
        this.penguin = new Penguin(this.scene);
        this.penguin.setPosition(0, 0);
    }

    addBlock(x, z, q, r) {
        const block = new IceBlock(x, z, q, r);
        this.scene.add(block.mesh);
        this.blocks.push(block);
        this.blockMap.set(`${q},${r}`, block);
    }

    getBlockFromMesh(mesh) {
        return this.blocks.find(block => block.mesh === mesh);
    }

    // Call this when a block is clicked
    breakBlock(block) {
        if (!block || block.isFalling) return;

        block.hit();

        // Check structural integrity
        this.checkStability();
    }

    checkStability() {
        // BFS to find all blocks connected to the "frame" (edge blocks)
        const visited = new Set();
        const queue = [];

        // 1. Identify Anchor Blocks (neighbors of the virtual boundary)
        // Actually, let's treat any block with max coordinate magnitude == gridSize as an anchor?
        // Or simpler: Any block that is NOT falling is a candidate.
        // But we need a source of stability.
        // Let's assume the outer ring (q, r distance from 0 is gridSize) is attached to the wall.

        this.blocks.forEach(block => {
            if (!block.isFalling) {
                // Distance in axial coords is max(|q|, |r|, |q+r|)
                // But simplified: Outer ring logic
                // If it's on the edge of the board, it's an anchor.
                const dist = Math.max(Math.abs(block.q), Math.abs(block.r), Math.abs(block.q + block.r));
                if (dist === this.gridSize) {
                    queue.push(block);
                    visited.add(`${block.q},${block.r}`);
                }
            }
        });

        // 2. BFS
        const directions = [
            { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
            { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 }
        ];

        let head = 0;
        while (head < queue.length) {
            const current = queue[head++];

            for (const dir of directions) {
                const nq = current.q + dir.q;
                const nr = current.r + dir.r;
                const key = `${nq},${nr}`;

                const neighbor = this.blockMap.get(key);
                if (neighbor && !neighbor.isFalling && !visited.has(key)) {
                    visited.add(key);
                    queue.push(neighbor);
                }
            }
        }

        // 3. Any non-falling block NOT visited must fall
        let anyNewFall = false;
        this.blocks.forEach(block => {
            if (!block.isFalling) {
                const key = `${block.q},${block.r}`;
                if (!visited.has(key)) {
                    block.hit(); // Make it fall physics-wise
                    anyNewFall = true;
                }
            }
        });

        // If blocks fell, we might want to sound effect? handled by block.hit()
    }

    update() {
        this.blocks.forEach(block => block.update());
        if (this.penguin) {
            this.penguin.update();

            // Check if penguin should fall
            if (!this.gameOver && !this.penguin.isFalling) {
                // Penguin is at 0,0. Check block at 0,0.
                const centerBlock = this.blockMap.get("0,0");

                if (!centerBlock || centerBlock.isFalling) {
                    this.penguin.isFalling = true;
                    this.gameOver = true;
                    const event = new Event('gameover');
                    window.dispatchEvent(event);
                }
            }
        }
    }
}
