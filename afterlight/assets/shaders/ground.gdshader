// AFTERLIGHT — wet asphalt / stone. Procedural puddles get low roughness so
// they reflect the night sky, and pick up a faint neon tint.
shader_type spatial;

uniform vec3 color_a : source_color = vec3(0.06, 0.06, 0.1);
uniform vec3 color_b : source_color = vec3(0.1, 0.09, 0.16);
uniform vec3 puddle_tint : source_color = vec3(0.25, 0.1, 0.45);
uniform float tile = 4.0;
uniform float puddles = 0.45;
uniform float seam = 1.0;

varying vec3 wpos;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
	vec2 i = floor(p); vec2 f = fract(p);
	vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}

void vertex() {
	wpos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
}

void fragment() {
	vec2 p = wpos.xz;
	float n = noise(p * 0.35) * 0.6 + noise(p * 1.7) * 0.3 + noise(p * 6.0) * 0.1;
	vec3 col = mix(color_a, color_b, n);
	vec2 g = abs(fract(p / tile) - 0.5);
	float line = step(0.485, max(g.x, g.y)) * seam;
	col *= 1.0 - line * 0.45;
	float pd = smoothstep(1.0 - puddles, 1.0 - puddles + 0.08, noise(p * 0.18 + 3.1));
	ALBEDO = mix(col, col * 0.5 + puddle_tint * 0.08, pd);
	ROUGHNESS = mix(0.82, 0.05, pd);
	METALLIC = mix(0.0, 0.3, pd);
	SPECULAR = 0.5;
}
