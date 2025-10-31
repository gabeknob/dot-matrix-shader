#version 300 es

precision mediump float; // precision of floating point numbers

uniform vec4 u_color;

out vec4 out_color;

void main() {
  float d = distance(gl_PointCoord, vec2(0.5));
  float smooth_alpha = 1.0 - smoothstep(0.48, 0.5, d);
  if (smooth_alpha == 0.0) {
    discard;
  }

  out_color = vec4(u_color.rgb, u_color.a * smooth_alpha);
}