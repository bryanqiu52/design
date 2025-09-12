/*
流体光标效果 - 从Vue组件提取的纯JavaScript实现
原组件路径: i:\桌面文件\admin\1111
*/

class FluidCursor {
  constructor() {
    // 初始化配置
    this.config = {
      simResolution: 128,
      dyeResolution: 1440,
      captureResolution: 512,
      densityDissipation: 3.5,
      velocityDissipation: 2,
      pressure: 0.1,
      pressureIterations: 20,
      curl: 3,
      splatRadius: 0.2,
      splatForce: 6000,
      shading: true,
      colorUpdateSpeed: 10,
      backColor: { r: 0.5, g: 0, b: 0 },
      transparent: true,
      PAUSED: false
    };

    // 指针状态
    this.pointers = [this.createPointer()];

    // WebGL相关变量
    this.canvas = null;
    this.gl = null;
    this.ext = null;

    // 帧缓冲区相关
    this.dye = null;
    this.velocity = null;
    this.divergence = null;
    this.curl = null;
    this.pressure = null;

    // 初始化时间
    this.lastTime = 0;
  }

  // 创建指针对象
  createPointer() {
    return {
      id: -1,
      texcoordX: 0,
      texcoordY: 0,
      prevTexcoordX: 0,
      prevTexcoordY: 0,
      deltaX: 0,
      deltaY: 0,
      down: false,
      moved: false,
      color: { r: 0, g: 0, b: 0 }
    };
  }

  // 初始化WebGL上下文
  getWebGLContext(canvas) {
    const params = {
      alpha: true,
      depth: false,
      stencil: false,
      antialias: false,
      preserveDrawingBuffer: false
    };

    let gl = canvas.getContext('webgl2', params);

    if (!gl) {
      gl = canvas.getContext('webgl', params) || canvas.getContext('experimental-webgl', params);
    }

    if (!gl) {
      throw new Error('Unable to initialize WebGL.');
    }

    const isWebGL2 = 'drawBuffers' in gl;
    let supportLinearFiltering = false;
    let halfFloat = null;

    if (isWebGL2) {
      gl.getExtension('EXT_color_buffer_float');
      supportLinearFiltering = !!gl.getExtension('OES_texture_float_linear');
    } else {
      halfFloat = gl.getExtension('OES_texture_half_float');
      supportLinearFiltering = !!gl.getExtension('OES_texture_half_float_linear');
    }

    gl.clearColor(0, 0, 0, 1);

    const halfFloatTexType = isWebGL2 ? gl.HALF_FLOAT : (halfFloat && halfFloat.HALF_FLOAT_OES) || 0;

    let formatRGBA, formatRG, formatR;

    if (isWebGL2) {
      formatRGBA = this.getSupportedFormat(
        gl,
        gl.RGBA16F,
        gl.RGBA,
        halfFloatTexType
      );
      formatRG = this.getSupportedFormat(
        gl,
        gl.RG16F,
        gl.RG,
        halfFloatTexType
      );
      formatR = this.getSupportedFormat(
        gl,
        gl.R16F,
        gl.RED,
        halfFloatTexType
      );
    } else {
      formatRGBA = this.getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
      formatRG = this.getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
      formatR = this.getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
    }

    return {
      gl,
      ext: {
        formatRGBA,
        formatRG,
        formatR,
        halfFloatTexType,
        supportLinearFiltering
      }
    };
  }

  // 检查支持的纹理格式
  getSupportedFormat(gl, internalFormat, format, type) {
    if (!this.supportRenderTextureFormat(gl, internalFormat, format, type)) {
      // WebGL2 降级处理
      if ('drawBuffers' in gl) {
        switch (internalFormat) {
          case gl.R16F:
            return this.getSupportedFormat(gl, gl.RG16F, gl.RG, type);
          case gl.RG16F:
            return this.getSupportedFormat(gl, gl.RGBA16F, gl.RGBA, type);
          default:
            return null;
        }
      }
      return null;
    }
    return { internalFormat, format };
  }

