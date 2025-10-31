#version 300 es

in vec2 a_position;
in vec2 a_velocity;
in vec2 a_basePosition;

uniform float u_time;
uniform vec2 u_mouse;
uniform float u_repelRadius;
uniform float u_waveAmplitude;
uniform float u_waveFrequency;
uniform float u_springFactor;
uniform float u_damping;
uniform float u_repelStrength;

out vec2 v_newPosition;
out vec2 v_newVelocity;

void main() {
  vec2 home = vec2(
      a_basePosition.x + sin(u_time * u_waveFrequency * 60.0 + a_basePosition.y * 0.35) * u_waveAmplitude,
      a_basePosition.y + sin(u_time * u_waveFrequency * 60.0 + a_basePosition.x * 0.35) * u_waveAmplitude
  );
  
  vec2 springForce = (home - a_position) * u_springFactor;
  
  vec2 repelForce = vec2(0.0);
  float d = distance(a_position, u_mouse);
  
  if (d < u_repelRadius) {
      float force = (u_repelRadius - d) / u_repelRadius;
      repelForce = normalize(a_position - u_mouse) * force * u_repelStrength;
  }
  
  vec2 totalForce = springForce + repelForce;
  vec2 newVelocity = a_velocity + totalForce;
  newVelocity *= u_damping;
  
  vec2 newPosition = a_position + newVelocity;

  v_newPosition = newPosition;
  v_newVelocity = newVelocity;

  gl_Position = vec4(0.0, 0.0, 0.0, 1.0);
}
