// --- Basic Setup ---
let scene, camera, renderer;
let bird, birdBox; // bird will be a THREE.Group
let pipes = [];
let collectibles = [];
let clouds;
const groundLevelY = -5;
let gameStarted = false;
let gameOver = false;
let score = 0;
let highScore = localStorage.getItem("flappyRunner3DHighScore") || 0;
const clock = new THREE.Clock();
const keysPressed = { left: false, right: false };

// --- Physics/Movement Variables ---
const gravity = 30;
const flapStrength = 10;
const maxFallSpeed = 15;
const forwardSpeed = 6;
let birdVelocityY = 0;
let birdVelocityX = 0;
const horizontalAcceleration = 40;
const maxHorizontalSpeed = 8;
const horizontalDrag = 0.92;
const horizontalBounds = 5;
const birdStartZ = 0;
const birdCollisionHeight = 0.1; // Half-height of the new bird model's body for collision checks

// --- Pipe Variables ---
const pipeGap = 4;
const pipeWidth = 1.5;
const pipeHeight = 10;
const pipeDistance = 12;
const numberOfPipes = 5;
const pipeColor = 0x73bf2e;
const pipeStartX = 40;
const maxPipeOscillation = 2.0;

// --- Collectible Variables ---
const numberOfCollectibles = 10;
const collectibleDistance = 8;
const collectibleSpawnAhead = 50;
const collectibleRotationSpeed = 2;
const collectibleColor = 0xffd700;
const collectibleSize = 0.3;
const collectibleScoreValue = 5;

// --- Cloud Variables ---
const cloudCount = 1500;
const cloudAreaWidth = 60;
const cloudAreaDepth = 120;
const cloudHeightVariance = 2;

// --- Camera Variables ---
const cameraOffset = new THREE.Vector3(0, 2.5, -6);
const cameraLookAtOffset = new THREE.Vector3(0, 0, 10);
const cameraDamping = 0.05;

// --- UI Elements ---
const scoreElement = document.getElementById("score");
const highScoreElement = document.getElementById("highScore");
const startScreen = document.getElementById("startScreen");
const gameOverScreen = document.getElementById("gameOverScreen");
const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");
const finalScoreElement = document.getElementById("finalScore");
const gameOverHighScoreElement = document.getElementById("gameOverHighScore");
const fullscreenButton = document.getElementById("fullscreenButton"); // Get fullscreen button

// --- Sound Effects (Tone.js) ---
let flapSound, scoreSound, collisionSound, collectSound;
let soundsReady = false;
let gsapLoaded = false;

