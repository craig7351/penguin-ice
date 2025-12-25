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

        // Directions for neighbor lookup
        this.directions = [
            { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
            { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 }
        ];
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

        // Initial Friction (0.8 default)
        block.friction = 0.8;
        // Small random offset +/- 0.05
        block.friction += (Math.random() * 0.1 - 0.05);

        this.scene.add(block.mesh);
        this.blocks.push(block);
        this.blockMap.set(`${q},${r}`, block);
    }

    setGlobalFriction(value) {
        this.blocks.forEach(block => {
            // Apply new base friction + keep random variance
            // Note: Currently we just reset variance or keep old?
            // Let's generate new variance to be simple
            block.friction = value + (Math.random() * 0.1 - 0.05);
        });
    }

    getBlockFromMesh(mesh) {
        return this.blocks.find(block => block.mesh === mesh);
    }

    getNeighbors(block) {
        const neighbors = [];
        for (const dir of this.directions) {
            const key = `${block.q + dir.q},${block.r + dir.r}`;
            const neighbor = this.blockMap.get(key);
            if (neighbor && !neighbor.isFalling) {
                neighbors.push(neighbor);
            }
        }
        return neighbors;
    }

    // Call this when a block is clicked
    breakBlock(initialBlock) {
        if (!initialBlock || initialBlock.isFalling) return;

        initialBlock.hit();

        // Queue of blocks that need to be checked for stability
        // Initialize with neighbors of the broken block
        let checkQueue = this.getNeighbors(initialBlock);

        // To prevent infinite re-checking in same frame, though state change prevents it
        // We use an iterative approach to propagate changes

        let iteration = 0;
        const maxIterations = 20;

        while ((checkQueue.length > 0) && iteration < maxIterations) {
            iteration++;
            const nextQueue = [];
            const processedKeys = new Set();

            // 1. Stress Check (Probabilistic Friction Check) specific to queue
            checkQueue.forEach(block => {
                if (block.isFalling) return;
                if (processedKeys.has(`${block.q},${block.r}`)) return;
                processedKeys.add(`${block.q},${block.r}`);

                const neighbors = this.countActiveNeighbors(block);

                // Probability logic...
                let fallChance = 0;
                if (neighbors >= 4) {
                    fallChance = 0;
                } else if (neighbors === 3) {
                    fallChance = 0.2; // Reduced probability
                } else if (neighbors === 2) {
                    fallChance = 0.5;
                } else if (neighbors <= 1) {
                    fallChance = 0.9;
                }

                // Modify by friction
                fallChance = fallChance * (1.2 - block.friction);

                if (Math.random() < fallChance) {
                    block.hit();
                    // Add its neighbors to next queue
                    const myNeighbors = this.getNeighbors(block);
                    myNeighbors.forEach(nb => nextQueue.push(nb));
                }
            });

            // 2. Global Connectivity (Islands)
            // If any blocks fell, we must ensure no floating islands exist.
            // This is deterministic. If an island is created, it MUST fall.
            // We run this every iteration if needed, OR just once at end?
            // Better to run it, because a falling block from Stress might create an island.
            const fallenFromConnectivity = this.checkConnectivity();

            if (fallenFromConnectivity.length > 0) {
                fallenFromConnectivity.forEach(block => {
                    // Add their neighbors to next queue for stress check
                    const myNeighbors = this.getNeighbors(block);
                    myNeighbors.forEach(nb => nextQueue.push(nb));
                });
            }

            // Deduplicate nextQueue
            checkQueue = [...new Set(nextQueue)];
        }
    }

    countActiveNeighbors(block) {
        let count = 0;
        for (const dir of this.directions) {
            const key = `${block.q + dir.q},${block.r + dir.r}`;
            const neighbor = this.blockMap.get(key);
            if (neighbor && !neighbor.isFalling) {
                count++;
            }
        }
        return count;
    }

    // Returns array of blocks that fell due to disconnectedness
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
        let head = 0;
        while (head < queue.length) {
            const current = queue[head++];
            for (const dir of this.directions) {
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

        // 3. Any non-falling block NOT visited is an island
        const fellBlocks = [];
        this.blocks.forEach(block => {
            if (!block.isFalling) {
                const key = `${block.q},${block.r}`;
                if (!visited.has(key)) {
                    block.hit();
                    fellBlocks.push(block);
                }
            }
        });

        return fellBlocks;
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
