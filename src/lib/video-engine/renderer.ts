/**
 * OMNI TOOL — Client-Side Video Processing Engine
 * OffscreenCanvas & WebGL 2.0 Shader Pipeline (Phase 3)
 *
 * Implements GPU-accelerated video frame rendering:
 * - OffscreenCanvas in dedicated worker context
 * - WebGL 2.0 full-screen quad rendering pipeline
 * - Real-time GLSL fragment shader (brightness, contrast, saturation, grayscale, sepia, invert, hue)
 * - Zero-copy processed VideoFrame capture for downstream WebCodecs encoder
 */

import { VideoEffectConfig } from "./types";

const VERTEX_SHADER_SOURCE = `#version 300 es
in vec2 a_position;
in vec2 a_texCoord;
out vec2 v_texCoord;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_texCoord = a_texCoord;
}
`;

const FRAGMENT_SHADER_SOURCE = `#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_image;
uniform float u_brightness; // [-1.0, 1.0]
uniform float u_contrast;   // [0.0, 3.0]
uniform float u_saturation; // [0.0, 3.0]
uniform float u_grayscale;  // [0.0, 1.0]
uniform float u_sepia;      // [0.0, 1.0]
uniform float u_invert;     // [0.0, 1.0]
uniform float u_hueRotate;  // radians [0.0, 2*PI]

// Color rotation matrix for hue transformation in YIQ space
vec3 applyHueRotate(vec3 col, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  mat3 rot = mat3(
    0.213 + c * 0.787 - s * 0.213, 0.715 - c * 0.715 - s * 0.715, 0.072 - c * 0.072 + s * 0.928,
    0.213 - c * 0.213 + s * 0.143, 0.715 + c * 0.285 + s * 0.140, 0.072 - c * 0.072 - s * 0.283,
    0.213 - c * 0.213 - s * 0.787, 0.715 - c * 0.715 + s * 0.715, 0.072 + c * 0.928 + s * 0.072
  );
  return rot * col;
}

void main() {
  vec4 color = texture(u_image, v_texCoord);

  // 1. Brightness
  color.rgb += u_brightness;

  // 2. Contrast
  color.rgb = (color.rgb - 0.5) * u_contrast + 0.5;

  // 3. Hue Rotation
  if (abs(u_hueRotate) > 0.001) {
    color.rgb = applyHueRotate(color.rgb, u_hueRotate);
  }

  // 4. Saturation (Rec.709 Luma weights)
  float luma = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
  color.rgb = mix(vec3(luma), color.rgb, u_saturation);

  // 5. Grayscale
  color.rgb = mix(color.rgb, vec3(luma), u_grayscale);

  // 6. Sepia Matrix
  vec3 sepiaColor = vec3(
    dot(color.rgb, vec3(0.393, 0.769, 0.189)),
    dot(color.rgb, vec3(0.349, 0.686, 0.168)),
    dot(color.rgb, vec3(0.272, 0.534, 0.131))
  );
  color.rgb = mix(color.rgb, sepiaColor, u_sepia);

  // 7. Inversion
  color.rgb = mix(color.rgb, 1.0 - color.rgb, u_invert);

  fragColor = vec4(clamp(color.rgb, 0.0, 1.0), color.a);
}
`;

export class WebGLVideoRenderer {
  private canvas: OffscreenCanvas;
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram | null = null;
  private vao: WebGLVertexArrayObject | null = null;
  private positionBuffer: WebGLBuffer | null = null;
  private texCoordBuffer: WebGLBuffer | null = null;
  private videoTexture: WebGLTexture | null = null;

  // Uniform locations cache
  private uImageLoc: WebGLUniformLocation | null = null;
  private uBrightnessLoc: WebGLUniformLocation | null = null;
  private uContrastLoc: WebGLUniformLocation | null = null;
  private uSaturationLoc: WebGLUniformLocation | null = null;
  private uGrayscaleLoc: WebGLUniformLocation | null = null;
  private uSepiaLoc: WebGLUniformLocation | null = null;
  private uInvertLoc: WebGLUniformLocation | null = null;
  private uHueRotateLoc: WebGLUniformLocation | null = null;

  private currentEffect: VideoEffectConfig = {
    brightness: 0.0,
    contrast: 1.0,
    saturation: 1.0,
    grayscale: 0.0,
    sepia: 0.0,
    invert: 0.0,
    hueRotate: 0.0,
    blur: 0.0,
  };

  constructor(initialWidth = 1920, initialHeight = 1080) {
    if (typeof OffscreenCanvas === "undefined") {
      throw new Error("OffscreenCanvas is not supported in this environment");
    }

    this.canvas = new OffscreenCanvas(initialWidth, initialHeight);
    const gl = this.canvas.getContext("webgl2", {
      alpha: false,
      depth: false,
      stencil: false,
      antialias: false,
      preserveDrawingBuffer: true,
      powerPreference: "high-performance",
    });

    if (!gl) {
      throw new Error("WebGL 2.0 context could not be created on OffscreenCanvas");
    }

    this.gl = gl;
    this.initGL();
  }

  private initGL(): void {
    const gl = this.gl;

    // Compile Shaders
    const vertShader = this.compileShader(gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
    const fragShader = this.compileShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SOURCE);

    // Link Program
    const program = gl.createProgram();
    if (!program) throw new Error("Failed to create WebGL program");

    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(`WebGL program linking failed: ${info}`);
    }

    this.program = program;
    gl.useProgram(program);