// --- Initialization ---
function init() {
  console.log("Initializing game...");
  try {
    // Scene, Camera, Renderer, Lighting...
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x70c5ce);
    scene.fog = new THREE.Fog(0x70c5ce, 20, 70);
    camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(
      birdStartZ + cameraOffset.x,
      cameraOffset.y,
      cameraOffset.z
    );
    camera.lookAt(
      birdStartZ + cameraLookAtOffset.x,
      cameraLookAtOffset.y,
      cameraLookAtOffset.z
    );
    renderer = new THREE.WebGLRenderer({
      canvas: document.getElementById("gameCanvas"),
      antialias: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
    directionalLight.position.set(8, 15, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -30;
    directionalLight.shadow.camera.right = 30;
    directionalLight.shadow.camera.top = 30;
    directionalLight.shadow.camera.bottom = -30;
    scene.add(directionalLight);

    // Bird Model
    createBirdModel();
    bird.position.set(0, 2, birdStartZ);
    scene.add(bird);
    bird.updateMatrixWorld(true);
    birdBox = new THREE.Box3().setFromObject(bird);

    // Clouds, Pipes, Collectibles
    createClouds();
    createPipes();
    createCollectibles();

    // Sounds
    initSounds().catch((err) => {
      console.error("Initial sound init failed:", err);
    });

    // Event Listeners
    setupEventListeners(); // Encapsulate event listener setup

    // Initial UI
    updateHighScoreDisplay();
    updateFullscreenButtonText(); // Set initial button text

    console.log("Initialization complete. Starting animation loop.");
    animate();
  } catch (error) {
    console.error("Error during initialization:", error);
    document.body.innerHTML = `<div style="color: red; padding: 20px; font-family: sans-serif;">An error occurred during initialization. Please check the console (F12).<br><pre>${error.stack}</pre></div>`;
  }
}

// --- Setup Event Listeners ---
function setupEventListeners() {
  startButton.addEventListener("click", startGame);
  restartButton.addEventListener("click", restartGame);
  window.addEventListener("resize", onWindowResize, false);
  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);
  window.addEventListener("mousedown", handleFlapInput);
  window.addEventListener("touchstart", handleFlapInput, { passive: false });

  // Fullscreen Button Listener
  fullscreenButton.addEventListener("click", toggleFullScreen);
  // Listener for changes in fullscreen state (e.g., user pressing Esc)
  document.addEventListener("fullscreenchange", updateFullscreenButtonText);
}

// --- Fullscreen Logic ---
function toggleFullScreen() {
  if (!document.fullscreenElement) {
    // Enter fullscreen
    document.documentElement
      .requestFullscreen()
      .then(() => console.log("Entered fullscreen"))
      .catch((err) => {
        console.error(
          `Error attempting to enable full-screen mode: ${err.message} (${err.name})`
        );
        // alert(`Fullscreen request failed: ${err.message}`); // Avoid alert
      });
  } else {
    // Exit fullscreen
    if (document.exitFullscreen) {
      document
        .exitFullscreen()
        .then(() => console.log("Exited fullscreen"))
        .catch((err) => console.error("Error exiting fullscreen:", err));
    }
  }
}

function updateFullscreenButtonText() {
  if (fullscreenButton) {
    // Check if button exists
    if (document.fullscreenElement) {
      fullscreenButton.textContent = "Exit Fullscreen";
    } else {
      fullscreenButton.textContent = "Fullscreen";
    }
  }
}

// --- Create Bird Model ---
function createBirdModel() {
  bird = new THREE.Group();
  const bodyMaterial = new THREE.MeshPhongMaterial({
    color: 0xffff00,
    flatShading: false,
  });
  const wingMaterial = new THREE.MeshPhongMaterial({
    color: 0xf0f0f0,
    flatShading: false,
  });
  const bodyGeometry = new THREE.BoxGeometry(0.6, 0.2, 1.0);
  const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
  bodyMesh.castShadow = true;
  bird.add(bodyMesh);
  const wingGeometry = new THREE.BoxGeometry(0.8, 0.1, 0.4);
  const leftWingMesh = new THREE.Mesh(wingGeometry, wingMaterial);
  leftWingMesh.castShadow = true;
  leftWingMesh.position.set(-0.6, 0.05, -0.1);
  leftWingMesh.rotation.z = Math.PI / 12;
  bird.add(leftWingMesh);
  const rightWingMesh = new THREE.Mesh(wingGeometry, wingMaterial);
  rightWingMesh.castShadow = true;
  rightWingMesh.position.set(0.6, 0.05, -0.1);
  rightWingMesh.rotation.z = -Math.PI / 12;
  bird.add(rightWingMesh);
  const tailGeometry = new THREE.BoxGeometry(0.2, 0.1, 0.4);
  const tailMesh = new THREE.Mesh(tailGeometry, bodyMaterial);
  tailMesh.castShadow = true;
  tailMesh.position.set(0, 0, 0.6);
  bird.add(tailMesh);
  console.log("Bird model created.");
}

// --- Create Cloud Ground ---
function createClouds() {
  const vertices = [];
  const cloudTexture = createCloudTexture();
  for (let i = 0; i < cloudCount; i++) {
    const x = Math.random() * cloudAreaWidth - cloudAreaWidth / 2;
    const y = groundLevelY - Math.random() * cloudHeightVariance;
    const z = Math.random() * cloudAreaDepth - cloudAreaDepth / 2;
    vertices.push(x, y, z);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3)
  );
  const material = new THREE.PointsMaterial({
    size: 6,
    map: cloudTexture,
    blending: THREE.NormalBlending,
    depthWrite: false,
    transparent: true,
    opacity: 0.65,
    sizeAttenuation: true,
  });
  clouds = new THREE.Points(geometry, material);
  scene.add(clouds);
  console.log("Cloud system created with", cloudCount, "points.");
}

