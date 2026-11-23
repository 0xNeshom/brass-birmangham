'use client';

import { useEffect, useRef } from 'react';
import styles from './after-rain.module.css';

const vertexSource = `
attribute vec2 position;
varying vec2 uv;
void main() {
  uv = vec2(position.x, -position.y) * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}`;

const fragmentSource = `
precision highp float;
varying vec2 uv;
uniform sampler2D photograph;
uniform sampler2D water;
uniform vec2 crop;
uniform vec2 imageSize;
uniform vec3 ripples[4];
uniform float time;
void main() {
  vec2 imageUV = (uv - 0.5) * crop + 0.5;
  float mask = texture2D(water, imageUV).r;
  if (mask <= 0.0) {
    gl_FragColor = vec4(0.0);
    return;
  }
  vec2 offset = vec2(0.0);
  for (int i = 0; i < 4; i++) {
    float age = time - ripples[i].z;
    if (age >= 0.0 && age < 1.6) {
      vec2 delta = (imageUV - ripples[i].xy) * vec2(imageSize.x / imageSize.y, 1.0);
      float distance = length(delta);
      float ring = distance - age * 0.14;
      float envelope = exp(-abs(ring) * 55.0) * (1.0 - age / 1.6);
      offset += delta / max(distance, 0.001) * sin(ring * 210.0) * envelope * 0.0028;
    }
  }
  offset *= mask * texture2D(water, clamp(imageUV + offset, 0.0, 1.0)).r;
  gl_FragColor = vec4(texture2D(photograph, imageUV + offset).rgb, mask);
}`;

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });
}

