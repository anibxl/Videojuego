// AFTERLIGHT — clean interior floor tiles in world space (mall, lab, home).
shader_type spatial;

uniform vec3 color_a : source_color = vec3(0.8, 0.82, 0.88);
uniform vec3 color_b : source_color = vec3(0.7, 0.72, 0.8);
uniform vec3 line_color : source_color = vec3(0.3, 0.32, 0.4);
uniform float tile = 2.0;
uniform float roughness = 0.35;
uniform float checker = 1.0;
uniform float dirt = 0.25;

varying vec3 wpos;
varying vec3 wnrm;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

void vertex() {
	wpos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	wnrm = normalize((MODEL_MATRIX * vec4(NORMAL, 0.0)).xyz);
}

void fragment() {
	vec2 p = abs(wnrm.y) > 0.5 ? wpos.xz : (abs(wnrm.x) > 0.5 ? wpos.zy : wpos.xy);
	vec2 id = floor(p / tile);
	vec2 f = fract(p / tile);
	float ch = mod(id.x + id.y, 2.0) * checker;
	vec3 col = mix(color_a, color_b, ch);
	col *= 0.92 + 0.16 * hash(id);
	float l = step(0.97, max(f.x, f.y)) + step(max(f.x, f.y), 0.03) * 0.0;
	col = mix(col, line_color, l);
	col *= 1.0 - dirt * hash(floor(p * 3.0)) * 0.5;
	ALBEDO = col;
	ROUGHNESS = roughness + l * 0.4;
}
