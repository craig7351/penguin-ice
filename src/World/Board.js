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

        // Add Random Friction (0.5 to 1.0)
        // Higher friction = harder to slip
        block.friction = 0.5 + Math.random() * 0.5;

        this.scene.add(block.mesh);
        this.blocks.push(block);
        this.blockMap.set(`${q},${r}`, block);
    }

    getBlockFromMesh(mesh) {
        return this.blocks.find(block => block.mesh === mesh);
    }

    breakBlock(block) {
        if (!block || block.isFalling) return;

        block.hit();

        // Iteratively check physics until stable
        let unstable = true;
        let iteration = 0;

        while (unstable && iteration < 10) {
            unstable = false;

            // 1. Check Hard Connectivity (BFS to Anchors)
            const changesBFS = this.checkConnectivity();

            // 2. Check Structural Stress (Friction/Neighbors)
            const changesStress = this.checkStructuralStress();

            if (changesBFS || changesStress) {
                unstable = true;
            }
            iteration++;
        }
    }

    // Returns true if any block fell
    checkConnectivity() {
        const visited = new Set();
        const queue = [];

        // 1. Identify Anchor Blocks (Outer Ring)
        this.blocks.forEach(block => {
            if (!block.isFalling) {
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

        // 3. Mark disconnected blocks as falling
        let changed = false;
        this.blocks.forEach(block => {
            if (!block.isFalling) {
                const key = `${block.q},${block.r}`;
                if (!visited.has(key)) {
                    block.hit();
                    changed = true;
                }
            }
        });

        return changed;
    }

    // Returns true if any block fell
    checkStructuralStress() {
        let changed = false;

        const directions = [
            { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
            { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 }
        ];

        this.blocks.forEach(block => {
            if (!block.isFalling) {
                // Count active neighbors
                let neighbors = 0;
                for (const dir of directions) {
                    const key = `${block.q + dir.q},${block.r + dir.r}`;
                    const neighbor = this.blockMap.get(key);
                    if (neighbor && !neighbor.isFalling) {
                        neighbors++;
                    }
                }

                // Probability Check
                // User requirement: "Maybe fall if 3 touching"

                // Logic:
                // Neighbors 6, 5, 4: Very Stable (Will not fall due to friction usually)
                // Neighbors 3: Unstable. Chance to fall.
                // Neighbors 2: Very Unstable.
                // Neighbors 1: Almost certain fall.
                // Neighbors 0: (Covered by BFS usually, but handled here too)

                let stabilityScore = 1.0;

                if (neighbors >= 4) {
                    stabilityScore = 1.0;
                } else if (neighbors === 3) {
                    stabilityScore = 0.6; // 60% base stability
                } else if (neighbors === 2) {
                    stabilityScore = 0.3; // 30% base stability
                } else if (neighbors <= 1) {
                    stabilityScore = 0.0; // 0% base
                }

                // Final Check: Stability + Friction vs Random
                // block.friction is 0.5 ~ 1.0
                // We want:
                // IF (Stability * Friction) < RandomThreshold -> Fall
                // Let's simpler: Fall Probability

                let fallChance = 0;
                if (neighbors === 3) fallChance = 0.3; // 30% chance
                if (neighbors === 2) fallChance = 0.7; // 70% chance
                if (neighbors <= 1) fallChance = 0.95; // 95% chance

                // Friction reduces fall chance
                // newChance = fallChance * (1 - friction_factor)
                // If friction is high (1.0), chance becomes 0? No, high friction means sticky.
                // Let's say friction 1.0 reduces chance by 50%.

                // Adjust chance by friction (invserse)
                // Higher friction = Lower chance
                // Factor: (1.2 - block.friction) -> if friction 1.0, factor 0.2. if friction 0.5, factor 0.7
                fallChance = fallChance * (1.5 - block.friction);

                if (Math.random() < fallChance) {
                    block.hit();
                    changed = true;
                    // console.log(`Block at ${block.q},${block.r} slipped! (Neighbors: ${neighbors}, Friction: ${block.friction.toFixed(2)})`);
                }
            }
        });

        return changed;
    }

    update() {
        this.blocks.forEach(block => block.update());
        if (this.penguin) {
            this.penguin.update();

            // Check if penguin should fall
            if (!this.gameOver && !this.penguin.isFalling) {
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