function createRippleEffect(canvas: HTMLCanvasElement, photograph: HTMLImageElement, mask: HTMLImageElement) {
  const gl = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: false });
  if (!gl) return () => {};
  const shaders: WebGLShader[] = [];
  const textures: WebGLTexture[] = [];
  const program = gl.createProgram();
  const buffer = gl.createBuffer();
  let frame = 0;
  let disposed = false;
  const release = () => {
    disposed = true;
    cancelAnimationFrame(frame);
    textures.forEach(texture => gl.deleteTexture(texture));
    shaders.forEach(shader => gl.deleteShader(shader));
    gl.deleteProgram(program);
    gl.deleteBuffer(buffer);
    canvas.style.opacity = '0';
  };
  if (!program || !buffer) { release(); return () => {}; }
  for (const [type, source] of [[gl.VERTEX_SHADER, vertexSource], [gl.FRAGMENT_SHADER, fragmentSource]] as const) {
    const shader = gl.createShader(type);
    if (!shader) { release(); return () => {}; }
    shaders.push(shader);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { release(); return () => {}; }
    gl.attachShader(program, shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { release(); return () => {}; }
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  for (const [index, image, name] of [[0, photograph, 'photograph'], [1, mask, 'water']] as const) {
    const texture = gl.createTexture();
    if (!texture) { release(); return () => {}; }
    textures.push(texture);
    gl.activeTexture(gl.TEXTURE0 + index);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.uniform1i(gl.getUniformLocation(program, name), index);
  }
  const hitCanvas = document.createElement('canvas');
  hitCanvas.width = mask.naturalWidth;
  hitCanvas.height = mask.naturalHeight;
  const context = hitCanvas.getContext('2d', { willReadFrequently: true });
  if (!context) { release(); return () => {}; }
  context.drawImage(mask, 0, 0);
  const pixels = context.getImageData(0, 0, hitCanvas.width, hitCanvas.height).data;
  const rippleUniform = gl.getUniformLocation(program, 'ripples[0]');
  const timeUniform = gl.getUniformLocation(program, 'time');
  const cropUniform = gl.getUniformLocation(program, 'crop');
  const ripples = new Float32Array([0, 0, -100, 0, 0, -100, 0, 0, -100, 0, 0, -100]);
  gl.uniform2f(gl.getUniformLocation(program, 'imageSize'), photograph.naturalWidth, photograph.naturalHeight);
  let cropX = 1;
  let cropY = 1;
  let nextRipple = 0;
  let lastRipple = -100;
  let lastDraw = -100;
  let previousX = -1;
  let previousY = -1;
  let touchStart: { id: number; x: number; y: number } | undefined;
  const resize = () => {
    const bounds = canvas.getBoundingClientRect();
    const scale = Math.max(bounds.width / photograph.naturalWidth, bounds.height / photograph.naturalHeight);
    cropX = bounds.width / (photograph.naturalWidth * scale);
    cropY = bounds.height / (photograph.naturalHeight * scale);
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.max(1, Math.round(bounds.width * dpr));
    canvas.height = Math.max(1, Math.round(bounds.height * dpr));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(cropUniform, cropX, cropY);
    canvas.style.opacity = '0';
  };
  const draw = (now: number) => {
    frame = 0;
    if (disposed || document.hidden) { canvas.style.opacity = '0'; return; }
    const seconds = now / 1000;
    if (seconds - lastRipple > 1.6) { canvas.style.opacity = '0'; return; }
    if (seconds - lastDraw >= 1 / 30) {
      gl.uniform1f(timeUniform, seconds);
      gl.uniform3fv(rippleUniform, ripples);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      canvas.style.opacity = '1';
      lastDraw = seconds;
    }
    frame = requestAnimationFrame(draw);
  };
  const interact = (event: PointerEvent) => {
    if (disposed || document.hidden) return;
    if (event.target instanceof Element && event.target.closest('form, a, button, input, textarea, select, label, [role="button"]')) return;
    if (event.type === 'pointermove' && event.pointerType === 'touch') return;
    const bounds = canvas.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width;
    const y = (event.clientY - bounds.top) / bounds.height;
    if (x < 0 || x >= 1 || y < 0 || y >= 1) return;
    const u = (x - 0.5) * cropX + 0.5;
    const v = (y - 0.5) * cropY + 0.5;
    const pixel = (Math.floor(v * hitCanvas.height) * hitCanvas.width + Math.floor(u * hitCanvas.width)) * 4;
    if (pixels[pixel] < 180) return;
    const now = performance.now() / 1000;
    if (now - lastRipple < 0.1 || (event.type === 'pointermove' && Math.hypot(u - previousX, v - previousY) < 0.018)) return;
    ripples.set([u, v, now], nextRipple * 3);
    nextRipple = (nextRipple + 1) % 4;
    previousX = u;
    previousY = v;
    lastRipple = now;
    if (!frame) frame = requestAnimationFrame(draw);
  };
  const startPointer = (event: PointerEvent) => {
    if (event.pointerType === 'touch') {
      if (event.isPrimary) touchStart = { id: event.pointerId, x: event.clientX, y: event.clientY };
    } else interact(event);
  };
  const finishTouch = (event: PointerEvent) => {
    if (touchStart?.id !== event.pointerId) return;
    const { x, y } = touchStart;
    touchStart = undefined;
    if (event.type === 'pointerup' && Math.hypot(event.clientX - x, event.clientY - y) <= 12) interact(event);
  };
  const lost = (event: Event) => { event.preventDefault(); release(); };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  window.addEventListener('pointermove', interact, { passive: true });
  window.addEventListener('pointerdown', startPointer, { passive: true });
  window.addEventListener('pointerup', finishTouch, { passive: true });
  window.addEventListener('pointercancel', finishTouch, { passive: true });
  canvas.addEventListener('webglcontextlost', lost);
  return () => {
    observer.disconnect();
    window.removeEventListener('pointermove', interact);
    window.removeEventListener('pointerdown', startPointer);
    window.removeEventListener('pointerup', finishTouch);
    window.removeEventListener('pointercancel', finishTouch);
    canvas.removeEventListener('webglcontextlost', lost);
    release();
  };
}

export function AfterRain() {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const mobile = window.matchMedia('(max-width: 760px)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let dispose = () => {};
    let generation = 0;
    const initialize = () => {
      const current = ++generation;
      dispose();
      if (reducedMotion.matches) return;
      const variant = mobile.matches ? 'mobile' : 'desktop';
      Promise.all([loadImage(`/after-rain/${variant}.webp`), loadImage(`/after-rain/${variant}-mask.png`)])
        .then(([photograph, mask]) => {
          if (current === generation && canvas.current) dispose = createRippleEffect(canvas.current, photograph, mask);
        }).catch(() => { /* The server-rendered picture remains visible if enhancement fails. */ });
    };
    initialize();
    mobile.addEventListener('change', initialize);
    reducedMotion.addEventListener('change', initialize);
    return () => {
      generation++;
      dispose();
      mobile.removeEventListener('change', initialize);
      reducedMotion.removeEventListener('change', initialize);
    };
  }, []);
  return <div className={styles.scene} aria-hidden="true">
    <picture>
      <source media="(max-width: 760px)" srcSet="/after-rain/mobile.webp" />
      {/* This eagerly loaded decorative image is also the complete no-JavaScript fallback. */}
      <img src="/after-rain/desktop.webp" alt="" fetchPriority="high" decoding="async" />
    </picture>
    <canvas ref={canvas} />
  </div>;
}
