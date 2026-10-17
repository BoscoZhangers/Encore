import { useEffect, useRef } from 'react';
import { Armchair, BookOpen, Camera, Gamepad2, Headphones, Shirt, Watch } from 'lucide-react';

export function HeroAtmosphere() {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const element = root.current;
    const surface = canvas.current;
    const banner = element?.closest('section');
    const ctx = surface?.getContext('2d');
    if (!element || !surface || !banner || !ctx) return;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let width = 0,
      height = 0,
      frame = 0,
      visible = true,
      time = 0,
      previous = 0,
      lastShapeInterval = 0,
      ringRotation = 0;
    const shapeHoldSeconds = 15;
    const morphDuration = 3;
    const objectField = element.querySelector<HTMLElement>('.hero-object-field');
    const heroObjects = Array.from(element.querySelectorAll<HTMLElement>('.hero-object'));
    const homeObjects = [
      { x: 38, y: 9, size: 74, tilt: -14, depth: 0.82 },
      { x: 86, y: 39, size: 58, tilt: 12, depth: 0.56 },
      { x: 31, y: 64, size: 78, tilt: -8, depth: 1 },
      { x: 6, y: 36, size: 51, tilt: 10, depth: 0.42 },
      { x: 73, y: 5, size: 43, tilt: 8, depth: 0.14 },
      { x: 77, y: 69, size: 62, tilt: -11, depth: 0.7 },
      { x: 18, y: 7, size: 47, tilt: 15, depth: 0.28 },
    ];
    const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
    const particleCount = 1050;
    const particles = Array.from({ length: particleCount }, (_, i) => ({
      phase: (i / particleCount) * Math.PI * 2,
      ring: i * 2.399963,
      thickness: 0.04 + ((i * 37) % 100) / 900,
      size: i % 13 === 0 ? 1.8 : 0.6 + (i % 4) * 0.22,
    }));
    function shapeMix(elapsed: number) {
      if (elapsed < shapeHoldSeconds) return 0;
      const interval = Math.floor(elapsed / shapeHoldSeconds);
      const target = interval % 2;
      const previousShape = 1 - target;
      const progress = Math.min((elapsed % shapeHoldSeconds) / morphDuration, 1);
      const eased = progress * progress * (3 - 2 * progress);
      return previousShape + (target - previousShape) * eased;
    }
    function positionHeroObjects(morph: number) {
      objectField?.classList.toggle('is-e', morph > 0.5);
      heroObjects.forEach((object, index) => {
        const home = homeObjects[index];
        const angle = (index / heroObjects.length) * Math.PI * 2 + ringRotation;
        const depth = (Math.sin(angle) + 1) / 2;
        const ringX = 46 + Math.cos(angle) * 31;
        // A flatter, slightly raised ellipse reads as a tilted 3D orbit and keeps
        // the enlarged foreground cards clear of the banner's lower edge.
        const ringY = 43 + Math.sin(angle) * 30;
        const ringSize = 27 + depth * 43;
        const ringOpacity = 0.46 + depth * 0.54;
        const ringTilt = Math.cos(angle) * 14;
        const homeOpacity = 0.66 + home.depth * 0.34;
        const visualDepth = home.depth + (depth - home.depth) * morph;
        object.style.setProperty('--object-x', `${home.x + (ringX - home.x) * morph}%`);
        object.style.setProperty('--object-y', `${home.y + (ringY - home.y) * morph}%`);
        object.style.setProperty(
          '--object-size',
          `${home.size + (ringSize - home.size) * morph}px`,
        );
        object.style.setProperty('--tilt', `${home.tilt + (ringTilt - home.tilt) * morph}deg`);
        object.style.setProperty(
          '--object-opacity',
          `${homeOpacity + (ringOpacity - homeOpacity) * morph}`,
        );
        object.style.setProperty('--object-blur', `${(1 - visualDepth) * 0.9}px`);
        object.style.setProperty('--object-brightness', `${0.78 + visualDepth * 0.22}`);
        object.style.setProperty('--depth-shadow-y', `${8 + visualDepth * 12}px`);
        object.style.setProperty('--depth-shadow-blur', `${14 + visualDepth * 18}px`);
        object.style.setProperty('--depth-shadow-alpha', `${0.12 + visualDepth * 0.18}`);
        object.style.setProperty('z-index', String(Math.round(visualDepth * 20) + 2));
      });
    }
    function fallbackEncoreE(t: number) {
      const normalized = (((t / (Math.PI * 2)) % 1) + 1) % 1;
      if (normalized < 0.27) {
        const lineProgress = normalized / 0.27;
        return {
          x: (0.93 - lineProgress * 1.77) * 1.15,
          y: -0.04,
        };
      }
      const curveProgress = (normalized - 0.27) / 0.73;
      const angle = Math.PI - curveProgress * (Math.PI + 0.65);
      return {
        x: (0.06 + Math.cos(angle) * 0.9) * 1.15,
        y: Math.sin(angle) * 0.75,
      };
    }
    function buildEncoreE() {
      try {
        const glyph = document.createElement('canvas');
        glyph.width = 280;
        glyph.height = 260;
        const glyphContext = glyph.getContext('2d', { willReadFrequently: true });
        if (!glyphContext) throw Error('Canvas unavailable');
        glyphContext.fillStyle = '#fff';
        glyphContext.font = "700 238px Outfit, 'DM Sans', sans-serif";
        glyphContext.textAlign = 'center';
        glyphContext.textBaseline = 'middle';
        glyphContext.fillText('e', glyph.width / 2, glyph.height / 2 - 8);
        const pixels = glyphContext.getImageData(0, 0, glyph.width, glyph.height).data;
        const candidates: { x: number; y: number }[] = [];
        for (let y = 0; y < glyph.height; y += 2) {
          for (let x = 0; x < glyph.width; x += 2) {
            if (pixels[(y * glyph.width + x) * 4 + 3] > 120) candidates.push({ x, y });
          }
        }
        if (candidates.length < particles.length) throw Error('Glyph unavailable');
        const left = Math.min(...candidates.map((point) => point.x));
        const right = Math.max(...candidates.map((point) => point.x));
        const top = Math.min(...candidates.map((point) => point.y));
        const bottom = Math.max(...candidates.map((point) => point.y));
        const centerX = (left + right) / 2;
        const centerY = (top + bottom) / 2;
        const unit = Math.max(right - left, bottom - top) / 2;
        return particles.map((_, index) => {
          const point = candidates[(index * 137) % candidates.length];
          return {
            x: ((point.x - centerX) / unit) * 1.05,
            y: ((point.y - centerY) / unit) * 0.58,
          };
        });
      } catch {
        return particles.map((particle) => fallbackEncoreE(particle.phase));
      }
    }
    const encoreEPoints = buildEncoreE();
    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      const cx = width * (width < 650 ? 0.85 : 0.76),
        cy = height * 0.5;
      const scale = Math.min(width * 0.29, height * 0.82);
      if (!scale) return;
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, scale * 1.5);
      glow.addColorStop(0, '#b7f88524');
      glow.addColorStop(0.45, '#5ce9bb12');
      glow.addColorStop(1, '#65ddac00');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);
      const angle = -0.35 + Math.sin(time * 0.18) * 0.16 + pointer.x * 0.16;
      const morph = shapeMix(time);
      const shapeAngle = angle * (1 - morph);
      // Project the flowing mark from back to front while it morphs between shapes.
      const dots = particles
        .map((p, index) => {
          const t = p.phase + time * 0.18,
            tube = p.ring + time * 0.24,
            tubeThickness = p.thickness * (1 - morph * 0.85);
          const e = encoreEPoints[index],
            infinityX = Math.cos(t) * 1.32,
            infinityY = Math.sin(t * 2) * 0.4,
            x = infinityX + (e.x - infinityX) * morph + Math.cos(tube) * tubeThickness,
            y = infinityY + (e.y - infinityY) * morph + Math.sin(tube) * tubeThickness,
            infinityZ = Math.sin(t) * 0.5,
            eZ = (((index * 37) % 100) / 100 - 0.5) * 0.12,
            z = infinityZ + (eZ - infinityZ) * morph + Math.cos(tube) * tubeThickness;
          const depth = 1 / (1.8 - z * 0.4);
          return {
            x:
              cx +
              (x * Math.cos(shapeAngle) - y * Math.sin(shapeAngle)) * scale * depth * 1.55 +
              pointer.x * 10,
            y:
              cy +
              (x * Math.sin(shapeAngle) + y * Math.cos(shapeAngle) + pointer.y * z * 0.12) *
                scale *
                depth *
                1.55 +
              pointer.y * 8,
            z,
            size: p.size * depth * (1 + morph * 0.45),
            alpha: 0.24 + (z + 0.7) * 0.43 + morph * 0.18,
          };
        })
        .sort((a, b) => a.z - b.z);
      ctx.globalCompositeOperation = 'lighter';
      for (const dot of dots) {
        ctx.globalAlpha = Math.min(0.98, dot.alpha);
        ctx.fillStyle = morph > 0.55 ? '#e3f8a8' : dot.z > 0.1 ? '#dcf5a0' : '#59cdb4';
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.size, 0, Math.PI * 2);
        ctx.fill();
      }
      for (let i = 0; i < 30; i++) {
        const x = cx + Math.sin(i * 53.1 + time * 0.035) * scale * 1.55;
        const y = cy + Math.cos(i * 21.7 + time * 0.06) * scale;
        ctx.globalAlpha = 0.12 + (Math.sin(time + i) + 1) * 0.12;
        ctx.fillStyle = '#dcf5ad';
        ctx.fillRect(x, y, i % 7 === 0 ? 2 : 1, i % 7 === 0 ? 2 : 1);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    function tick(now: number) {
      time += previous ? Math.min(now - previous, 50) / 1000 : 0;
      previous = now;
      const shapeInterval = Math.floor(time / shapeHoldSeconds);
      if (shapeInterval !== lastShapeInterval) {
        lastShapeInterval = shapeInterval;
        if (shapeInterval % 2 === 1) ringRotation = 0;
      }
      const timeInShape = time % shapeHoldSeconds;
      if (shapeInterval % 2 === 1 && timeInShape > morphDuration) {
        ringRotation = (timeInShape - morphDuration) * 0.08;
      }
      positionHeroObjects(shapeMix(time));
      pointer.x += (pointer.targetX - pointer.x) * 0.045;
      pointer.y += (pointer.targetY - pointer.y) * 0.045;
      element!.style.setProperty('--scene-x', `${pointer.x * 12}px`);
      element!.style.setProperty('--scene-y', `${pointer.y * 9}px`);
      draw();
      frame = requestAnimationFrame(tick);
    }
    function sync() {
      cancelAnimationFrame(frame);
      previous = 0;
      element!.dataset.still = String(motion.matches || !visible || document.hidden);
      if (motion.matches) {
        pointer.x = pointer.y = 0;
        ringRotation = 0;
        positionHeroObjects(0);
        element!.style.setProperty('--scene-x', '0px');
        element!.style.setProperty('--scene-y', '0px');
      }
      draw();
      if (!motion.matches && visible && !document.hidden) frame = requestAnimationFrame(tick);
    }
    const resize = new ResizeObserver(() => {
      const box = element.getBoundingClientRect();
      width = box.width;
      height = box.height;
      const ratio = Math.min(devicePixelRatio || 1, 1.75);
      surface.width = Math.round(width * ratio);
      surface.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      sync();
    });
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    const move = (event: PointerEvent) => {
      const box = banner.getBoundingClientRect();
      pointer.targetX = ((event.clientX - box.left) / box.width) * 2 - 1;
      pointer.targetY = ((event.clientY - box.top) / box.height) * 2 - 1;
    };
    const leave = () => {
      pointer.targetX = pointer.targetY = 0;
    };
    resize.observe(element);
    intersection.observe(element);
    banner.addEventListener('pointermove', move, { passive: true });
    banner.addEventListener('pointerleave', leave);
    motion.addEventListener('change', sync);
    document.addEventListener('visibilitychange', sync);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      intersection.disconnect();
      banner.removeEventListener('pointermove', move);
      banner.removeEventListener('pointerleave', leave);
      motion.removeEventListener('change', sync);
      document.removeEventListener('visibilitychange', sync);
    };
  }, []);
  return (
    <div className="hero-atmosphere" ref={root} aria-hidden="true">
      <canvas ref={canvas} className="hero-particle-canvas" />
      <div className="hero-object-field">
        {[Headphones, Armchair, Camera, Shirt, BookOpen, Watch, Gamepad2].map((Icon, index) => (
          <div key={index} className={`hero-object hero-object-${index}`}>
            <div className="hero-object-glass">
              <Icon strokeWidth={1.15} />
            </div>
          </div>
        ))}
      </div>
      <div className="hero-atmosphere-shade" />
    </div>
  );
}
