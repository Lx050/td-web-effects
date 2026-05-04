import * as THREE from 'three';

let camera, scene, renderer;
let particles, particleGeometry;
let videoElement, videoCanvas, videoCtx;
let positions, colors, velocities, targetPositions, targetColors;
let particleCount = 0;
let time = 0;
let turbulence = 1.0;
let particleSize = 2.0;
let density = 4; // sample every N pixels
let isVideoReady = false;
let mouseX = 0, mouseY = 0;
let width, height;

init();
animate();

function init() {
  width = window.innerWidth;
  height = window.innerHeight;

  // Scene
  scene = new THREE.Scene();
  camera = new THREE.OrthographicCamera(
    -width / 2, width / 2,
    height / 2, -height / 2,
    1, 1000
  );
  camera.position.z = 500;

  renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('canvas'), antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000);

  // Video element
  videoElement = document.createElement('video');
  videoElement.playsInline = true;
  videoElement.muted = true;
  videoElement.loop = true;

  videoCanvas = document.createElement('canvas');
  videoCtx = videoCanvas.getContext('2d', { willReadFrequently: true });

  // Controls
  document.getElementById('webcamBtn').addEventListener('click', startWebcam);
  document.getElementById('videoInput').addEventListener('change', handleVideoUpload);
  document.getElementById('sizeSlider').addEventListener('input', (e) => {
    particleSize = parseFloat(e.target.value);
    if (particles) particles.material.size = particleSize;
  });
  document.getElementById('turbSlider').addEventListener('input', (e) => {
    turbulence = parseFloat(e.target.value);
  });
  document.getElementById('densitySlider').addEventListener('input', (e) => {
    density = parseInt(e.target.value);
    rebuildParticles();
  });

  // Mouse interaction
  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX - width / 2;
    mouseY = -(e.clientY - height / 2);
  });

  window.addEventListener('resize', onResize);

  // Start with a default gradient animation
  createDefaultParticles();
}

function startWebcam() {
  navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
    .then(stream => {
      videoElement.srcObject = stream;
      videoElement.play();
      videoElement.addEventListener('loadeddata', () => {
        isVideoReady = true;
        videoCanvas.width = videoElement.videoWidth;
        videoCanvas.height = videoElement.videoHeight;
        rebuildParticles();
      });
    })
    .catch(err => console.error('Webcam error:', err));
}

function handleVideoUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  videoElement.src = url;
  videoElement.play();
  videoElement.addEventListener('loadeddata', () => {
    isVideoReady = true;
    videoCanvas.width = videoElement.videoWidth;
    videoCanvas.height = videoElement.videoHeight;
    rebuildParticles();
  }, { once: true });
}

function createDefaultParticles() {
  const cols = Math.floor(width / density);
  const rows = Math.floor(height / density);
  particleCount = cols * rows;

  positions = new Float32Array(particleCount * 3);
  colors = new Float32Array(particleCount * 3);
  velocities = new Float32Array(particleCount * 3);
  targetPositions = new Float32Array(particleCount * 3);
  targetColors = new Float32Array(particleCount * 3);

  let i = 0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const px = (x * density) - width / 2;
      const py = -(y * density) + height / 2;
      positions[i * 3] = (Math.random() - 0.5) * width;
      positions[i * 3 + 1] = (Math.random() - 0.5) * height;
      positions[i * 3 + 2] = 0;
      targetPositions[i * 3] = px;
      targetPositions[i * 3 + 1] = py;
      targetPositions[i * 3 + 2] = 0;
      velocities[i * 3] = 0;
      velocities[i * 3 + 1] = 0;
      velocities[i * 3 + 2] = 0;

      const hue = (x / cols + y / rows) * 0.5;
      const color = new THREE.Color().setHSL(hue, 0.8, 0.6);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
      targetColors[i * 3] = color.r;
      targetColors[i * 3 + 1] = color.g;
      targetColors[i * 3 + 2] = color.b;
      i++;
    }
  }

  buildParticleSystem();
}