  // 支持渲染纹理格式检查
  supportRenderTextureFormat(gl, internalFormat, format, type) {
    const texture = gl.createTexture();
    if (!texture) return false;

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null);

    const fbo = gl.createFramebuffer();
    if (!fbo) return false;

    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    return status === gl.FRAMEBUFFER_COMPLETE;
  }

  // 编译着色器
  compileShader(type, source, keywords = null) {
    const gl = this.gl;
    const shaderSource = this.addKeywords(source, keywords);
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, shaderSource);
    gl.compileShader(shader);
    return shader;
  }

  // 添加关键字到着色器源码
  addKeywords(source, keywords) {
    if (!keywords) return source;
    let keywordsString = '';
    for (const keyword of keywords) {
      keywordsString += `#define ${keyword}\n`;
    }
    return keywordsString + source;
  }

  // 创建着色器程序
  createProgram(vertexShader, fragmentShader) {
    const gl = this.gl;
    if (!vertexShader || !fragmentShader) return null;
    const program = gl.createProgram();
    if (!program) return null;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    return program;
  }

  // 获取着色器程序的uniform变量
  getUniforms(program) {
    const gl = this.gl;
    const uniforms = {};
    const uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < uniformCount; i++) {
      const uniformInfo = gl.getActiveUniform(program, i);
      if (uniformInfo) {
        uniforms[uniformInfo.name] = gl.getUniformLocation(program, uniformInfo.name);
      }
    }
    return uniforms;
  }

  // 初始化帧缓冲区
    initFramebuffers() {
    const gl = this.gl;
    const ext = this.ext;

    // 创建单个帧缓冲区的辅助函数
    const createFBO = (width, height, format) => {
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, format.internalFormat, width, height, 0, format.format, ext.halfFloatTexType, null);

      const fbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

      return {
        texture,
        fbo,
        width,
        height,
        texelSizeX: 1 / width,
        texelSizeY: 1 / height,
        attach: (id) => {
          gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + id, gl.TEXTURE_2D, texture, 0);
          return id + 1;
        }
      };
    };

    // 创建双重帧缓冲区的辅助函数
    const createDoubleFBO = (width, height, format) => {
      let read = createFBO(width, height, format);
      let write = createFBO(width, height, format);
      return {
        width,
        height,
        texelSizeX: 1 / width,
        texelSizeY: 1 / height,
        read,
        write,
        swap: () => {
          const temp = read;
          read = write;
          write = temp;
        }
      };
    };

    // 初始化各种帧缓冲区
    this.dye = createDoubleFBO(this.config.DYE_RESOLUTION, this.config.DYE_RESOLUTION, ext.formatRGBA);
    this.velocity = createDoubleFBO(this.config.SIM_RESOLUTION, this.config.SIM_RESOLUTION, ext.formatRG);
    this.divergence = createFBO(this.config.SIM_RESOLUTION, this.config.SIM_RESOLUTION, ext.formatR);
    this.curl = createFBO(this.config.SIM_RESOLUTION, this.config.SIM_RESOLUTION, ext.formatR);
    this.pressure = createDoubleFBO(this.config.SIM_RESOLUTION, this.config.SIM_RESOLUTION, ext.formatR);
  }

  // 初始化着色器程序
  initPrograms() {
    const gl = this.gl;
    const ext = this.ext;

    // 基础顶点着色器
    const baseVertexShader = this.compileShader(
      gl.VERTEX_SHADER,
      `
        precision highp float;
        attribute vec2 aPosition;
        varying vec2 vUv;
        varying vec2 vL;
        varying vec2 vR;
        varying vec2 vT;
        varying vec2 vB;
        uniform vec2 texelSize;

        void main () {
          vUv = aPosition * 0.5 + 0.5;
          vL = vUv - vec2(texelSize.x, 0.0);
          vR = vUv + vec2(texelSize.x, 0.0);
          vT = vUv + vec2(0.0, texelSize.y);
          vB = vUv - vec2(0.0, texelSize.y);
          gl_Position = vec4(aPosition, 0.0, 1.0);
        }
      `
    );

    // 复制着色器
    const copyShader = this.compileShader(
      gl.FRAGMENT_SHADER,
      `
        precision mediump float;
        precision mediump sampler2D;
        varying highp vec2 vUv;
        uniform sampler2D uTexture;

        void main () {
          gl_FragColor = texture2D(uTexture, vUv);
        }
      `
    );

    // 清除着色器
    const clearShader = this.compileShader(
      gl.FRAGMENT_SHADER,
      `
        precision mediump float;
        precision mediump sampler2D;
        varying highp vec2 vUv;
        uniform sampler2D uTexture;
        uniform float value;

        void main () {
          gl_FragColor = value * texture2D(uTexture, vUv);
        }
      `
    );

    // 显示着色器源码
    const displayShaderSource = `
        precision highp float;
        precision highp sampler2D;
        varying vec2 vUv;
        varying vec2 vL;
        varying vec2 vR;
        varying vec2 vT;
        varying vec2 vB;
        uniform sampler2D uTexture;
        uniform vec2 texelSize;

        vec3 linearToGamma (vec3 color) {
          color = max(color, vec3(0));
          return max(1.055 * pow(color, vec3(0.416666667)) - 0.055, vec3(0));
        }

        void main () {
          vec3 c = texture2D(uTexture, vUv).rgb;
          #ifdef SHADING
            vec3 lc = texture2D(uTexture, vL).rgb;
            vec3 rc = texture2D(uTexture, vR).rgb;
            vec3 tc = texture2D(uTexture, vT).rgb;
            vec3 bc = texture2D(uTexture, vB).rgb;

            float dx = length(rc) - length(lc);
            float dy = length(tc) - length(bc);

            vec3 n = normalize(vec3(dx, dy, length(texelSize)));
            vec3 l = vec3(0.0, 0.0, 1.0);

            float diffuse = clamp(dot(n, l) + 0.7, 0.7, 1.0);
            c *= diffuse;
          #endif

          float a = max(c.r, max(c.g, c.b));
          gl_FragColor = vec4(c, a);
        }
      `;

    // 显示着色器 (带阴影)
    const displayShaderWithShading = this.compileShader(
      gl.FRAGMENT_SHADER,
      displayShaderSource,
      ['SHADING']
    );

    // 显示着色器 (不带阴影)
    const displayShaderWithoutShading = this.compileShader(
      gl.FRAGMENT_SHADER,
      displayShaderSource
    );

    // 溅射着色器
    const splatShader = this.compileShader(
      gl.FRAGMENT_SHADER,
      `
        precision highp float;
        precision highp sampler2D;
        varying vec2 vUv;
        uniform sampler2D uTarget;
        uniform float aspectRatio;
        uniform vec3 color;
        uniform vec2 point;
        uniform float radius;

        void main () {
          vec2 p = vUv - point.xy;
          p.x *= aspectRatio;
          vec3 splat = exp(-dot(p, p) / radius) * color;
          vec3 base = texture2D(uTarget, vUv).xyz;
          gl_FragColor = vec4(base + splat, 1.0);
        }
      `
    );

    // 平流着色器
    const advectionShader = this.compileShader(
      gl.FRAGMENT_SHADER,
      `
        precision highp float;
        precision highp sampler2D;
        varying vec2 vUv;
        uniform sampler2D uVelocity;
        uniform sampler2D uSource;
        uniform vec2 texelSize;
        uniform vec2 dyeTexelSize;
        uniform float dt;
        uniform float dissipation;

        vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {
          vec2 st = uv / tsize - 0.5;
          vec2 iuv = floor(st);
          vec2 fuv = fract(st);

          vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);
          vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
          vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);
          vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);

          return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
        }

        void main () {
          #ifdef MANUAL_FILTERING
            vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize;
            vec4 result = bilerp(uSource, coord, dyeTexelSize);
          #else
            vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
            vec4 result = texture2D(uSource, coord);
          #endif
          float decay = 1.0 + dissipation * dt;
          gl_FragColor = result / decay;
        }
      `,
      ext.supportLinearFiltering ? null : ['MANUAL_FILTERING']
    );

    // 散度着色器
    const divergenceShader = this.compileShader(
      gl.FRAGMENT_SHADER,
      `
        precision mediump float;
        precision mediump sampler2D;
        varying highp vec2 vUv;
        varying highp vec2 vL;
        varying highp vec2 vR;
        varying highp vec2 vT;
        varying highp vec2 vB;
        uniform sampler2D uVelocity;

        void main () {
          float L = texture2D(uVelocity, vL).x;
          float R = texture2D(uVelocity, vR).x;
          float T = texture2D(uVelocity, vT).y;
          float B = texture2D(uVelocity, vB).y;

          vec2 C = texture2D(uVelocity, vUv).xy;
          if (vL.x < 0.0) { L = -C.x; }
          if (vR.x > 1.0) { R = -C.x; }
          if (vT.y > 1.0) { T = -C.y; }
          if (vB.y < 0.0) { B = -C.y; }

          float div = 0.5 * (R - L + T - B);
          gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
        }
      `
    );

    // 旋度着色器
    const curlShader = this.compileShader(
      gl.FRAGMENT_SHADER,
      `
        precision mediump float;
        precision mediump sampler2D;
        varying highp vec2 vUv;
        varying highp vec2 vL;
        varying highp vec2 vR;
        varying highp vec2 vT;
        varying highp vec2 vB;
        uniform sampler2D uVelocity;

        void main () {
          float L = texture2D(uVelocity, vL).y;
          float R = texture2D(uVelocity, vR).y;
          float T = texture2D(uVelocity, vT).x;
          float B = texture2D(uVelocity, vB).x;
          float vorticity = R - L - T + B;
          gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
        }
      `
    );

    // 涡度着色器
    const vorticityShader = this.compileShader(
      gl.FRAGMENT_SHADER,
      `
        precision highp float;
        precision highp sampler2D;
        varying vec2 vUv;
        varying vec2 vL;
        varying vec2 vR;
        varying vec2 vT;
        varying vec2 vB;
        uniform sampler2D uVelocity;
        uniform sampler2D uCurl;
        uniform float curl;
        uniform float dt;

        void main () {
          float L = texture2D(uCurl, vL).x;
          float R = texture2D(uCurl, vR).x;
          float T = texture2D(uCurl, vT).x;
          float B = texture2D(uCurl, vB).x;
          float C = texture2D(uCurl, vUv).x;

          vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
          force /= length(force) + 0.0001;
          force *= curl * C;
          force.y *= -1.0;

          vec2 velocity = texture2D(uVelocity, vUv).xy;
          velocity += force * dt;
          velocity = min(max(velocity, -1000.0), 1000.0);
          gl_FragColor = vec4(velocity, 0.0, 1.0);
        }
      `
    );

    // 压力着色器
    const pressureShader = this.compileShader(
      gl.FRAGMENT_SHADER,
      `
        precision mediump float;
        precision mediump sampler2D;
        varying highp vec2 vUv;
        varying highp vec2 vL;
        varying highp vec2 vR;
        varying highp vec2 vT;
        varying highp vec2 vB;
        uniform sampler2D uPressure;
        uniform sampler2D uDivergence;

        void main () {
          float L = texture2D(uPressure, vL).x;
          float R = texture2D(uPressure, vR).x;
          float T = texture2D(uPressure, vT).x;
          float B = texture2D(uPressure, vB).x;
          float C = texture2D(uPressure, vUv).x;
          float divergence = texture2D(uDivergence, vUv).x;
          float pressure = (L + R + B + T - divergence) * 0.25;
          gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
        }
      `
    );

    // 梯度减法着色器
    const gradientSubtractShader = this.compileShader(
      gl.FRAGMENT_SHADER,
      `
        precision mediump float;
        precision mediump sampler2D;
        varying highp vec2 vUv;
        varying highp vec2 vL;
        varying highp vec2 vR;
        varying highp vec2 vT;
        varying highp vec2 vB;
        uniform sampler2D uPressure;
        uniform sampler2D uVelocity;

        void main () {
          float L = texture2D(uPressure, vL).x;
          float R = texture2D(uPressure, vR).x;
          float T = texture2D(uPressure, vT).x;
          float B = texture2D(uPressure, vB).x;
          vec2 velocity = texture2D(uVelocity, vUv).xy;
          velocity.xy -= vec2(R - L, T - B);
          gl_FragColor = vec4(velocity, 0.0, 1.0);
        }
      `
    );

    // 存储程序
    this.programs = {
      copy: this.createProgram(baseVertexShader, copyShader),
      clear: this.createProgram(baseVertexShader, clearShader),
      displayWithShading: this.createProgram(baseVertexShader, displayShaderWithShading),
      displayWithoutShading: this.createProgram(baseVertexShader, displayShaderWithoutShading),
      splat: this.createProgram(baseVertexShader, splatShader),
      advection: this.createProgram(baseVertexShader, advectionShader),
      divergence: this.createProgram(baseVertexShader, divergenceShader),
      curl: this.createProgram(baseVertexShader, curlShader),
      vorticity: this.createProgram(baseVertexShader, vorticityShader),
      pressure: this.createProgram(baseVertexShader, pressureShader),
      gradientSubtract: this.createProgram(baseVertexShader, gradientSubtractShader)
    };

    // 获取uniforms
    this.uniforms = {
      copy: this.getUniforms(this.programs.copy),
      clear: this.getUniforms(this.programs.clear),
      displayWithShading: this.getUniforms(this.programs.displayWithShading),
      displayWithoutShading: this.getUniforms(this.programs.displayWithoutShading),
      splat: this.getUniforms(this.programs.splat),
      advection: this.getUniforms(this.programs.advection),
      divergence: this.getUniforms(this.programs.divergence),
      curl: this.getUniforms(this.programs.curl),
      vorticity: this.getUniforms(this.programs.vorticity),
      pressure: this.getUniforms(this.programs.pressure),
      gradientSubtract: this.getUniforms(this.programs.gradientSubtract)
    };
  }

  // 全屏三角形绘制
  blit(target = null, doClear = false) {
    const gl = this.gl;
    if (!gl) return;

    if (!target) {
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    } else {
      gl.viewport(0, 0, target.width, target.height);
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
    }

    if (doClear) {
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }

    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
  }

  // 初始化全屏三角形
  initFullscreenTriangle() {
    const gl = this.gl;
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);

    const elemBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, elemBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);

    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);
  }

  // 渲染帧
  renderFrame(dt) {
    const gl = this.gl;
    const config = this.config;

    // 处理指针输入
    this.updatePointers();

    // 步骤1: 应用涡度
    gl.useProgram(this.programs.curl);
    gl.uniform1f(this.uniforms.curl.uVelocity, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.velocity.read.texture);
    gl.uniform1i(this.uniforms.curl.uVelocity, 0);
    this.blit(this.curl);

    gl.useProgram(this.programs.vorticity);
    gl.uniform1f(this.uniforms.vorticity.curl, config.CURL);
    gl.uniform1f(this.uniforms.vorticity.dt, dt);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.velocity.read.texture);
    gl.uniform1i(this.uniforms.vorticity.uVelocity, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.curl.texture);
    gl.uniform1i(this.uniforms.vorticity.uCurl, 1);
    this.blit(this.velocity.write);
    this.velocity.swap();

    // 步骤2: 计算散度
    gl.useProgram(this.programs.divergence);
    gl.uniform2f(this.uniforms.divergence.texelSize, this.velocity.read.texelSizeX, this.velocity.read.texelSizeY);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.velocity.read.texture);
    gl.uniform1i(this.uniforms.divergence.uVelocity, 0);
    this.blit(this.divergence);

    // 步骤3: 压力求解
    gl.useProgram(this.programs.clear);
    gl.uniform1f(this.uniforms.clear.value, 0);
    this.blit(this.pressure.write);
    this.pressure.swap();

    for (let i = 0; i < config.PRESSURE_ITERATIONS; i++) {
      gl.useProgram(this.programs.pressure);
      gl.uniform2f(this.uniforms.pressure.texelSize, this.pressure.read.texelSizeX, this.pressure.read.texelSizeY);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.pressure.read.texture);
      gl.uniform1i(this.uniforms.pressure.uPressure, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.divergence.texture);
      gl.uniform1i(this.uniforms.pressure.uDivergence, 1);
      this.blit(this.pressure.write);
      this.pressure.swap();
    }

    // 步骤4: 梯度减法
    gl.useProgram(this.programs.gradientSubtract);
    gl.uniform2f(this.uniforms.gradientSubtract.texelSize, this.pressure.read.texelSizeX, this.pressure.read.texelSizeY);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.pressure.read.texture);
    gl.uniform1i(this.uniforms.gradientSubtract.uPressure, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.velocity.read.texture);
    gl.uniform1i(this.uniforms.gradientSubtract.uVelocity, 1);
    this.blit(this.velocity.write);
    this.velocity.swap();

    // 步骤5: 平流速度
    gl.useProgram(this.programs.advection);
    gl.uniform2f(this.uniforms.advection.texelSize, this.velocity.read.texelSizeX, this.velocity.read.texelSizeY);
    gl.uniform2f(this.uniforms.advection.dyeTexelSize, this.velocity.read.texelSizeX, this.velocity.read.texelSizeY);
    gl.uniform1f(this.uniforms.advection.dt, dt);
    gl.uniform1f(this.uniforms.advection.dissipation, config.VELOCITY_DISSIPATION);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.velocity.read.texture);
    gl.uniform1i(this.uniforms.advection.uVelocity, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.velocity.read.texture);
    gl.uniform1i(this.uniforms.advection.uSource, 1);
    this.blit(this.velocity.write);
    this.velocity.swap();

    // 步骤6: 平流染料
    gl.useProgram(this.programs.advection);
    gl.uniform2f(this.uniforms.advection.texelSize, this.velocity.read.texelSizeX, this.velocity.read.texelSizeY);
    gl.uniform2f(this.uniforms.advection.dyeTexelSize, this.dye.read.texelSizeX, this.dye.read.texelSizeY);
    gl.uniform1f(this.uniforms.advection.dt, dt);
    gl.uniform1f(this.uniforms.advection.dissipation, config.DENSITY_DISSIPATION);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.velocity.read.texture);
    gl.uniform1i(this.uniforms.advection.uVelocity, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.dye.read.texture);
    gl.uniform1i(this.uniforms.advection.uSource, 1);
    this.blit(this.dye.write);
    this.dye.swap();

    // 步骤7: 渲染到屏幕
    const displayProgram = config.SHADING ? this.programs.displayWithShading : this.programs.displayWithoutShading;
    gl.useProgram(displayProgram);
    const displayUniforms = config.SHADING ? this.uniforms.displayWithShading : this.uniforms.displayWithoutShading;
    gl.uniform2f(displayUniforms.texelSize, this.dye.read.texelSizeX, this.dye.read.texelSizeY);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.dye.read.texture);
    gl.uniform1i(displayUniforms.uTexture, 0);
    this.blit(null);
  }

  // 更新指针状态
  updatePointers() {
    const gl = this.gl;
    const canvas = this.canvas;
    const config = this.config;

    if (!canvas || !this.pointers[0].moved) return;

    const pointer = this.pointers[0];
    const rect = canvas.getBoundingClientRect();
    const x = (pointer.texcoordX * rect.width + rect.left) / rect.width;
    const y = (pointer.texcoordY * rect.height + rect.top) / rect.height;
    const prevX = (pointer.prevTexcoordX * rect.width + rect.left) / rect.width;
    const prevY = (pointer.prevTexcoordY * rect.height + rect.top) / rect.height;

    // 随机颜色
    const hue = (Date.now() / config.colorUpdateSpeed) % 360;
    const rgb = this.hslToRgb(hue / 360, 0.8, 0.5);

    // 应用速度
    gl.useProgram(this.programs.splat);
    gl.uniform1f(this.uniforms.splat.aspectRatio, canvas.width / canvas.height);
    gl.uniform3f(this.uniforms.splat.color, rgb.r, rgb.g, rgb.b);
    gl.uniform2f(this.uniforms.splat.point, x, 1 - y);
    gl.uniform1f(this.uniforms.splat.radius, config.SPLAT_RADIUS);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.dye.read.texture);
    gl.uniform1i(this.uniforms.splat.uTarget, 0);
    this.blit(this.dye.write);
    this.dye.swap();

    // 应用速度到速度场
    const dx = (x - prevX) * config.SPLAT_FORCE;
    const dy = -(y - prevY) * config.SPLAT_FORCE;

    gl.useProgram(this.programs.splat);
    gl.uniform1f(this.uniforms.splat.aspectRatio, canvas.width / canvas.height);
    gl.uniform3f(this.uniforms.splat.color, dx, dy, 0);
    gl.uniform2f(this.uniforms.splat.point, x, 1 - y);
    gl.uniform1f(this.uniforms.splat.radius, config.SPLAT_RADIUS);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.velocity.read.texture);
    gl.uniform1i(this.uniforms.splat.uTarget, 0);
    this.blit(this.velocity.write);
    this.velocity.swap();

    pointer.moved = false;
  }

  // HSL转RGB
  hslToRgb(h, s, l) {
    let r, g, b;

    if (s === 0) {
      r = g = b = l; // 灰度
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    return { r, g, b };
  }

  // 调整画布大小
  resizeCanvas() {
    const canvas = this.canvas;
    const gl = this.gl;
    if (!canvas || !gl) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  // 初始化
  init(canvasId) {
    // 获取画布
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      console.error('Canvas not found with id:', canvasId);
      return;
    }

    // 初始化WebGL上下文
    const { gl, ext } = this.getWebGLContext(this.canvas);
    this.gl = gl;
    this.ext = ext;

    // 检查线性过滤支持
    if (!ext.supportLinearFiltering) {
      this.config.DYE_RESOLUTION = 256;
      this.config.SHADING = false;
    }

    // 初始化全屏三角形
    this.initFullscreenTriangle();

    // 初始化帧缓冲区
    this.initFramebuffers();

    // 初始化着色器程序
    this.initPrograms();

    // 调整画布大小
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    // 添加鼠标事件监听
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const pointer = this.pointers[0];
      pointer.prevTexcoordX = pointer.texcoordX;
      pointer.prevTexcoordY = pointer.texcoordY;
      pointer.texcoordX = (e.clientX - rect.left) / rect.width;
      pointer.texcoordY = (e.clientY - rect.top) / rect.height;
      pointer.deltaX = pointer.texcoordX - pointer.prevTexcoordX;
      pointer.deltaY = pointer.texcoordY - pointer.prevTexcoordY;
      pointer.moved = true;
    });

    // 开始动画循环
    this.lastTime = performance.now();
    const animate = (time) => {
      const dt = (time - this.lastTime) / 1000;
      this.lastTime = time;

      this.renderFrame(dt);
      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }
}

// 添加更新配置的方法
FluidCursor.prototype.updateConfig = function(newConfig) {
  if (!newConfig) return;
  Object.assign(this.config, newConfig);
};

// 立即执行函数检查DOM状态并初始化
(function() {
  function initFluidCursor() {
    const fluidCursor = new FluidCursor();
    fluidCursor.init('fluid');
    // 暴露到全局，方便外部（如Python GUI工具）访问
    window.fluidCursor = fluidCursor;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFluidCursor);
  } else {
    initFluidCursor();
  }
})();