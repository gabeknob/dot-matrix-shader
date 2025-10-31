import { createShader, createProgram } from './helpers.js';

const canvas = document.getElementById('particle-canvas');
const gl = canvas.getContext('webgl');

if (!gl) console.error("WebGL not supported! Falling back to 2D.")

let mouse = { x: -200, y: -200, repelRadius: 150 };
let frame = 0;

const particles = [];

const particleSize = 1.0;
const particleColorHex = 0x666666ff;
const particleColor = {
  r: ((particleColorHex >> 24) & 0xff) / 255,
  g: ((particleColorHex >> 16) & 0xff) / 255,
  b: ((particleColorHex >> 8) & 0xff) / 255,
  a: (particleColorHex & 0xff) / 255
};

const particleSpacing = 35;
const waveAmplitude = 7.5;
const waveFrequency = 0.01;
const springFactor = 0.1;
const damping = 0.5;
const repelStrength = 3;

async function setupWebGL() {
  const [vertexShaderSource, fragmentShaderSource] = await Promise.all([
    fetch('./shaders/vertex.glsl').then(res => res.text()),
    fetch('./shaders/fragment.glsl').then(res => res.text())
  ]);

  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  const shaderProgram = createProgram(gl, vertexShader, fragmentShader);

  const positionAttributeLocation = gl.getAttribLocation(shaderProgram, "a_position");
  const resolutionUniformLocation = gl.getUniformLocation(shaderProgram, "u_resolution");
  const pointSizeUniformLocation = gl.getUniformLocation(shaderProgram, "u_pointSize");
  const colorUniformLocation = gl.getUniformLocation(shaderProgram, "u_color");

  const positionBuffer = gl.createBuffer(); // create a buffer

  class Particle {
    constructor(x, y) {
      this.x = x;
      this.y = y;

      this.baseX = x;
      this.baseY = y;

      this.vx = 0;
      this.vy = 0;
    }
      
    update() {
      let homeY = this.baseY + Math.sin(frame * waveFrequency + this.baseX * 0.35) * waveAmplitude;
      let homeX = this.baseX + Math.sin(frame * waveFrequency + this.baseY * 0.35) * waveAmplitude;

      let springForceY = (homeY - this.y) * springFactor;
      let springForceX = (homeX - this.x) * springFactor;

      let dx = this.x - mouse.x;
      let dy = this.y - mouse.y;
      let distance = Math.sqrt(dx * dx + dy * dy);
      
      let repelForceX = 0; let repelForceY = 0;

      if (distance < mouse.repelRadius) {
          let force = (mouse.repelRadius - distance) / mouse.repelRadius;
          repelForceX = (dx / distance) * force * repelStrength;
          repelForceY = (dy / distance) * force * repelStrength;
      }
      
      let totalForceX = springForceX + repelForceX;
      let totalForceY = springForceY + repelForceY;
      
      this.vx += totalForceX; this.vy += totalForceY;
      this.vx *= damping; this.vy *= damping;
      this.x += this.vx; this.y += this.vy;
    }
  }

  function init() {
    particles.length = 0;
    for (let y = 0; y < canvas.height; y += particleSpacing) {
      for (let x = 0; x < canvas.width; x += particleSpacing) {
        particles.push(new Particle(Math.min(x + Math.random() * particleSpacing / 8, canvas.width), Math.min(y + Math.random() * particleSpacing / 8, canvas.height)));
      }
    }
  }

  function animate() {
    frame++;
    for (let i = 0; i < particles.length; i++) {
      particles[i].update();
    }
    
    const positions = new Float32Array(particles.length * 2); // * 2 because (x,y)
    for (let i = 0; i < particles.length; i++) {
      positions[i * 2] = particles[i].x;     // x
      positions[i * 2 + 1] = particles[i].y; // y
    }
    
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(shaderProgram); // use the shader program

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer); // bring positionBuffer to the GPU
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW); // buffer positions

    // signal to the shader that the position attribute is being used
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.vertexAttribPointer( // tell the shader how to read from the bound buffer
        positionAttributeLocation, // which attribute
        2,         // 2 components per vertex (x, y)
        gl.FLOAT,  // data type
        false,     // normalize?
        0,         // skip 0 bytes between vertices
        0          // offset from the beginning of the buffer
    );

    // broadcast resolution and particle size to the shader
    gl.uniform2f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height);
    gl.uniform1f(pointSizeUniformLocation, particleSize);
    gl.uniform4f(colorUniformLocation, particleColor.r, particleColor.g, particleColor.b, particleColor.a);

    gl.drawArrays( // draw all the particles at once
        gl.POINTS, // draw points
        0,         // start at index 0
        particles.length // draw this many points
    );
    
    requestAnimationFrame(animate);
  }

  window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
    init(); 
  });

  window.addEventListener('mouseout', () => {
    mouse.x = -200;
    mouse.y = -200;
  });

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  init();
  animate();
}

setupWebGL();