// --- Dynamically Create Cloud Texture ---
function createCloudTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext("2d");
  const gradient = context.createRadialGradient(
    canvas.width / 2,
    canvas.height / 2,
    0,
    canvas.width / 2,
    canvas.height / 2,
    canvas.width / 2
  );
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.5, "rgba(255,255,255,0.8)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// --- Sound Initialization ---
async function initSounds() {
  try {
    await Tone.start();
    flapSound = new Tone.Synth({
      oscillator: { type: "sine" },
      envelope: { attack: 0.01, decay: 0.1, sustain: 0.01, release: 0.1 },
    }).toDestination();
    scoreSound = new Tone.Synth({
      oscillator: { type: "triangle" },
      envelope: { attack: 0.01, decay: 0.1, sustain: 0.05, release: 0.2 },
    }).toDestination();
    collisionSound = new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.005, decay: 0.1, sustain: 0, release: 0.1 },
    }).toDestination();
    collectSound = new Tone.Synth({
      oscillator: { type: "square" },
      envelope: { attack: 0.005, decay: 0.1, sustain: 0.05, release: 0.1 },
      volume: -6,
    }).toDestination();
    console.log("Tone.js sounds initialized/re-initialized.");
    soundsReady = true;
  } catch (e) {
    console.error("Could not initialize Tone.js:", e);
    soundsReady = false;
    throw e;
  }
}

// --- Game State Functions ---
function startGame() {
  if (
    !soundsReady &&
    Tone &&
    Tone.context &&
    Tone.context.state !== "running"
  ) {
    console.warn(
      "Sounds not ready and context not running, attempting init..."
    );
    initSounds()
      .then(() => {
        if (soundsReady) proceedStart();
        else console.error("Audio could not be initialized after interaction.");
      })
      .catch((err) => {
        console.error("Error during sound init on start:", err);
      });
  } else if (!soundsReady) {
    console.warn(
      "Sounds context is running, but sounds not marked ready. Proceeding without sound init attempt."
    );
    proceedStart();
  } else {
    proceedStart();
  }
}
function proceedStart() {
  console.log("Starting game...");
  gameStarted = true;
  gameOver = false;
  score = 0;
  birdVelocityY = 0;
  birdVelocityX = 0;
  if (bird) {
    bird.position.set(0, 2, birdStartZ);
    bird.rotation.set(0, 0, 0);
  } else {
    console.error("Bird object not found during proceedStart!");
    return;
  }
  keysPressed.left = false;
  keysPressed.right = false;
  resetPipes();
  resetCollectibles();
  startScreen.style.display = "none";
  gameOverScreen.style.display = "none";
  scoreElement.style.display = "block";
  highScoreElement.style.display = "block";
  updateScoreDisplay();
  updateHighScoreDisplay();
  if (clock) clock.start();
}
function triggerGameOver() {
  if (gameOver) return;
  console.log("Game Over!");
  gameOver = true;
  gameStarted = false;
  if (clock) clock.stop();
  if (soundsReady && collisionSound) {
    try {
      collisionSound.triggerAttackRelease("8n");
    } catch (e) {
      console.error("Collision sound error:", e);
    }
  }
  finalScoreElement.textContent = `Your Score: ${score}`;
  if (score > highScore) {
    highScore = score;
    localStorage.setItem("flappyRunner3DHighScore", highScore);
    console.log("New High Score!", highScore);
  }
  gameOverHighScoreElement.textContent = `High Score: ${highScore}`;
  gameOverScreen.style.display = "flex";
  scoreElement.style.display = "none";
}
function restartGame() {
  console.log("Restarting game...");
  startGame();
}

