import type { Project, Quality, Frame } from "../types";
import { arrowVertices, pathData, VIEWBOX } from "./geometry";
import { generateFrame } from "./surface";
import { drawBackground, prepareImage } from "./background";
import { rgbHex } from "./gradient";
export interface RenderOptions {
  includeBackground?: boolean;
  transparent?: boolean;
  solidColor?: string;
  quality?: Quality;
}
const VS = `#version 300 es
layout(location=0) in vec2 vertex;
layout(location=1) in vec4 placement;
layout(location=2) in vec4 color;
uniform vec2 resolution;
out vec4 tint;
void main(){float c=cos(placement.w),s=sin(placement.w);vec2 v=vertex*placement.z;vec2 p=placement.xy+vec2(v.x*c-v.y*s,v.x*s+v.y*c);vec2 clip=p/resolution*2.-1.;gl_Position=vec4(clip.x,-clip.y,0.,1.);tint=color;}`;
const FS = `#version 300 es
precision highp float;in vec4 tint;out vec4 outColor;void main(){outColor=tint;}`;
export class Renderer {
  readonly mode: "WebGL 2" | "Canvas 2D";
  private ctx: CanvasRenderingContext2D;
  private layer: HTMLCanvasElement;
  private gl: WebGL2RenderingContext | null;
  private program: WebGLProgram | null = null;
  private data: WebGLBuffer | null = null;
  private mesh: WebGLBuffer | null = null;
  private vao: WebGLVertexArrayObject | null = null;
  private path = new Path2D(pathData);
  constructor(readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) throw new Error("Canvas rendering is unavailable.");
    this.ctx = ctx;
    this.layer = document.createElement("canvas");
    this.gl = this.layer.getContext("webgl2", {
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
      premultipliedAlpha: false,
    });
    try {
      if (this.gl) this.initialize();
    } catch {
      this.gl = null;
    }
    this.mode = this.gl ? "WebGL 2" : "Canvas 2D";
  }
  async prepare(p: Project) {
    await prepareImage(p.background.dataUrl);
  }
  private initialize() {
    const gl = this.gl!;
    const shader = (type: number, code: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, code);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
        throw new Error(gl.getShaderInfoLog(s) || "Shader compilation failed");
      return s;
    };
    this.program = gl.createProgram()!;
    const vertex = shader(gl.VERTEX_SHADER, VS),
      fragment = shader(gl.FRAGMENT_SHADER, FS);
    gl.attachShader(this.program, vertex);
    gl.attachShader(this.program, fragment);
    gl.linkProgram(this.program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS))
      throw new Error("Renderer linking failed.");
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);
    this.mesh = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.mesh);
    gl.bufferData(gl.ARRAY_BUFFER, arrowVertices(), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8, 0);
    this.data = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.data);
    for (let i = 1; i <= 2; i++) {
      gl.enableVertexAttribArray(i);
      gl.vertexAttribPointer(i, 4, gl.FLOAT, false, 32, (i - 1) * 16);
      gl.vertexAttribDivisor(i, 1);
    }
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(
      gl.SRC_ALPHA,
      gl.ONE_MINUS_SRC_ALPHA,
      gl.ONE,
      gl.ONE_MINUS_SRC_ALPHA,
    );
  }
  render(
    p: Project,
    time: number,
    width: number,
    height: number,
    options: RenderOptions = {},
  ): Frame {
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    const frame = generateFrame(
      p,
      time,
      width,
      height,
      options.quality || "high",
    );
    const ctx = this.ctx;
    drawBackground(
      ctx,
      p,
      width,
      height,
      options.includeBackground ?? true,
      options.transparent ?? p.composition.transparent,
      options.solidColor,
    );
    ctx.save();
    ctx.beginPath();
    ctx.rect(
      (0.5 + p.composition.x - p.composition.coverage / 2) * width,
      (0.5 + p.composition.y - p.composition.coverage / 2) * height,
      p.composition.coverage * width,
      p.composition.coverage * height,
    );
    ctx.clip();
    if (this.gl) {
      const gl = this.gl;
      if (this.layer.width !== width || this.layer.height !== height) {
        this.layer.width = width;
        this.layer.height = height;
      }
      gl.viewport(0, 0, width, height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(this.program);
      gl.bindVertexArray(this.vao);
      gl.uniform2f(
        gl.getUniformLocation(this.program!, "resolution"),
        width,
        height,
      );
      const data = new Float32Array(frame.instances.length * 8);
      frame.instances.forEach((i, n) =>
        data.set([i.x, i.y, i.size, i.angle, ...i.color, i.alpha], n * 8),
      );
      gl.bindBuffer(gl.ARRAY_BUFFER, this.data);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 12, frame.instances.length);
      if (p.lighting.enabled && p.lighting.glow > 0.01) {
        ctx.save();
        ctx.globalAlpha = p.lighting.glow * 0.6;
        ctx.filter = `blur(${Math.max(1, (p.lighting.glow * 8 * width) / 1920)}px)`;
        ctx.drawImage(this.layer, 0, 0);
        ctx.restore();
      }
      ctx.drawImage(this.layer, 0, 0);
    } else {
      for (const i of frame.instances) {
        ctx.save();
        ctx.translate(i.x, i.y);
        ctx.rotate(i.angle);
        ctx.scale(i.size / VIEWBOX.width, i.size / VIEWBOX.width);
        ctx.translate(-VIEWBOX.width / 2, -VIEWBOX.height / 2);
        ctx.fillStyle = rgbHex(i.color);
        ctx.globalAlpha = i.alpha;
        ctx.fill(this.path);
        ctx.restore();
      }
    }
    ctx.restore();
    return frame;
  }
  dispose() {
    if (this.gl) {
      this.gl.deleteBuffer(this.mesh);
      this.gl.deleteBuffer(this.data);
      this.gl.deleteProgram(this.program);
      this.gl.deleteVertexArray(this.vao);
      this.gl.getExtension("WEBGL_lose_context")?.loseContext();
    }
  }
}
