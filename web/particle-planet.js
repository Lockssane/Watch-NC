const canvas = document.getElementById("aisCanvas");
const ctx = canvas ? canvas.getContext("2d") : null;

const defaultVisualState = {
  glow: 1,
  routes: 1,
  particles: 1,
  focus: 0.08,
  hud: 0.4,
  alert: 0.06,
  horizonLift: 0.18,
};

const state = {
  width: 0,
  height: 0,
  dpr: 1,
  pointerX: 0,
  pointerY: 0,
  rotation: 0,
  stars: [],
  vessels: [],
  lanes: [],
  lights: [],
  alerts: [],
  storyCurrent: {
    ...defaultVisualState,
    cameraDepth: 0.08,
    sceneIndex: 0,
    sceneProgress: 0,
    progress: 0,
    hudVariant: "global",
  },
  storyTarget: {
    ...defaultVisualState,
    cameraDepth: 0.08,
    sceneIndex: 0,
    sceneProgress: 0,
    progress: 0,
    hudVariant: "global",
  },
  reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
};

const vesselPalette = [
  "rgba(124, 244, 255,",
  "rgba(91, 167, 255,",
  "rgba(255, 192, 114,",
  "rgba(255, 133, 96,",
  "rgba(235, 250, 255,",
];

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function seededVessel(index) {
  const corridor = index % 7;
  const basePhi = 0.45 + corridor * 0.31 + randomBetween(-0.06, 0.06);
  const baseTheta = randomBetween(0, Math.PI * 2);
  const color = vesselPalette[index % vesselPalette.length];

  return {
    theta: baseTheta,
    phi: basePhi,
    heading: randomBetween(0, Math.PI * 2),
    speed: randomBetween(0.0002, 0.0009),
    color,
    phase: Math.random(),
    size: randomBetween(5.2, 10),
    priority: index % 19 === 0,
  };
}

function createScene() {
  const vesselCount = Math.round(Math.min(260, Math.max(140, state.width * state.height * 0.00014)));
  state.vessels = Array.from({ length: vesselCount }, (_, index) => seededVessel(index));

  state.stars = Array.from({ length: 260 }, () => ({
    x: Math.random(),
    y: Math.random(),
    size: randomBetween(0.35, 1.6),
    alpha: randomBetween(0.06, 0.38),
  }));

  state.lights = Array.from({ length: 380 }, (_, index) => ({
    theta: randomBetween(0, Math.PI * 2),
    phi: randomBetween(0.42, 2.54),
    size: randomBetween(0.45, 1.9),
    alpha: randomBetween(0.14, 0.7),
    color: index % 8 === 0 ? "rgba(255, 209, 102," : "rgba(160, 246, 255,",
  }));

  state.lanes = Array.from({ length: 40 }, (_, index) => ({
    theta: randomBetween(0, Math.PI * 2),
    phi: 0.54 + (index % 8) * 0.24 + randomBetween(-0.04, 0.04),
    length: randomBetween(0.22, 0.68),
    speed: randomBetween(0.00018, 0.00052),
    alpha: randomBetween(0.08, 0.34),
  }));

  state.alerts = [
    { x: 0.68, y: 0.49, radius: 24 },
    { x: 0.74, y: 0.57, radius: 16 },
    { x: 0.78, y: 0.46, radius: 18 },
  ];
}

function resize() {
  if (!canvas || !ctx) return;
  state.dpr = Math.min(2, window.devicePixelRatio || 1);
  state.width = window.innerWidth;
  state.height = window.innerHeight;
  canvas.width = Math.floor(state.width * state.dpr);
  canvas.height = Math.floor(state.height * state.dpr);
  canvas.style.width = `${state.width}px`;
  canvas.style.height = `${state.height}px`;
  ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  createScene();
}

