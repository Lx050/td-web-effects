const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let width, height;
let particles = [];
let textTargets = [];
let isConverging = true;
let flowStrength = 2.0;
let inkSpread = 1.2;
let speed = 0.04;
let time = 0;
let currentText = '墨韵';
let mouseX = 0, mouseY = 0;
let isMouseDown = false;

const PARTICLE_COUNT = 15000;
const INK_COLORS = [
  'rgba(20, 20, 30, ',
  'rgba(40, 35, 50, ',
  'rgba(60, 50, 70, ',
  'rgba(30, 25, 40, ',
  'rgba(50, 40, 55, ',
];

function init() {
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('mousemove', (e) => { mouseX = e.clientX; mouseY = e.clientY; });
  window.addEventListener('mousedown', () => { isMouseDown = true; });
  window.addEventListener('mouseup', () => { isMouseDown = false; });

  document.getElementById('disperseBtn').addEventListener('click', () => {
    isConverging = false;
    document.getElementById('disperseBtn').classList.add('active');
    document.getElementById('convergeBtn').classList.remove('active');
  });
  document.getElementById('convergeBtn').addEventListener('click', () => {
    isConverging = true;
    document.getElementById('convergeBtn').classList.add('active');
    document.getElementById('disperseBtn').classList.remove('active');
  });
  document.getElementById('flowSlider').addEventListener('input', (e) => {
    flowStrength = parseFloat(e.target.value);
  });
  document.getElementById('spreadSlider').addEventListener('input', (e) => {
    inkSpread = parseFloat(e.target.value);
  });
  document.getElementById('speedSlider').addEventListener('input', (e) => {
    speed = parseFloat(e.target.value);
  });
  document.getElementById('textInput').addEventListener('input', (e) => {
    currentText = e.target.value || '墨';
    generateTextTargets();
  });

  createParticles();
  generateTextTargets();
  animate();
}

function resize() {
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width;
  canvas.height = height;
  if (currentText) generateTextTargets();
}

function createParticles() {
  particles = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      targetX: width / 2,
      targetY: height / 2,
      size: Math.random() * 3 + 1,
      color: INK_COLORS[Math.floor(Math.random() * INK_COLORS.length)],
      opacity: Math.random() * 0.6 + 0.3,
      life: Math.random(),
      noiseOffsetX: Math.random() * 1000,
      noiseOffsetY: Math.random() * 1000,
    });
  }
}

function generateTextTargets() {
  // Render text to offscreen canvas and sample positions
  const offCanvas = document.createElement('canvas');
  const offCtx = offCanvas.getContext('2d');
  offCanvas.width = width;
  offCanvas.height = height;

  const fontSize = Math.min(width, height) * 0.35;
  offCtx.font = `bold ${fontSize}px "SimSun", "STSong", serif`;
  offCtx.textAlign = 'center';
  offCtx.textBaseline = 'middle';
  offCtx.fillStyle = '#000';
  offCtx.fillText(currentText, width / 2, height / 2);

  const imageData = offCtx.getImageData(0, 0, width, height);
  const data = imageData.data;

  textTargets = [];
  const step = 3;
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const idx = (y * width + x) * 4;
      if (data[idx + 3] > 128) {
        textTargets.push({ x, y });
      }
    }
  }

  // Assign targets to particles
  if (textTargets.length > 0) {
    for (let i = 0; i < particles.length; i++) {
      const target = textTargets[i % textTargets.length];
      // Add slight randomness for ink-wash texture
      particles[i].targetX = target.x + (Math.random() - 0.5) * 4 * inkSpread;
      particles[i].targetY = target.y + (Math.random() - 0.5) * 4 * inkSpread;
    }
  }
}

function simplex2D(x, y) {
  // Simple pseudo-noise for fluid flow
  const n1 = Math.sin(x * 0.8 + y * 1.2) * Math.cos(y * 0.9 - x * 0.7);
  const n2 = Math.sin(x * 1.5 - y * 0.8) * Math.cos(y * 1.3 + x * 0.4);
  return (n1 + n2) * 0.5;
}

function curlNoise(x, y, t) {
  const eps = 0.01;
  const n1 = simplex2D(x, y + eps + t * 0.3);
  const n2 = simplex2D(x, y - eps + t * 0.3);
  const n3 = simplex2D(x + eps, y + t * 0.3);
  const n4 = simplex2D(x - eps, y + t * 0.3);

  const dx = (n1 - n2) / (2 * eps);
  const dy = -(n3 - n4) / (2 * eps);

  return { x: dx, y: dy };
}

function animate() {
  requestAnimationFrame(animate);
  time += 0.01;

  // Semi-transparent background for trail effect
  ctx.fillStyle = 'rgba(245, 240, 232, 0.08)';
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];

    // Curl noise for fluid flow
    const noiseScale = 0.003;
    const curl = curlNoise(
      (p.x + p.noiseOffsetX) * noiseScale,
      (p.y + p.noiseOffsetY) * noiseScale,
      time
    );

    if (isConverging) {
      // Converge toward text targets
      const dx = p.targetX - p.x;
      const dy = p.targetY - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Stronger pull when far, gentler close
      const pullStrength = speed * Math.min(dist * 0.01, 1);

      p.vx += dx * pullStrength + curl.x * flowStrength * (dist > 20 ? 1 : 0.2);
      p.vy += dy * pullStrength + curl.y * flowStrength * (dist > 20 ? 1 : 0.2);

      // When close to target, add subtle ink-wash jitter
      if (dist < 10) {
        p.vx += (Math.random() - 0.5) * 0.3 * inkSpread;
        p.vy += (Math.random() - 0.5) * 0.3 * inkSpread;
      }
    } else {
      // Disperse with fluid dynamics
      p.vx += curl.x * flowStrength * 3;
      p.vy += curl.y * flowStrength * 3;

      // Gentle outward drift
      const cx = p.x - width / 2;
      const cy = p.y - height / 2;
      const cd = Math.sqrt(cx * cx + cy * cy) + 1;
      p.vx += (cx / cd) * 0.3;
      p.vy += (cy / cd) * 0.3;
    }

    // Mouse interaction - ink splatter effect
    if (isMouseDown) {
      const mx = p.x - mouseX;
      const my = p.y - mouseY;
      const md = mx * mx + my * my;
      if (md < 20000) {
        const force = (1 - md / 20000) * 5;
        p.vx += mx / Math.sqrt(md + 1) * force;
        p.vy += my / Math.sqrt(md + 1) * force;
      }
    }

    // Damping - simulates ink viscosity
    p.vx *= 0.94;
    p.vy *= 0.94;

    p.x += p.vx;
    p.y += p.vy;

    // Wrap around edges
    if (p.x < -50) p.x = width + 50;
    if (p.x > width + 50) p.x = -50;
    if (p.y < -50) p.y = height + 50;
    if (p.y > height + 50) p.y = -50;

    // Draw particle with ink-wash style
    const distToTarget = isConverging ?
      Math.sqrt((p.targetX - p.x) ** 2 + (p.targetY - p.y) ** 2) : 100;
    const alpha = isConverging ?
      Math.min(p.opacity, p.opacity * (1 - distToTarget / 500) + 0.1) :
      p.opacity * 0.5;

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * (isConverging && distToTarget < 20 ? inkSpread : 1), 0, Math.PI * 2);
    ctx.fillStyle = p.color + Math.max(0.05, alpha) + ')';
    ctx.fill();
  }
}

init();