// --- Input Handling ---
function handleKeyDown(event) {
  if (!gameStarted || gameOver) return;
  switch (event.code) {
    case "ArrowLeft":
    case "KeyA":
      keysPressed.right = true;
      break;
    case "ArrowRight":
    case "KeyD":
      keysPressed.left = true;
      break;
    case "Space":
      flap();
      break;
  }
}
function handleKeyUp(event) {
  switch (event.code) {
    case "ArrowLeft":
    case "KeyA":
      keysPressed.right = false;
      break;
    case "ArrowRight":
    case "KeyD":
      keysPressed.left = false;
      break;
  }
}
function handleFlapInput(event) {
  if (!gameStarted || gameOver) return;
  if (event && event.target && event.target.classList.contains("button"))
    return;
  if (event.type === "mousedown" || event.type === "touchstart") {
    if (event.type === "touchstart") event.preventDefault();
    flap();
  }
}

// --- Core Gameplay Mechanics ---
function flap() {
  if (soundsReady && flapSound) {
    try {
      flapSound.triggerAttackRelease("C5", "16n");
    } catch (e) {
      console.error("Flap sound error:", e);
    }
  }
  birdVelocityY = flapStrength;
  if (gsapLoaded && typeof gsap !== "undefined") {
    gsap.killTweensOf(bird.rotation);
    gsap.to(bird.rotation, {
      z: Math.PI / 4,
      duration: 0.15,
      ease: "power1.out",
      onComplete: () => {
        if (!gameOver) {
          gsap.to(bird.rotation, {
            z: -Math.PI / 6,
            duration: 0.5,
            ease: "power1.in",
          });
        }
      },
    });
  } else {
    if (bird) bird.rotation.z = Math.PI / 6;
  }
}
function updateBird(delta) {
  try {
    if (!gameStarted || !bird) return;
    birdVelocityY -= gravity * delta;
    birdVelocityY = Math.max(birdVelocityY, -maxFallSpeed);
    bird.position.y += birdVelocityY * delta;
    let accelerationX = 0;
    if (keysPressed.left) accelerationX -= horizontalAcceleration;
    if (keysPressed.right) accelerationX += horizontalAcceleration;
    birdVelocityX += accelerationX * delta;
    if (
      accelerationX === 0 ||
      Math.sign(accelerationX) !== Math.sign(birdVelocityX)
    ) {
      birdVelocityX *= Math.pow(horizontalDrag, delta * 60);
      if (Math.abs(birdVelocityX) < 0.1) birdVelocityX = 0;
    }
    birdVelocityX = Math.max(
      -maxHorizontalSpeed,
      Math.min(maxHorizontalSpeed, birdVelocityX)
    );
    bird.position.x += birdVelocityX * delta;
    bird.position.x = Math.max(
      -horizontalBounds,
      Math.min(horizontalBounds, bird.position.x)
    );
    bird.position.z = birdStartZ;
    bird.updateMatrixWorld(true);
    birdBox.setFromObject(bird);
    if (bird.position.y - birdCollisionHeight <= groundLevelY) {
      bird.position.y = groundLevelY + birdCollisionHeight;
      birdVelocityY = 0;
      triggerGameOver();
      return;
    }
    const ceilingY = 10;
    if (bird.position.y + birdCollisionHeight >= ceilingY) {
      bird.position.y = ceilingY - birdCollisionHeight;
      if (birdVelocityY > 0) birdVelocityY = -1;
    }
    if (
      gsapLoaded &&
      typeof gsap !== "undefined" &&
      !gsap.isTweening(bird.rotation)
    ) {
      const targetRotationZ = Math.max(
        -Math.PI / 6,
        Math.min(Math.PI / 8, birdVelocityY * 0.05)
      );
      const targetRotationY = birdVelocityX * -0.1;
      bird.rotation.z += (targetRotationZ - bird.rotation.z) * 0.1;
      bird.rotation.y += (targetRotationY - bird.rotation.y) * 0.1;
    } else if (!gsapLoaded) {
      if (birdVelocityY < -1) bird.rotation.z = -Math.PI / 8;
      else bird.rotation.z = 0;
      bird.rotation.y = birdVelocityX * -0.05;
    }
  } catch (error) {
    console.error("Error in updateBird:", error);
    triggerGameOver();
  }
}

