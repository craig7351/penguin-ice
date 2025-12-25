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
    const hitObject = intersects[0].object;
    const block = board.getBlockFromMesh(hitObject);
    if (block) {
      block.hit();
      soundManager.playBreakSound();
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

// Game Over UI logic
const gameOverEl = document.getElementById('game-over');
const restartBtn = document.getElementById('restart-btn');

window.addEventListener('gameover', () => {
  soundManager.playGameOverSound();
  gameOverEl.classList.remove('hidden');
  // Force reflow
  void gameOverEl.offsetWidth;
  gameOverEl.classList.add('visible');
});

restartBtn.addEventListener('click', () => {
  location.reload();
});
