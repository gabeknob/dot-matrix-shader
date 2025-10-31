#version 300 es

in vec2 a_position;
uniform vec2 u_resolution;
uniform float u_pointSize;

void main() {
  vec2 zeroToOne = a_position / u_resolution; // convert position to 0.0 to 1.0 range
  vec2 zeroToTwo = zeroToOne * 2.0; // convert to 0.0 to 2.0 range
  vec2 clipSpace = zeroToTwo - 1.0; // convert to -1.0 to 1.0 range

  gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1); // final position
  gl_PointSize = u_pointSize; // particle size
}