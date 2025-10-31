export function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("Error compiling shader:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function createProgram(gl, varyings = null, ...shaders) {
  const program = gl.createProgram();
  shaders.forEach(shader => gl.attachShader(program, shader));

  // send to transform feedback buffer
  if (varyings) {
    gl.transformFeedbackVaryings(program, varyings, gl.SEPARATE_ATTRIBS);
  }

  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Error linking program:", gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }

  return program;
}

export function createBuffer(gl, data) {
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_COPY); // DYNAMIC_COPY is a hint for ping-pong
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  return buffer;
}

export function createInitialData(gl, particleSpacing) {
  const positions = [];
  const velocities = [];
  const bases = [];
  for (let y = 0; y < gl.canvas.height; y += particleSpacing) {
    for (let x = 0; x < gl.canvas.width; x += particleSpacing) {
      const px = Math.min(x + Math.random() * particleSpacing / 8, gl.canvas.width);
      const py = Math.min(y + Math.random() * particleSpacing / 8, gl.canvas.height);
      positions.push(px, py); // pushes two elements, thus the need to divide by 2 when defining the particle count
      velocities.push(0, 0);
      bases.push(px, py);
    }
  }

  return {
    initialPositions: new Float32Array(positions),
    initialVelocities: new Float32Array(velocities),
    basePositions: new Float32Array(bases)
  };
}

export function createVAO(gl, locations, basePosBuffer, posBuffer, velBuffer) {
  // register the buffer operations with the VAO
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  // static
  gl.bindBuffer(gl.ARRAY_BUFFER, basePosBuffer);
  gl.enableVertexAttribArray(locations.basePosition);
  gl.vertexAttribPointer(locations.basePosition, 2, gl.FLOAT, false, 0, 0);

  // dynamic position
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
  gl.enableVertexAttribArray(locations.position);
  gl.vertexAttribPointer(locations.position, 2, gl.FLOAT, false, 0, 0);
  
  // dynamic velocity
  gl.bindBuffer(gl.ARRAY_BUFFER, velBuffer);
  gl.enableVertexAttribArray(locations.velocity);
  gl.vertexAttribPointer(locations.velocity, 2, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, null); // necessary to avoid leaving the buffer bound to the ARRAY_BUFFER target
  gl.bindVertexArray(null);
  return vao;
}

export function createTransformFeedback(gl, posBuffer, velBuffer) {
  const tf = gl.createTransformFeedback();
  gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, tf);
  // bind feedback buffers to the *output* locations
  gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, posBuffer); // v_newPosition
  gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 1, velBuffer); // v_newVelocity

  gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null); // clean up
  return tf;
}

export function createDrawVAO(gl, drawPositionLocation, posBuffer) {
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.enableVertexAttribArray(drawPositionLocation);
    gl.vertexAttribPointer(drawPositionLocation, 2, gl.FLOAT, false, 0, 0);
    // Unbind to ensure draw buffer isn't left on ARRAY_BUFFER binding
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindVertexArray(null);
    return vao;
}