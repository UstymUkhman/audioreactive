precision highp float;

attribute vec3 startPosition;
attribute vec3 endPosition;
attribute float index;

uniform float frequencies[1024];
uniform float time;

uniform mat4 proj;
uniform mat4 view;

varying vec4 vColor;

void main(void) {
  int i = int(index);
  float frequency = frequencies[i];

  vec3 startPos = startPosition;
  vec3 endPos = endPosition;

  float progress = time / 100.0;

  if (progress > 0.21) {
    startPos *= 2.0;
    endPos = startPos * 2.0;
  }

  vec3 dist = (endPos - startPos) * frequency;
  vec3 pos = startPos + dist;
  const float dark = 0.3;

  vec3 color = vec3(
    dark - startPos.x,
    dark - startPos.y,
    dark - startPos.z
  );

  gl_Position = proj * view * vec4(pos, 1.0);
  gl_PointSize = 25.0 * frequency + 8.0;
  vColor = vec4(color, 1.0);
}
