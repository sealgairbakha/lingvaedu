type ParticlePoint = {
  x: number;
  y: number;
  red: number;
  green: number;
  blue: number;
  alpha: number;
};

type Particle = {
  start: ParticlePoint;
  end: ParticlePoint;
  scatterX: number;
  scatterY: number;
  size: number;
};

const particleDurationMs = 1300;
const scatterShare = .28;
const textRevealMs = 700;
const particleLimit = 760;

function cubicBezierProgress(progress: number, x1: number, y1: number, x2: number, y2: number) {
  const sample = (time: number, first: number, second: number) => {
    const inverse = 1 - time;
    return 3 * inverse * inverse * time * first + 3 * inverse * time * time * second + time * time * time;
  };
  const slope = (time: number, first: number, second: number) => {
    const inverse = 1 - time;
    return 3 * inverse * inverse * first + 6 * inverse * time * (second - first) + 3 * time * time * (1 - second);
  };

  let time = progress;
  for (let iteration = 0; iteration < 5; iteration += 1) {
    const currentSlope = slope(time, x1, x2);
    if (Math.abs(currentSlope) < .0001) break;
    time -= (sample(time, x1, x2) - progress) / currentSlope;
    time = Math.min(1, Math.max(0, time));
  }
  return sample(time, y1, y2);
}

function drawWord(context: CanvasRenderingContext2D, element: HTMLElement, headingRect: DOMRect) {
  const text = element.dataset.particleText ?? element.textContent ?? "";
  if (!text) return;

  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  const fontSize = Number.parseFloat(style.fontSize);
  const letterSpacing = Number.parseFloat(style.letterSpacing) || 0;
  let cursorX = rect.left - headingRect.left;
  const cursorY = rect.top - headingRect.top + Math.max(0, (rect.height - fontSize) / 2);

  context.fillStyle = style.color;
  context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  context.textBaseline = "top";
  for (const character of text) {
    context.fillText(character, cursorX, cursorY);
    cursorX += context.measureText(character).width + letterSpacing;
  }
}

function sampleSlide(slide: HTMLElement, headingRect: DOMRect) {
  const surface = document.createElement("canvas");
  surface.width = Math.max(1, Math.ceil(headingRect.width));
  surface.height = Math.max(1, Math.ceil(headingRect.height));
  const context = surface.getContext("2d", { willReadFrequently: true });
  if (!context) return [];

  slide.querySelectorAll<HTMLElement>("[data-particle-text]").forEach((word) => {
    drawWord(context, word, headingRect);
  });

  const image = context.getImageData(0, 0, surface.width, surface.height);
  const points: ParticlePoint[] = [];
  const step = 3;
  for (let y = 0; y < surface.height; y += step) {
    for (let x = 0; x < surface.width; x += step) {
      const offset = (y * surface.width + x) * 4;
      const alpha = image.data[offset + 3];
      if (alpha < 72) continue;
      points.push({
        x,
        y,
        red: image.data[offset],
        green: image.data[offset + 1],
        blue: image.data[offset + 2],
        alpha: alpha / 255,
      });
    }
  }

  if (points.length <= particleLimit) return points;
  const stride = Math.ceil(points.length / particleLimit);
  return points.filter((_, index) => index % stride === 0).slice(0, particleLimit);
}

function createParticles(startPoints: ParticlePoint[], endPoints: ParticlePoint[], width: number, height: number) {
  const count = Math.min(particleLimit, Math.max(startPoints.length, endPoints.length));
  const particles: Particle[] = [];
  let seed = 8191;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  for (let index = 0; index < count; index += 1) {
    const start = startPoints[index % startPoints.length];
    const end = endPoints[index % endPoints.length];
    const outwardAngle = Math.atan2(start.y - height / 2, start.x - width / 2);
    const angle = outwardAngle + (random() - .5) * 1.4;
    const distance = 8 + random() * 24;
    particles.push({
      start,
      end,
      scatterX: start.x + Math.cos(angle) * distance + (random() - .5) * 8,
      scatterY: start.y + Math.sin(angle) * distance + (random() - .5) * 8,
      size: .8 + random() * 1.2,
    });
  }
  return particles;
}