// --- Pipe Management ---
function createPipes() {
  const pipeMaterial = new THREE.MeshPhongMaterial({ color: pipeColor });
  const pipeGeometry = new THREE.BoxGeometry(pipeWidth, pipeHeight, pipeWidth);
  for (let i = 0; i < numberOfPipes; i++) {
    const topPipe = new THREE.Mesh(pipeGeometry, pipeMaterial.clone());
    topPipe.castShadow = true;
    topPipe.receiveShadow = true;
    const bottomPipe = new THREE.Mesh(pipeGeometry, pipeMaterial.clone());
    bottomPipe.castShadow = true;
    bottomPipe.receiveShadow = true;
    const pipePair = {
      top: topPipe,
      bottom: bottomPipe,
      topBox: new THREE.Box3(),
      bottomBox: new THREE.Box3(),
      passed: false,
      oscillationAmplitude: Math.random() * maxPipeOscillation,
      oscillationFrequency: 0.5 + Math.random() * 0.5,
      oscillationOffset: Math.random() * Math.PI * 2,
    };
    positionPipePair(pipePair, pipeStartX + i * pipeDistance);
    scene.add(topPipe);
    scene.add(bottomPipe);
    pipes.push(pipePair);
  }
}
function positionPipePair(pipePair, zPos) {
  const minGapCenterY = -1;
  const maxGapCenterY = 4;
  const gapCenterY =
    Math.random() * (maxGapCenterY - minGapCenterY) + minGapCenterY;
  const baseX = 0;
  const horizontalOffset = 0;
  pipePair.top.position.set(
    baseX + horizontalOffset,
    gapCenterY + pipeGap / 2 + pipeHeight / 2,
    zPos
  );
  pipePair.bottom.position.set(
    baseX + horizontalOffset,
    gapCenterY - pipeGap / 2 - pipeHeight / 2,
    zPos
  );
  pipePair.passed = false;
  pipePair.top.updateMatrixWorld(true);
  pipePair.bottom.updateMatrixWorld(true);
  pipePair.topBox.setFromObject(pipePair.top);
  pipePair.bottomBox.setFromObject(pipePair.bottom);
}
function updatePipes(delta, time) {
  /* ... no changes, includes try/catch ... */
  try {
    if (!gameStarted) return;
    const moveDistance = forwardSpeed * delta;
    for (let i = 0; i < pipes.length; i++) {
      const pipePair = pipes[i];
      pipePair.top.position.z -= moveDistance;
      pipePair.bottom.position.z -= moveDistance;
      const horizontalOffset =
        Math.sin(
          time * pipePair.oscillationFrequency + pipePair.oscillationOffset
        ) * pipePair.oscillationAmplitude;
      pipePair.top.position.x = horizontalOffset;
      pipePair.bottom.position.x = horizontalOffset;
      pipePair.top.updateMatrixWorld(true);
      pipePair.bottom.updateMatrixWorld(true);
      pipePair.topBox.setFromObject(pipePair.top);
      pipePair.bottomBox.setFromObject(pipePair.bottom);
      if (
        Math.abs(pipePair.top.position.z - bird.position.z) <
        pipeWidth / 2 + 0.5
      ) {
        if (
          birdBox.intersectsBox(pipePair.topBox) ||
          birdBox.intersectsBox(pipePair.bottomBox)
        ) {
          triggerGameOver();
          return;
        }
      }
      if (!pipePair.passed && pipePair.top.position.z < bird.position.z) {
        score++;
        pipePair.passed = true;
        updateScoreDisplay();
        if (soundsReady && scoreSound)
          try {
            scoreSound.triggerAttackRelease("E5", "16n");
          } catch (e) {
            console.error("Score sound error:", e);
          }
        console.log("Pipe Passed, Score:", score);
      }
      if (pipePair.top.position.z < birdStartZ - pipeDistance * 1.5) {
        let maxZ = 0;
        pipes.forEach((p) => {
          if (p !== pipePair) maxZ = Math.max(maxZ, p.top.position.z);
        });
        pipePair.oscillationAmplitude = Math.random() * maxPipeOscillation;
        pipePair.oscillationFrequency = 0.5 + Math.random() * 0.5;
        pipePair.oscillationOffset = Math.random() * Math.PI * 2;
        positionPipePair(pipePair, maxZ + pipeDistance);
      }
    }
  } catch (error) {
    console.error("Error in updatePipes:", error);
    triggerGameOver();
  }
}
function resetPipes() {
  for (let i = 0; i < pipes.length; i++) {
    pipes[i].oscillationAmplitude = Math.random() * maxPipeOscillation;
    pipes[i].oscillationFrequency = 0.5 + Math.random() * 0.5;
    pipes[i].oscillationOffset = Math.random() * Math.PI * 2;
    positionPipePair(pipes[i], pipeStartX + i * pipeDistance);
  }
}