function globeMetrics() {
  const focus = state.storyCurrent.focus;
  const depth = state.storyCurrent.cameraDepth;
  const horizonLift = state.storyCurrent.horizonLift;
  const radius = Math.min(
    state.width * (0.49 - depth * 0.08),
    state.height * (0.58 - depth * 0.16),
  );

  return {
    cx: state.width * (0.5 + focus * 0.03) + state.pointerX * 20,
    cy: state.height * (0.84 + horizonLift * 0.34 - depth * 0.08) + state.pointerY * 12,
    radius,
  };
}

function project(theta, phi, metrics, altitude = 1) {
  const sinPhi = Math.sin(phi);
  const x3 = Math.cos(theta + state.rotation) * sinPhi;
  const y3 = Math.cos(phi);
  const z3 = Math.sin(theta + state.rotation) * sinPhi;
  const perspective = 0.56 + (z3 + 1) * 0.31;
  const x = metrics.cx + x3 * metrics.radius * perspective * altitude;
  const y = metrics.cy + y3 * metrics.radius * 0.84 * perspective * altitude;
  return { x, y, z: z3, perspective };
}

function easeStoryState() {
  const easing = state.reducedMotion ? 1 : 0.075;
  Object.keys(defaultVisualState).forEach((key) => {
    state.storyCurrent[key] = lerp(state.storyCurrent[key], state.storyTarget[key], easing);
  });
  state.storyCurrent.cameraDepth = lerp(state.storyCurrent.cameraDepth, state.storyTarget.cameraDepth, easing);
  state.storyCurrent.sceneProgress = lerp(state.storyCurrent.sceneProgress, state.storyTarget.sceneProgress, easing);
  state.storyCurrent.progress = lerp(state.storyCurrent.progress, state.storyTarget.progress, easing);
  state.storyCurrent.sceneIndex = state.storyTarget.sceneIndex;
  state.storyCurrent.hudVariant = state.storyTarget.hudVariant;
}

