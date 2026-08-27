/**
 * Aurora 极光背景动效
 * 原生 WebGL2 实现，完全对齐参考代码的动画节奏
 */
(function () {
  'use strict';

  var VERT_SRC = [
    '#version 300 es',
    'in vec2 position;',
    'void main() {',
    '  gl_Position = vec4(position, 0.0, 1.0);',
    '}'
  ].join('\n');

  var FRAG_SRC = [
    '#version 300 es',
    'precision highp float;',
    '',
    'uniform float uTime;',
    'uniform float uAmplitude;',
    'uniform vec3 uColorStops[3];',
    'uniform vec2 uResolution;',
    'uniform float uBlend;',
    '',
    'out vec4 fragColor;',
    '',
    'vec3 permute(vec3 x) {',
    '  return mod(((x * 34.0) + 1.0) * x, 289.0);',
    '}',
    '',
    'float snoise(vec2 v){',
    '  const vec4 C = vec4(',
    '      0.211324865405187, 0.366025403784439,',
    '      -0.577350269189626, 0.024390243902439',
    '  );',
    '  vec2 i  = floor(v + dot(v, C.yy));',
    '  vec2 x0 = v - i + dot(i, C.xx);',
    '  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);',
    '  vec4 x12 = x0.xyxy + C.xxzz;',
    '  x12.xy -= i1;',
    '  i = mod(i, 289.0);',
    '',
    '  vec3 p = permute(',
    '      permute(i.y + vec3(0.0, i1.y, 1.0))',
    '    + i.x + vec3(0.0, i1.x, 1.0)',
    '  );',
    '',
    '  vec3 m = max(',
    '      0.5 - vec3(',
    '          dot(x0, x0),',
    '          dot(x12.xy, x12.xy),',
    '          dot(x12.zw, x12.zw)',
    '      ), ',
    '      0.0',
    '  );',
    '  m = m * m;',
    '  m = m * m;',
    '',
    '  vec3 x = 2.0 * fract(p * C.www) - 1.0;',
    '  vec3 h = abs(x) - 0.5;',
    '  vec3 ox = floor(x + 0.5);',
    '  vec3 a0 = x - ox;',
    '  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);',
    '',
    '  vec3 g;',
    '  g.x  = a0.x  * x0.x  + h.x  * x0.y;',
    '  g.yz = a0.yz * x12.xz + h.yz * x12.yw;',
    '  return 130.0 * dot(m, g);',
    '}',
    '',
    'struct ColorStop {',
    '  vec3 color;',
    '  float position;',
    '};',
    '',
    '#define COLOR_RAMP(colors, factor, finalColor) {              \\',
    '  int index = 0;                                            \\',
    '  for (int i = 0; i < 2; i++) {                              \\',
    '     ColorStop currentColor = colors[i];                    \\',
    '     bool isInBetween = currentColor.position <= factor;    \\',
    '     index = int(mix(float(index), float(i), float(isInBetween))); \\',
    '  }                                                         \\',
    '  ColorStop currentColor = colors[index];                   \\',
    '  ColorStop nextColor = colors[index + 1];                  \\',
    '  float range = nextColor.position - currentColor.position; \\',
    '  float lerpFactor = (factor - currentColor.position) / range; \\',
    '  finalColor = mix(currentColor.color, nextColor.color, lerpFactor); \\',
    '}',
    '',
    'void main() {',
    '  vec2 uv = gl_FragCoord.xy / uResolution;',
    '  ',
    '  ColorStop colors[3];',
    '  colors[0] = ColorStop(uColorStops[0], 0.0);',
    '  colors[1] = ColorStop(uColorStops[1], 0.5);',
    '  colors[2] = ColorStop(uColorStops[2], 1.0);',
    '  ',
    '  vec3 rampColor;',
    '  COLOR_RAMP(colors, uv.x, rampColor);',
    '  ',
    '  float height = snoise(vec2(uv.x * 2.0 + uTime * 0.1, uTime * 0.25)) * 0.5 * uAmplitude;',
    '  height = exp(height);',
    '  height = (uv.y * 2.0 - height + 0.2);',
    '  float intensity = 0.6 * height;',
    '  ',
    '  float midPoint = 0.20;',
    '  float auroraAlpha = smoothstep(midPoint - uBlend * 0.5, midPoint + uBlend * 0.5, intensity);',
    '  ',
    '  vec3 auroraColor = intensity * rampColor;',
    '  ',
    '  fragColor = vec4(auroraColor * auroraAlpha, auroraAlpha);',
    '}'
  ].join('\n');

  function hexToRgb(hex) {
    var h = (hex || '').replace('#', '').trim();
    if (h.length === 3) {
      h = h.split('').map(function (c) { return c + c; }).join('');
    }
    var num = parseInt(h, 16);
    if (isNaN(num) || h.length !== 6) return null;
    return {
      r: ((num >> 16) & 255) / 255,
      g: ((num >> 8) & 255) / 255,
      b: (num & 255) / 255
    };
  }

  function compileShader(gl, type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.error('[Aurora] shader compile error:', gl.getShaderInfoLog(sh));
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  }

  function createProgram(gl) {
    var vs = compileShader(gl, gl.VERTEX_SHADER, VERT_SRC);
    var fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
    if (!vs || !fs) return null;
    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('[Aurora] program link error:', gl.getProgramInfoLog(prog));
      gl.deleteProgram(prog);
      return null;
    }
    return prog;
  }

  var TRI_VERTICES = new Float32Array([-1, -1, 3, -1, -1, 3]);

  function AuroraInstance(container, opts) {
    this.container = container;
    this.opts = opts;

    var canvas = document.createElement('canvas');
    canvas.className = 'page-aurora-canvas';
    canvas.style.cssText = 'display:block;width:100%;height:100%;';
    container.appendChild(canvas);
    this.canvas = canvas;

    var gl = canvas.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: true
    });
    if (!gl) {
      console.warn('[Aurora] WebGL2 not supported, effect disabled.');
      container.style.display = 'none';
      return;
    }
    this.gl = gl;

    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.canvas.style.backgroundColor = 'transparent';

    var program = createProgram(gl);
    if (!program) {
      container.style.display = 'none';
      return;
    }
    this.program = program;

    var vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, TRI_VERTICES, gl.STATIC_DRAW);
    this.vbo = vbo;

    this.loc = {
      position: gl.getAttribLocation(program, 'position'),
      uTime: gl.getUniformLocation(program, 'uTime'),
      uAmplitude: gl.getUniformLocation(program, 'uAmplitude'),
      uColorStops: gl.getUniformLocation(program, 'uColorStops'),
      uResolution: gl.getUniformLocation(program, 'uResolution'),
      uBlend: gl.getUniformLocation(program, 'uBlend')
    };

    var vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.enableVertexAttribArray(this.loc.position);
    gl.vertexAttribPointer(this.loc.position, 2, gl.FLOAT, false, 0, 0);
    this.vao = vao;
    gl.bindVertexArray(null);

    this.resize();
    this.running = true;
    this.tick = this.tick.bind(this);
    this.boundResize = this.resize.bind(this);
    window.addEventListener('resize', this.boundResize);

    this._lastT = performance.now();
    this._elapsed = 0;
    requestAnimationFrame(this.tick);
  }

  AuroraInstance.prototype.resize = function () {
    if (!this.gl) return;
    var w = this.container.clientWidth || 1;
    var h = this.container.clientHeight || 1;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = Math.max(1, Math.floor(w * dpr));
    var H = Math.max(1, Math.floor(h * dpr));
    if (this.canvas.width !== W) this.canvas.width = W;
    if (this.canvas.height !== H) this.canvas.height = H;
    this.gl.viewport(0, 0, W, H);
    this._res = [W, H];
  };

  AuroraInstance.prototype.colorStopsArray = function () {
    var o = this.opts;
    var arr = [];
    [o.color1, o.color2, o.color3].forEach(function (hex) {
      var c = hexToRgb(hex) || { r: 0, g: 0, b: 0 };
      arr.push(c.r, c.g, c.b);
    });
    return new Float32Array(arr);
  };

  AuroraInstance.prototype.tick = function (frameT) {
    if (!this.running) return;
    this._raf = requestAnimationFrame(this.tick);

    var gl = this.gl;
    if (!gl) return;

    // 精确复现参考代码的时间缩放链：
    //   参考代码 update(): const { time = t * 0.01, speed = 1.0 } = propsRef.current;
    //                      program.uniforms.uTime.value = time * speed * 0.1;
    //   即 uTime = frameT(毫秒) * 0.01 * speed * 0.1 = frameT * 0.001 * speed
    // 这里用 frameT(入参，来自 requestAnimationFrame) 走完整的乘法链
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);
    gl.uniform1f(this.loc.uTime, frameT * 0.01 * this.opts.speed * 0.1);
    gl.uniform1f(this.loc.uAmplitude, this.opts.amplitude);
    gl.uniform1f(this.loc.uBlend, this.opts.blend);
    gl.uniform3fv(this.loc.uColorStops, this.colorStopsArray());
    gl.uniform2f(this.loc.uResolution, this._res[0], this._res[1]);

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
  };

  AuroraInstance.prototype.destroy = function () {
    this.running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    window.removeEventListener('resize', this.boundResize);
    if (this.gl) {
      var ext = this.gl.getExtension('WEBGL_lose_context');
      if (ext) ext.loseContext();
    }
    if (this.canvas && this.canvas.parentNode === this.container) {
      this.container.removeChild(this.canvas);
    }
  };

  var DEFAULTS = {
    color1: '#7cff67',
    color2: '#8cf0d7',
    color3: '#000000',
    amplitude: 1.0,
    blend: 0.6,
    speed: 1.0
  };

  function readOpts(container) {
    var o = Object.assign({}, DEFAULTS);
    var c1 = container.getAttribute('data-color-1');
    var c2 = container.getAttribute('data-color-2');
    var c3 = container.getAttribute('data-color-3');
    if (c1) o.color1 = c1;
    if (c2) o.color2 = c2;
    if (c3) o.color3 = c3;
    var amp = container.getAttribute('data-amplitude');
    if (amp !== null && !isNaN(parseFloat(amp))) o.amplitude = parseFloat(amp);
    var blend = container.getAttribute('data-blend');
    if (blend !== null && !isNaN(parseFloat(blend))) o.blend = parseFloat(blend);
    var speed = container.getAttribute('data-speed');
    if (speed !== null && !isNaN(parseFloat(speed))) o.speed = parseFloat(speed);
    return o;
  }

  var instances = [];

  function initAll() {
    var nodes = document.querySelectorAll('.page-aurora');
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      if (n.dataset.auroraInit === '1') continue;
      n.dataset.auroraInit = '1';
      instances.push(new AuroraInstance(n, readOpts(n)));
    }
  }

  function destroyAll() {
    instances.forEach(function (inst) { inst.destroy(); });
    instances = [];
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  window.AuroraHeader = {
    init: initAll,
    destroy: destroyAll
  };
})();
