shader_type spatial;
render_mode blend_mix, depth_draw_opaque, cull_back, specular_schlick_ggx;
// clarity 0 = murky swamp, 1 = crystal-clear pool water.
uniform float clarity : hint_range(0.0, 1.0) = 0.0;
uniform vec3 murky : source_color = vec3(0.16, 0.19, 0.08);
uniform vec3 clear : source_color = vec3(0.15, 0.70, 0.85);

float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p) { vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
	return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }

varying vec3 wpos;
void vertex() {
	wpos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	VERTEX.y += sin(wpos.x * 1.7 + TIME * 1.3) * 0.02 + cos(wpos.z * 2.1 + TIME * 1.1) * 0.02;
}
void fragment() {
	vec2 p = wpos.xz;
	float w = vn(p * 1.5 + TIME * 0.25) * 0.5 + vn(p * 3.1 - TIME * 0.35) * 0.5;
	float caustic = pow(1.0 - abs(vn(p * 2.4 + vec2(TIME * 0.4, -TIME * 0.3)) * 2.0 - 1.0), 6.0);
	vec3 col = mix(murky * (0.8 + 0.3 * w), clear * (0.9 + 0.2 * w), clarity);
	col += vec3(0.6, 0.9, 1.0) * caustic * 0.25 * clarity;
	NORMAL_MAP = normalize(vec3(w - 0.5, (vn(p * 2.0 + 3.0 + TIME * 0.2) - 0.5), 1.0)) * 0.5 + 0.5;
	NORMAL_MAP_DEPTH = 0.6;
	float fres = pow(1.0 - clamp(dot(NORMAL, VIEW), 0.0, 1.0), 4.0);
	ALBEDO = col;
	ROUGHNESS = mix(0.7, 0.05, clarity);
	SPECULAR = mix(0.1, 0.6, clarity);
	ALPHA = clamp(mix(0.96, 0.5, clarity) + fres * 0.3, 0.0, 1.0);
}
