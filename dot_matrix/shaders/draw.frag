#version 300 es

precision mediump float; // precision of floating point numbers

uniform vec4 u_color;

out vec4 out_color;

void main() {
  out_color = u_color;
}