function rebuildParticles() {
  if (!isVideoReady) return;

  const vw = videoCanvas.width;
  const vh = videoCanvas.height;
  const scale = Math.min(width / vw, height / vh) * 0.9;
  const cols = Math.floor(vw / density);
  const rows = Math.floor(vh / density);
  particleCount = cols * rows;

  positions = new Float32Array(particleCount * 3);
  colors = new Float32Array(particleCount * 3);
  velocities = new Float32Array(particleCount * 3);
  targetPositions = new Float32Array(particleCount * 3);
  targetColors = new Float32Array(particleCount * 3);

  let i = 0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const px = (x * density - vw / 2) * scale;
      const py = -(y * density - vh / 2) * scale;
      positions[i * 3] = (Math.random() - 0.5) * width;
      positions[i * 3 + 1] = (Math.random() - 0.5) * height;
      positions[i * 3 + 2] = 0;
      targetPositions[i * 3] = px;
      targetPositions[i * 3 + 1] = py;
      targetPositions[i * 3 + 2] = 0;
      velocities[i * 3] = 0;
      velocities[i * 3 + 1] = 0;
      velocities[i * 3 + 2] = 0;
      colors[i * 3] = 1;
      colors[i * 3 + 1] = 1;
      colors[i * 3 + 2] = 1;
      targetColors[i * 3] = 1;
      targetColors[i * 3 + 1] = 1;
      targetColors[i * 3 + 2] = 1;
      i++;
    }
  }

  buildParticleSystem();
}

function buildParticleSystem() {
  if (particles) {
    scene.remove(particles);
    particleGeometry.dispose();
  }

  particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: particleSize,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: false,
  });

  particles = new THREE.Points(particleGeometry, material);
  scene.add(particles);
}

function sampleVideo() {
  if (!isVideoReady) return;

  videoCtx.drawImage(videoElement, 0, 0, videoCanvas.width, videoCanvas.height);
  const imageData = videoCtx.getImageData(0, 0, videoCanvas.width, videoCanvas.height);
  const data = imageData.data;

  const cols = Math.floor(videoCanvas.width / density);
  const rows = Math.floor(videoCanvas.height / density);

  let i = 0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const px = x * density;
      const py = y * density;
      const idx = (py * videoCanvas.width + px) * 4;
      targetColors[i * 3] = data[idx] / 255;
      targetColors[i * 3 + 1] = data[idx + 1] / 255;
      targetColors[i * 3 + 2] = data[idx + 2] / 255;
      i++;
      if (i >= particleCount) break;
    }
    if (i >= particleCount) break;
  }
}

function noise3D(x, y, z) {
  const n = Math.sin(x * 12.9898 + y * 78.233 + z * 45.164) * 43758.5453;
  return (n - Math.floor(n)) * 2 - 1;
}

function animate() {
  requestAnimationFrame(animate);
  time += 0.016;

  if (isVideoReady) {
    sampleVideo();
  }

  // Update particles
  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3;

    // Spring force toward target
    const dx = targetPositions[i3] - positions[i3];
    const dy = targetPositions[i3 + 1] - positions[i3 + 1];

    // Mouse repulsion
    const mx = positions[i3] - mouseX;
    const my = positions[i3 + 1] - mouseY;
    const md = mx * mx + my * my;
    const mouseRadius = 10000;
    let fx = 0, fy = 0;
    if (md < mouseRadius) {
      const force = (1 - md / mouseRadius) * 8;
      fx = mx * force / Math.sqrt(md + 1);
      fy = my * force / Math.sqrt(md + 1);
    }

    // Turbulence noise
    const nx = noise3D(positions[i3] * 0.003, positions[i3 + 1] * 0.003, time * 0.5) * turbulence;
    const ny = noise3D(positions[i3] * 0.003 + 100, positions[i3 + 1] * 0.003 + 100, time * 0.5) * turbulence;

    // Velocity update with damping
    velocities[i3] = velocities[i3] * 0.92 + (dx * 0.08 + fx + nx) * 0.5;
    velocities[i3 + 1] = velocities[i3 + 1] * 0.92 + (dy * 0.08 + fy + ny) * 0.5;

    positions[i3] += velocities[i3];
    positions[i3 + 1] += velocities[i3 + 1];

    // Color interpolation
    colors[i3] += (targetColors[i3] - colors[i3]) * 0.1;
    colors[i3 + 1] += (targetColors[i3 + 1] - colors[i3 + 1]) * 0.1;
    colors[i3 + 2] += (targetColors[i3 + 2] - colors[i3 + 2]) * 0.1;
  }

  particleGeometry.attributes.position.needsUpdate = true;
  particleGeometry.attributes.color.needsUpdate = true;

  renderer.render(scene, camera);
}

function onResize() {
  width = window.innerWidth;
  height = window.innerHeight;
  camera.left = -width / 2;
  camera.right = width / 2;
  camera.top = height / 2;
  camera.bottom = -height / 2;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}