    // Cache Uniform Locations
    this.uImageLoc = gl.getUniformLocation(program, "u_image");
    this.uBrightnessLoc = gl.getUniformLocation(program, "u_brightness");
    this.uContrastLoc = gl.getUniformLocation(program, "u_contrast");
    this.uSaturationLoc = gl.getUniformLocation(program, "u_saturation");
    this.uGrayscaleLoc = gl.getUniformLocation(program, "u_grayscale");
    this.uSepiaLoc = gl.getUniformLocation(program, "u_sepia");
    this.uInvertLoc = gl.getUniformLocation(program, "u_invert");
    this.uHueRotateLoc = gl.getUniformLocation(program, "u_hueRotate");

    // Setup Geometry: Fullscreen Quad
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);

    // Quad Vertices (NDC 2 Triangles)
    const positions = new Float32Array([
      -1.0, -1.0,
       1.0, -1.0,
      -1.0,  1.0,
      -1.0,  1.0,
       1.0, -1.0,
       1.0,  1.0,
    ]);

    this.positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const aPosLoc = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(aPosLoc);
    gl.vertexAttribPointer(aPosLoc, 2, gl.FLOAT, false, 0, 0);

    // Texture Coordinates (Y-inverted so top is 0.0 and bottom is 1.0)
    const texCoords = new Float32Array([
      0.0, 1.0,
      1.0, 1.0,
      0.0, 0.0,
      0.0, 0.0,
      1.0, 1.0,
      1.0, 0.0,
    ]);

    this.texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

    const aTexLoc = gl.getAttribLocation(program, "a_texCoord");
    gl.enableVertexAttribArray(aTexLoc);
    gl.vertexAttribPointer(aTexLoc, 2, gl.FLOAT, false, 0, 0);

    // Setup Video Texture
    this.videoTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.videoTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    // Bind texture unit 0
    gl.uniform1i(this.uImageLoc, 0);

    // Apply default effect values
    this.setEffects(this.currentEffect);
  }

  private compileShader(type: number, source: string): WebGLShader {
    const gl = this.gl;
    const shader = gl.createShader(type);
    if (!shader) throw new Error("Failed to allocate shader");

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Shader compilation error: ${info}`);
    }
    return shader;
  }

  /**
   * Update shader uniforms with current color grading parameters
   */
  public setEffects(effect: Partial<VideoEffectConfig>): void {
    this.currentEffect = { ...this.currentEffect, ...effect };
    const gl = this.gl;
    gl.useProgram(this.program);

    if (this.uBrightnessLoc) gl.uniform1f(this.uBrightnessLoc, this.currentEffect.brightness);
    if (this.uContrastLoc) gl.uniform1f(this.uContrastLoc, this.currentEffect.contrast);
    if (this.uSaturationLoc) gl.uniform1f(this.uSaturationLoc, this.currentEffect.saturation);
    if (this.uGrayscaleLoc) gl.uniform1f(this.uGrayscaleLoc, this.currentEffect.grayscale);
    if (this.uSepiaLoc) gl.uniform1f(this.uSepiaLoc, this.currentEffect.sepia);
    if (this.uInvertLoc) gl.uniform1f(this.uInvertLoc, this.currentEffect.invert);
    if (this.uHueRotateLoc) {
      // Convert degrees to radians
      const radians = (this.currentEffect.hueRotate * Math.PI) / 180.0;
      gl.uniform1f(this.uHueRotateLoc, radians);
    }
  }

  /**
   * Paint source VideoFrame as a WebGL texture, execute fragment shader,
   * and capture the processed frame as a new hardware-accelerated VideoFrame
   */
  public renderFrame(sourceFrame: VideoFrame, effect?: Partial<VideoEffectConfig>): VideoFrame {
    const gl = this.gl;
    const width = sourceFrame.displayWidth;
    const height = sourceFrame.displayHeight;
    const timestamp = sourceFrame.timestamp;
    const duration = sourceFrame.duration ?? undefined;

    // Dynamically adjust canvas dimensions to match input frame
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }

    gl.viewport(0, 0, width, height);

    if (effect) {
      this.setEffects(effect);
    }

    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);

    // Upload VideoFrame directly into WebGL texture (Zero-Copy GPU upload)
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.videoTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceFrame);

    // Render Fullscreen Quad with Fragment Shaders
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // Close the input frame now that its GPU texture is consumed
    sourceFrame.close();

    // Capture the processed frame directly from the OffscreenCanvas
    const processedFrame = new VideoFrame(this.canvas, {
      timestamp,
      duration,
      alpha: "discard",
    });

    return processedFrame;
  }

  /**
   * Capture processed frame as an ImageBitmap (for fast UI thumbnail transfer)
   */
  public async captureImageBitmap(): Promise<ImageBitmap> {
    return createImageBitmap(this.canvas);
  }

  /**
   * Capture processed frame pixels into raw RGBA Uint8Array (fallback)
   */
  public capturePixels(): Uint8Array {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const pixels = new Uint8Array(width * height * 4);
    this.gl.readPixels(0, 0, width, height, this.gl.RGBA, this.gl.UNSIGNED_BYTE, pixels);
    return pixels;
  }

  public getCanvas(): OffscreenCanvas {
    return this.canvas;
  }

  public dispose(): void {
    const gl = this.gl;
    if (this.program) gl.deleteProgram(this.program);
    if (this.vao) gl.deleteVertexArray(this.vao);
    if (this.positionBuffer) gl.deleteBuffer(this.positionBuffer);
    if (this.texCoordBuffer) gl.deleteBuffer(this.texCoordBuffer);
    if (this.videoTexture) gl.deleteTexture(this.videoTexture);
    this.program = null;
    this.vao = null;
    this.videoTexture = null;
  }
}
