shader_type spatial;
render_mode diffuse_burley;
// Stylised ground: grass, soil, sand or concrete with world-space variation.
uniform vec3 color_a : source_color = vec3(0.36, 0.62, 0.22);
uniform vec3 color_b : source_color = vec3(0.26, 0.50, 0.16);
uniform vec3 color_c : source_color = vec3(0.48, 0.70, 0.28);
uniform float scale = 0.35;
uniform float roughness_v = 0.9;
uniform float health = 1.0; // 0 = dry/brown, 1 = lush (used for restoration)
uniform vec3 dry : source_color = vec3(0.55, 0.48, 0.28);

float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p) { vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
	return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
varying vec3 wpos;
void vertex() { wpos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz; }
void fragment() {
	vec2 p = wpos.xz * scale;
	float n1 = vn(p) * 0.6 + vn(p * 2.7) * 0.3 + vn(p * 7.0) * 0.1;
	float n2 = vn(p * 23.0 + 5.0);
	vec3 col = mix(color_b, color_a, n1);
	col = mix(col, color_c, smoothstep(0.65, 0.9, n2) * 0.5);
	col = mix(dry * (0.85 + 0.3 * n1), col, health);
	ALBEDO = col;
	ROUGHNESS = roughness_v;
}