function drawBackground(time) {
  const glow = state.storyCurrent.glow;
  const particles = state.storyCurrent.particles;
  const gradient = ctx.createRadialGradient(
    state.width * 0.5,
    state.height * 0.44,
    0,
    state.width * 0.52,
    state.height * 0.55,
    Math.max(state.width, state.height) * 0.82,
  );
  gradient.addColorStop(0, `rgba(9, 29, 47, ${0.96 - glow * 0.12})`);
  gradient.addColorStop(0.42, "#04101d");
  gradient.addColorStop(1, "#010208");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, state.width, state.height);

  state.stars.forEach((star, index) => {
    const pulse = 0.55 + Math.sin(time * 0.0008 + index) * 0.3;
    const alpha = star.alpha * pulse * (0.5 + particles * 0.6);
    ctx.fillStyle = `rgba(202, 237, 255, ${alpha})`;
    ctx.beginPath();
    ctx.arc(star.x * state.width, star.y * state.height, star.size, 0, Math.PI * 2);
    ctx.fill();
  });

  const streakCount = Math.round(18 + particles * 42);
  const originX = state.width * 0.5 + state.pointerX * 12;
  const originY = state.height * 0.58 + state.pointerY * 8;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < streakCount; i += 1) {
    const angle = i * 2.399 + time * 0.00008;
    const distance = 160 + ((i * 49 + time * 0.028) % Math.max(state.width, state.height));
    const length = 30 + (i % 7) * 12;
    const x = originX + Math.cos(angle) * distance;
    const y = originY + Math.sin(angle) * distance * 0.55;
    const gradientLine = ctx.createLinearGradient(
      x - Math.cos(angle) * length,
      y - Math.sin(angle) * length,
      x,
      y,
    );
    gradientLine.addColorStop(0, "rgba(124, 244, 255, 0)");
    gradientLine.addColorStop(1, `rgba(170, 241, 255, ${0.03 + (i % 5) * 0.016})`);
    ctx.strokeStyle = gradientLine;
    ctx.lineWidth = i % 9 === 0 ? 1.2 : 0.7;
    ctx.beginPath();
    ctx.moveTo(x - Math.cos(angle) * length, y - Math.sin(angle) * length);
    ctx.lineTo(x, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawGlobeBase(metrics) {
  const glowStrength = state.storyCurrent.glow;
  const glow = ctx.createRadialGradient(
    metrics.cx,
    metrics.cy,
    metrics.radius * 0.12,
    metrics.cx,
    metrics.cy,
    metrics.radius * 1.24,
  );
  glow.addColorStop(0, `rgba(45, 181, 255, ${0.18 + glowStrength * 0.16})`);
  glow.addColorStop(0.52, `rgba(18, 72, 112, ${0.14 + glowStrength * 0.14})`);
  glow.addColorStop(1, "rgba(124, 244, 255, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.ellipse(metrics.cx, metrics.cy, metrics.radius * 1.34, metrics.radius * 1.04, 0, 0, Math.PI * 2);
  ctx.fill();

  const ocean = ctx.createRadialGradient(
    metrics.cx - metrics.radius * 0.18,
    metrics.cy - metrics.radius * 0.5,
    metrics.radius * 0.08,
    metrics.cx,
    metrics.cy,
    metrics.radius * 1.02,
  );
  ocean.addColorStop(0, `rgba(133, 241, 255, ${0.14 + glowStrength * 0.24})`);
  ocean.addColorStop(0.24, "rgba(18, 115, 155, 0.34)");
  ocean.addColorStop(0.62, "rgba(5, 25, 50, 0.76)");
  ocean.addColorStop(1, "rgba(0, 3, 12, 0.99)");
  ctx.fillStyle = ocean;
  ctx.beginPath();
  ctx.ellipse(metrics.cx, metrics.cy, metrics.radius, metrics.radius * 0.9, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.ellipse(metrics.cx, metrics.cy, metrics.radius, metrics.radius * 0.9, 0, 0, Math.PI * 2);
  ctx.clip();

  const limb = ctx.createLinearGradient(
    metrics.cx - metrics.radius,
    metrics.cy - metrics.radius * 0.9,
    metrics.cx + metrics.radius,
    metrics.cy + metrics.radius * 0.7,
  );
  limb.addColorStop(0, `rgba(168, 255, 246, ${0.1 + glowStrength * 0.12})`);
  limb.addColorStop(0.34, "rgba(66, 191, 255, 0.08)");
  limb.addColorStop(0.78, "rgba(0, 0, 0, 0.12)");
  limb.addColorStop(1, "rgba(0, 0, 0, 0.64)");
  ctx.fillStyle = limb;
  ctx.fillRect(metrics.cx - metrics.radius, metrics.cy - metrics.radius, metrics.radius * 2, metrics.radius * 2);

  ctx.globalCompositeOperation = "screen";
  ctx.strokeStyle = `rgba(154, 252, 255, ${0.02 + state.storyCurrent.hud * 0.08})`;
  ctx.lineWidth = 1;
  for (let i = -10; i <= 10; i += 1) {
    const y = metrics.cy + i * metrics.radius * 0.082;
    ctx.beginPath();
    ctx.moveTo(metrics.cx - metrics.radius * 0.94, y);
    ctx.bezierCurveTo(
      metrics.cx - metrics.radius * 0.32,
      y - metrics.radius * 0.04,
      metrics.cx + metrics.radius * 0.34,
      y + metrics.radius * 0.05,
      metrics.cx + metrics.radius * 0.94,
      y,
    );
    ctx.stroke();
  }
  ctx.restore();

  ctx.strokeStyle = `rgba(183, 255, 250, ${0.36 + glowStrength * 0.32})`;
  ctx.lineWidth = 1.4;
  ctx.shadowColor = "rgba(124, 244, 255, 0.62)";
  ctx.shadowBlur = 24;
  ctx.beginPath();
  ctx.ellipse(metrics.cx, metrics.cy, metrics.radius * 1.002, metrics.radius * 0.902, 0, Math.PI * 1.03, Math.PI * 1.97);
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function drawCityLights(metrics, time) {
  const density = 0.3 + state.storyCurrent.particles * 0.7;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  state.lights.forEach((light, index) => {
    if (index / state.lights.length > density) return;
    const point = project(light.theta + state.rotation * 0.35, light.phi, metrics, 1.006);
    if (point.z < -0.14) return;
    const pulse = 0.78 + Math.sin(time * 0.0011 + index) * 0.22;
    const alpha = Math.max(0, light.alpha * pulse * (0.28 + point.z * 0.46));
    ctx.fillStyle = `${light.color}${alpha})`;
    ctx.beginPath();
    ctx.arc(point.x, point.y, light.size * point.perspective, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function drawOrbitalLanes(metrics, time) {
  const activeCount = Math.round(state.lanes.length * (0.24 + state.storyCurrent.routes * 0.76));
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let laneIndex = 0; laneIndex < activeCount; laneIndex += 1) {
    const lane = state.lanes[laneIndex];
    const start = lane.theta + time * lane.speed;
    const segments = 11;
    let previous = null;
    for (let step = 0; step <= segments; step += 1) {
      const point = project(start + (lane.length * step) / segments, lane.phi, metrics, 1.018);
      if (point.z < -0.1) {
        previous = null;
        continue;
      }
      if (previous) {
        ctx.strokeStyle = `rgba(124, 244, 255, ${lane.alpha * (0.22 + state.storyCurrent.routes * 0.2 + point.z * 0.3)})`;
        ctx.lineWidth = 0.7 + point.perspective * 0.5;
        ctx.beginPath();
        ctx.moveTo(previous.x, previous.y);
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
      }
      previous = point;
    }
  }
  ctx.restore();
}

function drawWorldRoutes(metrics, time) {
  const routeStrength = state.storyCurrent.routes;
  if (routeStrength < 0.18) return;
  const focusAnchor = {
    x: metrics.cx + metrics.radius * (0.22 + state.storyCurrent.focus * 0.16),
    y: metrics.cy - metrics.radius * (0.36 + state.storyCurrent.focus * 0.12),
  };
  const routeOrigins = [
    { x: state.width * 0.14, y: state.height * 0.24 },
    { x: state.width * 0.18, y: state.height * 0.62 },
    { x: state.width * 0.84, y: state.height * 0.2 },
    { x: state.width * 0.88, y: state.height * 0.54 },
  ];

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  routeOrigins.forEach((origin, index) => {
    const wave = Math.sin(time * 0.001 + index) * 14;
    ctx.strokeStyle = index % 2 === 0
      ? `rgba(137, 225, 255, ${0.12 + routeStrength * 0.18})`
      : `rgba(255, 192, 114, ${0.08 + routeStrength * 0.14})`;
    ctx.lineWidth = 1 + routeStrength * 0.4;
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y + wave);
    ctx.bezierCurveTo(
      lerp(origin.x, focusAnchor.x, 0.3),
      origin.y - 90 - wave,
      lerp(origin.x, focusAnchor.x, 0.72),
      focusAnchor.y + 70 + wave,
      focusAnchor.x,
      focusAnchor.y,
    );
    ctx.stroke();
  });
  ctx.restore();
}

function drawVessel(point, angle, color, size, alpha, priority = false) {
  ctx.save();
  ctx.translate(point.x, point.y);
  ctx.rotate(angle);
  ctx.fillStyle = `${color}${alpha})`;
  ctx.shadowColor = `${color}0.9)`;
  ctx.shadowBlur = priority ? 18 : 10;
  ctx.beginPath();
  ctx.moveTo(size, 0);
  ctx.lineTo(-size * 0.7, -size * 0.48);
  ctx.lineTo(-size * 0.38, 0);
  ctx.lineTo(-size * 0.7, size * 0.48);
  ctx.closePath();
  ctx.fill();
  if (priority) {
    ctx.strokeStyle = "rgba(255, 255, 255, 0.72)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();
}

function drawAisContacts(metrics, time) {
  const contactCount = Math.round(state.vessels.length * (0.28 + state.storyCurrent.particles * 0.72));
  for (let index = 0; index < contactCount; index += 1) {
    const vessel = state.vessels[index];
    const theta = vessel.theta + time * vessel.speed + Math.sin(time * 0.0002 + index) * 0.025;
    const phi = vessel.phi + Math.sin(time * 0.00035 + vessel.phase * 8) * 0.035;
    const point = project(theta, phi, metrics, 1.012);
    if (point.z < -0.08) continue;

    const alpha = Math.max(0.14, Math.min(0.9, 0.26 + point.z * 0.42));
    const angle = vessel.heading + state.rotation * 0.35 + Math.sin(time * 0.001 + index) * 0.18;
    const size = vessel.size * point.perspective;
    drawVessel(point, angle, vessel.color, size, alpha, vessel.priority && state.storyCurrent.hud > 0.55);
  }
}

function drawFocusCluster(metrics, time) {
  const focus = state.storyCurrent.focus;
  if (focus < 0.16) return;

  const anchor = {
    x: metrics.cx + metrics.radius * (0.22 + focus * 0.15),
    y: metrics.cy - metrics.radius * (0.34 + focus * 0.08),
  };
  const points = [
    { x: -88, y: 12, size: 5 },
    { x: -48, y: -2, size: 7 },
    { x: -10, y: -16, size: 8 },
    { x: 24, y: -8, size: 6 },
    { x: 58, y: 4, size: 5 },
    { x: 92, y: 16, size: 4 },
  ];

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  points.forEach((point, index) => {
    const drift = Math.sin(time * 0.0012 + index) * 2;
    ctx.fillStyle = `rgba(162, 255, 242, ${0.24 + focus * 0.34})`;
    ctx.beginPath();
    ctx.ellipse(
      anchor.x + point.x,
      anchor.y + point.y + drift,
      point.size * (1.2 + focus * 0.3),
      point.size * 0.46,
      -0.24,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  });

  ctx.strokeStyle = `rgba(166, 251, 255, ${0.18 + focus * 0.22})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(anchor.x - 118, anchor.y + 36);
  ctx.lineTo(anchor.x + 108, anchor.y - 32);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = `rgba(255, 255, 255, ${0.12 + focus * 0.32})`;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(anchor.x, anchor.y, 20 + focus * 12, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(anchor.x - 36, anchor.y);
  ctx.lineTo(anchor.x + 36, anchor.y);
  ctx.moveTo(anchor.x, anchor.y - 36);
  ctx.lineTo(anchor.x, anchor.y + 36);
  ctx.stroke();
  ctx.restore();
}

function drawAlertSignals(time) {
  const intensity = state.storyCurrent.alert;
  if (intensity < 0.18) return;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  state.alerts.forEach((alert, index) => {
    const radius = alert.radius + Math.sin(time * 0.0016 + index) * 4;
    const x = state.width * alert.x + state.pointerX * 10;
    const y = state.height * alert.y + state.pointerY * 8;

    ctx.strokeStyle = `rgba(255, 102, 102, ${0.18 + intensity * 0.34})`;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = `rgba(255, 191, 105, ${0.12 + intensity * 0.3})`;
    ctx.beginPath();
    ctx.arc(x, y, radius + 12, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = `rgba(255, 107, 107, ${0.18 + intensity * 0.42})`;
    ctx.beginPath();
    ctx.arc(x, y, 2.6, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function drawHudOverlay(time) {
  const hud = state.storyCurrent.hud;
  if (hud <= 0.04) return;

  ctx.save();
  ctx.strokeStyle = `rgba(155, 240, 255, ${0.08 + hud * 0.18})`;
  ctx.lineWidth = 1;

  for (let row = 0; row < 18; row += 1) {
    const y = state.height * 0.18 + row * (14 + hud * 1.5) + Math.sin(time * 0.0007 + row) * 0.9;
    ctx.beginPath();
    ctx.moveTo(state.width * 0.08, y);
    ctx.lineTo(state.width * 0.92, y);
    ctx.stroke();
  }

  const corners = [
    { x: state.width * 0.08, y: state.height * 0.16, flipX: 1, flipY: 1 },
    { x: state.width * 0.92, y: state.height * 0.16, flipX: -1, flipY: 1 },
    { x: state.width * 0.08, y: state.height * 0.82, flipX: 1, flipY: -1 },
    { x: state.width * 0.92, y: state.height * 0.82, flipX: -1, flipY: -1 },
  ];

  corners.forEach((corner) => {
    ctx.beginPath();
    ctx.moveTo(corner.x, corner.y);
    ctx.lineTo(corner.x + 56 * corner.flipX, corner.y);
    ctx.lineTo(corner.x + 56 * corner.flipX, corner.y + 12 * corner.flipY);
    ctx.moveTo(corner.x, corner.y);
    ctx.lineTo(corner.x, corner.y + 56 * corner.flipY);
    ctx.lineTo(corner.x + 12 * corner.flipX, corner.y + 56 * corner.flipY);
    ctx.stroke();
  });

  const railX = state.width * 0.88;
  const railTop = state.height * 0.2;
  const railHeight = state.height * 0.44;
  ctx.strokeStyle = `rgba(124, 244, 255, ${0.12 + hud * 0.22})`;
  ctx.beginPath();
  ctx.moveTo(railX, railTop);
  ctx.lineTo(railX, railTop + railHeight);
  ctx.stroke();

  for (let marker = 0; marker < 4; marker += 1) {
    const y = railTop + railHeight * (0.18 + marker * 0.22) + Math.sin(time * 0.0014 + marker) * 3;
    ctx.beginPath();
    ctx.arc(railX, y, 4 + marker, 0, Math.PI * 2);
    ctx.stroke();
  }

  const metrics = globeMetrics();
  const sweepAngle = time * 0.00055;
  ctx.strokeStyle = `rgba(255, 192, 114, ${0.06 + hud * 0.16})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(
    metrics.cx,
    metrics.cy,
    metrics.radius * 1.08,
    metrics.radius * 0.96,
    0,
    sweepAngle,
    sweepAngle + 0.38,
  );
  ctx.stroke();
  ctx.restore();
}

function render(time = 0) {
  if (!canvas || !ctx) return;
  easeStoryState();
  state.rotation += state.reducedMotion ? 0.0005 : 0.0012;
  const metrics = globeMetrics();

  drawBackground(time);
  drawGlobeBase(metrics);
  drawWorldRoutes(metrics, time);
  drawCityLights(metrics, time);
  drawOrbitalLanes(metrics, time);
  drawAisContacts(metrics, time);
  drawFocusCluster(metrics, time);
  drawAlertSignals(time);
  drawHudOverlay(time);

  window.requestAnimationFrame(render);
}

window.CossHomeCanvas = {
  setState(nextState = {}) {
    if (typeof nextState.reducedMotion === "boolean") state.reducedMotion = nextState.reducedMotion;
    if (typeof nextState.cameraDepth === "number") state.storyTarget.cameraDepth = nextState.cameraDepth;
    if (typeof nextState.sceneIndex === "number") state.storyTarget.sceneIndex = nextState.sceneIndex;
    if (typeof nextState.sceneProgress === "number") state.storyTarget.sceneProgress = clamp(nextState.sceneProgress, 0, 1);
    if (typeof nextState.progress === "number") state.storyTarget.progress = clamp(nextState.progress, 0, 1);
    if (typeof nextState.hudVariant === "string") state.storyTarget.hudVariant = nextState.hudVariant;

    if (nextState.visualState) {
      Object.keys(defaultVisualState).forEach((key) => {
        if (typeof nextState.visualState[key] === "number") {
          state.storyTarget[key] = nextState.visualState[key];
        }
      });
    }
  },
};

window.addEventListener("resize", resize);
window.addEventListener("pointermove", (event) => {
  state.pointerX = (event.clientX / Math.max(1, state.width) - 0.5) * 2;
  state.pointerY = (event.clientY / Math.max(1, state.height) - 0.5) * 2;
});

if (canvas && ctx) {
  resize();
  render();
}