// --- Collectible Management ---
function createCollectibles() {
  const collectibleGeometry = new THREE.IcosahedronGeometry(collectibleSize, 0);
  const collectibleMaterial = new THREE.MeshPhongMaterial({
    color: collectibleColor,
    emissive: 0xaaaa00,
    flatShading: true,
  });
  for (let i = 0; i < numberOfCollectibles; i++) {
    const mesh = new THREE.Mesh(collectibleGeometry, collectibleMaterial);
    mesh.castShadow = true;
    const box = new THREE.Box3();
    const collectible = { mesh: mesh, box: box, isActive: false };
    scene.add(mesh);
    collectibles.push(collectible);
  }
}
function positionCollectible(collectible, zPos) {
  const xPos = (Math.random() - 0.5) * (horizontalBounds * 1.8);
  const yPos = 1 + (Math.random() - 0.5) * 3;
  collectible.mesh.position.set(xPos, yPos, zPos);
  collectible.mesh.rotation.set(
    Math.random() * Math.PI,
    Math.random() * Math.PI,
    Math.random() * Math.PI
  );
  collectible.mesh.visible = true;
  collectible.isActive = true;
  collectible.mesh.updateMatrixWorld(true);
  collectible.box.setFromObject(collectible.mesh);
}
function updateCollectibles(delta) {
  /* ... no changes, includes try/catch ... */
  try {
    if (!gameStarted) return;
    const moveDistance = forwardSpeed * delta;
    let lastCollectibleZ = 0;
    let activeCount = 0;
    collectibles.forEach((collectible) => {
      if (!collectible.isActive) return;
      activeCount++;
      collectible.mesh.position.z -= moveDistance;
      collectible.mesh.rotation.y += collectibleRotationSpeed * delta;
      collectible.mesh.rotation.x += collectibleRotationSpeed * 0.5 * delta;
      collectible.mesh.updateMatrixWorld(true);
      collectible.box.setFromObject(collectible.mesh);
      if (birdBox.intersectsBox(collectible.box)) {
        console.log("Collectible collected!");
        score += collectibleScoreValue;
        updateScoreDisplay();
        if (soundsReady && collectSound)
          try {
            collectSound.triggerAttackRelease("G5", "16n");
          } catch (e) {
            console.error("Collect sound error:", e);
          }
        collectible.isActive = false;
        collectible.mesh.visible = false;
        activeCount--;
      }
      if (collectible.mesh.position.z < birdStartZ - 5) {
        collectible.isActive = false;
        collectible.mesh.visible = false;
        activeCount--;
      }
      if (collectible.isActive) {
        lastCollectibleZ = Math.max(
          lastCollectibleZ,
          collectible.mesh.position.z
        );
      }
    });
    const inactiveCollectible = collectibles.find((c) => !c.isActive);
    if (inactiveCollectible && activeCount < numberOfCollectibles) {
      const spawnTriggerZ =
        lastCollectibleZ > 0 ? lastCollectibleZ : bird.position.z;
      if (spawnTriggerZ < birdStartZ + collectibleSpawnAhead) {
        positionCollectible(
          inactiveCollectible,
          birdStartZ +
            collectibleSpawnAhead +
            Math.random() * collectibleDistance
        );
        console.log(
          "Spawned collectible at Z:",
          inactiveCollectible.mesh.position.z
        );
      }
    } else if (activeCount >= numberOfCollectibles) {
    }
  } catch (error) {
    console.error("Error in updateCollectibles:", error);
    triggerGameOver();
  }
}
function resetCollectibles() {
  let currentZ = birdStartZ + pipeStartX;
  collectibles.forEach((collectible) => {
    currentZ += collectibleDistance * (1 + Math.random());
    positionCollectible(collectible, currentZ);
  });
}

