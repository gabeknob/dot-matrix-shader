import { createShader, createProgram, createInitialData, createVAO, createTransformFeedback, createBuffer, createDrawVAO } from './helpers.js';

const canvas = document.getElementById('particle-canvas');
const gl = canvas.getContext('webgl2');

if (!gl) console.error("WebGL not supported! Falling back to 2D.")

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
gl.viewport(0, 0, canvas.width, canvas.height);

let mouse = { x: -200, y: -200 };
let particleCount = 0;

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
const repelRadius = 150;

async function setupWebGL() {
  const [drawVertSource, drawFragSource, physicsVertSource, physicsFragSource] = await Promise.all([
    fetch('./dot_matrix/shaders/draw.vert').then(res => res.text()),
    fetch('./dot_matrix/shaders/draw.frag').then(res => res.text()),
    fetch('./dot_matrix/shaders/physics.vert').then(res => res.text()),
    fetch('./dot_matrix/shaders/physics.frag').then(res => res.text())
  ]);

  const physicsVertShader = createShader(gl, gl.VERTEX_SHADER, physicsVertSource);
  const physicsFragShader = createShader(gl, gl.FRAGMENT_SHADER, physicsFragSource);
  const physicsProgram = createProgram(gl, ['v_newPosition', 'v_newVelocity'], physicsVertShader, physicsFragShader);

  const drawVertShader = createShader(gl, gl.VERTEX_SHADER, drawVertSource);
  const drawFragShader = createShader(gl, gl.FRAGMENT_SHADER, drawFragSource);
  const drawProgram = createProgram(gl, null, drawVertShader, drawFragShader);

  const physicsLocations = {
    position: gl.getAttribLocation(physicsProgram, 'a_position'),
    velocity: gl.getAttribLocation(physicsProgram, 'a_velocity'),
    basePosition: gl.getAttribLocation(physicsProgram, 'a_basePosition'),
    time: gl.getUniformLocation(physicsProgram, 'u_time'),
    mouse: gl.getUniformLocation(physicsProgram, 'u_mouse'),
    repelRadius: gl.getUniformLocation(physicsProgram, 'u_repelRadius'),

    waveAmplitude: gl.getUniformLocation(physicsProgram, 'u_waveAmplitude'),
    waveFrequency: gl.getUniformLocation(physicsProgram, 'u_waveFrequency'),
    springFactor: gl.getUniformLocation(physicsProgram, 'u_springFactor'),
    damping: gl.getUniformLocation(physicsProgram, 'u_damping'),
    repelStrength: gl.getUniformLocation(physicsProgram, 'u_repelStrength'),
  };

  const drawLocations = {
    position: gl.getAttribLocation(drawProgram, "a_position"),
    resolution: gl.getUniformLocation(drawProgram, "u_resolution"),
    pointSize: gl.getUniformLocation(drawProgram, "u_pointSize"),
    color: gl.getUniformLocation(drawProgram, "u_color"),
  }

  const { initialPositions, initialVelocities, basePositions } = createInitialData(gl, particleSpacing);
  particleCount = initialPositions.length / 2;

  // ping-pong buffers
  const posBuffer1 = createBuffer(gl, initialPositions);
  const velBuffer1 = createBuffer(gl, initialVelocities);
  
  const posBuffer2 = createBuffer(gl, initialPositions);
  const velBuffer2 = createBuffer(gl, initialVelocities);
  
  const basePosBuffer = createBuffer(gl, basePositions); // never changes

  // VAOs for each ping-pong buffer
  const vao1 = createVAO(gl, physicsLocations, basePosBuffer, posBuffer1, velBuffer1);
  const vao2 = createVAO(gl, physicsLocations, basePosBuffer, posBuffer2, velBuffer2);

  const drawVao1 = createDrawVAO(gl, drawLocations.position, posBuffer1);
  const drawVao2 = createDrawVAO(gl, drawLocations.position, posBuffer2);

  // Transform Feedbacks for each ping-pong buffer
  const tf1 = createTransformFeedback(gl, posBuffer1, velBuffer1);
  const tf2 = createTransformFeedback(gl, posBuffer2, velBuffer2);

  // ping-pong state
  const state = [
    { vao: vao1, drawVao: drawVao1, tf: tf2 },
    { vao: vao2, drawVao: drawVao2, tf: tf1 }
  ];
  let frame = 0;

  function animate(time) {
    // alternate between the two states
    const readState = state[frame % 2];
    const writeState = state[(frame + 1) % 2];

    gl.useProgram(physicsProgram);

    gl.uniform1f(physicsLocations.time, time * 0.001);
    gl.uniform2f(physicsLocations.mouse, mouse.x, mouse.y);
    gl.uniform1f(physicsLocations.repelRadius, repelRadius);
    gl.uniform1f(physicsLocations.waveAmplitude, waveAmplitude);
    gl.uniform1f(physicsLocations.waveFrequency, waveFrequency);
    gl.uniform1f(physicsLocations.springFactor, springFactor);
    gl.uniform1f(physicsLocations.damping, damping);
    gl.uniform1f(physicsLocations.repelStrength, repelStrength);
    
    gl.bindVertexArray(readState.vao);
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, readState.tf);

    gl.enable(gl.RASTERIZER_DISCARD); // disable fragment shader

    // run the physics calculations, but without drawing anything
    gl.beginTransformFeedback(gl.POINTS);
    gl.drawArrays(gl.POINTS, 0, particleCount);
    gl.endTransformFeedback();

    // clean up
    gl.disable(gl.RASTERIZER_DISCARD);
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
    gl.bindVertexArray(null);

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(drawProgram);

    gl.uniform2f(drawLocations.resolution, gl.canvas.width, gl.canvas.height);
    gl.uniform1f(drawLocations.pointSize, particleSize);
    gl.uniform4f(drawLocations.color, particleColor.r, particleColor.g, particleColor.b, particleColor.a);

    gl.bindVertexArray(writeState.drawVao);
    gl.drawArrays(gl.POINTS, 0, particleCount);
    gl.bindVertexArray(null);

    frame++;
    requestAnimationFrame(animate);
  }

  window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    const { initialPositions, initialVelocities, basePositions } = createInitialData(gl, particleSpacing);
    particleCount = initialPositions.length / 2;

    gl.bindBuffer(gl.ARRAY_BUFFER, basePosBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, basePositions, gl.DYNAMIC_COPY);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer1);
    gl.bufferData(gl.ARRAY_BUFFER, initialPositions, gl.DYNAMIC_COPY);
    gl.bindBuffer(gl.ARRAY_BUFFER, velBuffer1);
    gl.bufferData(gl.ARRAY_BUFFER, initialVelocities, gl.DYNAMIC_COPY);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer2);
    gl.bufferData(gl.ARRAY_BUFFER, initialPositions, gl.DYNAMIC_COPY);
    gl.bindBuffer(gl.ARRAY_BUFFER, velBuffer2);
    gl.bufferData(gl.ARRAY_BUFFER, initialVelocities, gl.DYNAMIC_COPY);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    requestAnimationFrame(animate);
  });

  window.addEventListener('mouseout', () => {
    mouse.x = -200;
    mouse.y = -200;
  });

  requestAnimationFrame(animate); // start the animation
}

setupWebGL();