function mix(from: number, to: number, progress: number) {
  return from + (to - from) * progress;
}

export function animateHeadlineParticles({
  heading,
  canvas,
  nextIndex,
  onSwap,
}: {
  heading: HTMLHeadingElement;
  canvas: HTMLCanvasElement;
  nextIndex: number;
  onSwap: () => void;
}) {
  const slides = [...heading.querySelectorAll<HTMLElement>(".studentHeadlineSlide")];
  const currentSlide = heading.querySelector<HTMLElement>(".studentHeadlineSlide.is-visible");
  const nextSlide = slides[nextIndex];
  if (!currentSlide || !nextSlide) {
    onSwap();
    return () => undefined;
  }

  const headingRect = heading.getBoundingClientRect();
  const startPoints = sampleSlide(currentSlide, headingRect);
  const endPoints = sampleSlide(nextSlide, headingRect);
  if (!startPoints.length || !endPoints.length) {
    onSwap();
    return () => undefined;
  }

  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.round(headingRect.width * ratio));
  canvas.height = Math.max(1, Math.round(headingRect.height * ratio));
  const context = canvas.getContext("2d");
  if (!context) {
    onSwap();
    return () => undefined;
  }
  context.setTransform(ratio, 0, 0, ratio, 0, 0);

  const particles = createParticles(startPoints, endPoints, headingRect.width, headingRect.height);
  let frameId = 0;
  let fadeTimer = 0;
  let swapped = false;
  let cancelled = false;
  const startedAt = performance.now();

  heading.classList.remove("is-particle-settling");
  heading.classList.add("is-particle-transitioning");

  const draw = (time: number) => {
    if (cancelled) return;
    const progress = Math.min(1, (time - startedAt) / particleDurationMs);
    const assembling = progress >= scatterShare;
    const phase = assembling
      ? (progress - scatterShare) / (1 - scatterShare)
      : progress / scatterShare;
    const eased = assembling
      ? cubicBezierProgress(phase, .77, 0, .175, 1)
      : cubicBezierProgress(phase, .23, 1, .32, 1);

    if (assembling && !swapped) {
      swapped = true;
      onSwap();
    }

    context.clearRect(0, 0, headingRect.width, headingRect.height);
    for (const particle of particles) {
      const x = assembling
        ? mix(particle.scatterX, particle.end.x, eased)
        : mix(particle.start.x, particle.scatterX, eased);
      const y = assembling
        ? mix(particle.scatterY, particle.end.y, eased)
        : mix(particle.start.y, particle.scatterY, eased);
      const colorProgress = assembling ? eased : 0;
      const alpha = (assembling ? mix(.48, 1, eased) : mix(1, .48, eased))
        * mix(particle.start.alpha, particle.end.alpha, colorProgress);
      context.fillStyle = `rgba(${Math.round(mix(particle.start.red, particle.end.red, colorProgress))}, ${Math.round(mix(particle.start.green, particle.end.green, colorProgress))}, ${Math.round(mix(particle.start.blue, particle.end.blue, colorProgress))}, ${alpha})`;
      context.fillRect(x, y, particle.size, particle.size);
    }

    if (progress < 1) {
      frameId = window.requestAnimationFrame(draw);
      return;
    }

    heading.classList.add("is-particle-settling");
    heading.classList.remove("is-particle-transitioning");
    fadeTimer = window.setTimeout(() => {
      context.clearRect(0, 0, headingRect.width, headingRect.height);
      heading.classList.remove("is-particle-settling");
    }, textRevealMs);
  };

  frameId = window.requestAnimationFrame(draw);

  return () => {
    cancelled = true;
    window.cancelAnimationFrame(frameId);
    window.clearTimeout(fadeTimer);
    heading.classList.remove("is-particle-transitioning");
    heading.classList.remove("is-particle-settling");
    context.clearRect(0, 0, headingRect.width, headingRect.height);
  };
}