// --- UI Update Functions ---
function updateScoreDisplay() {
  if (scoreElement) scoreElement.textContent = `Score: ${score}`;
}
function updateHighScoreDisplay() {
  if (highScoreElement)
    highScoreElement.textContent = `High Score: ${highScore}`;
}

// --- Handle Window Resize ---
function onWindowResize() {
  if (camera && renderer) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

// --- Animation Loop ---
function animate() {
  /* ... no changes, includes try/catch blocks ... */
  try {
    requestAnimationFrame(animate);
  } catch (e) {
    console.error("Error requesting next frame:", e);
    return;
  }
  let delta = 0;
  let elapsedTime = 0;
  try {
    if (clock) {
      delta = clock.getDelta();
      elapsedTime = clock.getElapsedTime();
    } else {
      console.error("Clock not initialized!");
      delta = 1 / 60;
    }
  } catch (e) {
    console.error("Error getting delta time:", e);
    delta = 1 / 60;
  }
  if (gameStarted && !gameOver && delta < 0.1) {
    try {
      updateBird(delta);
    } catch (e) {
      console.error("Error during updateBird:", e);
      triggerGameOver();
    }
    if (!gameOver) {
      try {
        updatePipes(delta, elapsedTime);
      } catch (e) {
        console.error("Error during updatePipes:", e);
        triggerGameOver();
      }
    }
    if (!gameOver) {
      try {
        updateCollectibles(delta);
      } catch (e) {
        console.error("Error during updateCollectibles:", e);
        triggerGameOver();
      }
    }
  }
  try {
    if (bird && camera && camera.position && camera.lookAt) {
      updateCamera();
    }
  } catch (e) {
    console.error("Error during updateCamera:", e);
  }
  try {
    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    } else {
      console.error("Renderer, Scene or Camera not available for rendering.");
    }
  } catch (e) {
    console.error("Error during render:", e);
  }
}

// --- Camera Update ---
function updateCamera() {
  if (!bird || !camera) return;
  const targetPosition = new THREE.Vector3(
    bird.position.x + cameraOffset.x,
    bird.position.y + cameraOffset.y,
    bird.position.z + cameraOffset.z
  );
  const effectiveDamping = 1 - Math.pow(cameraDamping, clock.getDelta() * 60);
  camera.position.lerp(targetPosition, Math.min(effectiveDamping, 1));
  const lookAtTarget = new THREE.Vector3(
    bird.position.x + cameraLookAtOffset.x,
    bird.position.y + cameraLookAtOffset.y,
    bird.position.z + cameraLookAtOffset.z
  );
  camera.lookAt(lookAtTarget);
}

// --- Script Execution ---
window.onload = () => {
  console.log("Window loaded. Loading GSAP...");
  const gsapScript = document.createElement("script");
  gsapScript.src =
    "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.9.1/gsap.min.js";
  gsapScript.onload = () => {
    console.log("GSAP loaded successfully.");
    gsapLoaded = true;
    init();
  };
  gsapScript.onerror = (err) => {
    console.error("Failed to load GSAP. Flap animation will be basic.", err);
    gsapLoaded = false;
    init();
  };
  document.head.appendChild(gsapScript);
};
