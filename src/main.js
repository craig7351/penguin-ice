import * as THREE from 'three';
import { Board } from './World/Board.js';
import { SoundManager } from './SoundManager.js';
import '../style.css';


const scene = new THREE.Scene();
scene.background = new THREE.Color(0xaaccff); // Light blue sky

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 15, 10);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(10, 20, 10);
dirLight.castShadow = true;
scene.add(dirLight);

// Audio
const soundManager = new SoundManager();

// Game Board
const board = new Board(scene);
board.createGrid();

// Game State
let gameState = {
  active: false,
  players: ['', ''],
  currentTurn: 0 // 0 for Player 1, 1 for Player 2
};

// UI Elements
const startScreen = document.getElementById('start-screen');
const startBtn = document.getElementById('start-btn');
const p1Input = document.getElementById('player1-name');
const p2Input = document.getElementById('player2-name');
const hud = document.getElementById('hud');
const turnIndicator = document.getElementById('turn-indicator');
const gameOverEl = document.getElementById('game-over');
const gameOverText = document.getElementById('game-over-text');
const restartBtn = document.getElementById('restart-btn');

// Start Game Logic
startBtn.addEventListener('click', () => {
  gameState.players[0] = p1Input.value || 'Player A';
  gameState.players[1] = p2Input.value || 'Player B';

  gameState.active = true;
  gameState.currentTurn = 0;

  startScreen.classList.add('hidden');
  hud.classList.remove('hidden');
  updateTurnUI();

  if (soundManager.ctx.state === 'suspended') {
    soundManager.ctx.resume();
  }
});

function updateTurnUI() {
  const player = gameState.players[gameState.currentTurn];
  turnIndicator.textContent = `Turn: ${player}`;
}

function nextTurn() {
  gameState.currentTurn = (gameState.currentTurn + 1) % 2;
  updateTurnUI();
}

// Raycaster for interaction
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

window.addEventListener('pointerdown', (event) => {
  // Resume audio context
  if (soundManager.ctx.state === 'suspended') {
    soundManager.ctx.resume();
  }

  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);

  const intersects = raycaster.intersectObjects(scene.children);

  if (intersects.length > 0) {
    if (gameState.active) {
      const hitObject = intersects[0].object;
      const block = board.getBlockFromMesh(hitObject);
      if (block && !block.isFalling) {
        block.hit();
        soundManager.playBreakSound();
        nextTurn();
      }
    }
  }
});

// Animation Loop
function animate() {
  requestAnimationFrame(animate);
  board.update();
  renderer.render(scene, camera);
}
animate();

// Resize Handler
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

window.addEventListener('gameover', () => {
  gameState.active = false;
  soundManager.playGameOverSound();

  // Who lost? The player who just moved (currentTurn was switched AFTER move, wait...)
  // Logic: Player clicks -> Block falls -> nextTurn().
  // Penguin falls later.
  // The player whose turn it currently is? 
  // Wait, usually the penguin falls BECAUSE of the last move.
  // So the player who made the last move lost.
  // My nextTurn() switches turn IMMEDIATELY after click.
  // So if Player A clicks -> Turn becomes Player B -> Penguin falls.
  // Then the LOSER is Player A (who moved last).
  // The WINNER is Player B (current turn).

  const winnerIndex = gameState.currentTurn; // Since turn switched, current is the one who didn't break it
  const winner = gameState.players[winnerIndex];
  const loser = gameState.players[(winnerIndex + 1) % 2];

  gameOverText.textContent = `${loser} 讓企鵝掉下去了！\n${winner} 獲勝！`;

  gameOverEl.classList.remove('hidden');
  // Force reflow
  void gameOverEl.offsetWidth;
  gameOverEl.classList.add('visible');
  hud.classList.add('hidden');
});

restartBtn.addEventListener('click', () => {
  location.reload();
});
