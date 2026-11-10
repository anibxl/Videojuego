shader_type spatial;
render_mode cull_disabled, diffuse_burley;
// Foliage cards (tree canopies, bushes, hedges) with alpha-tested leaf
// clusters, per-material tint and gentle wind sway.
global uniform float wind_strength;
uniform sampler2D card : source_color, filter_linear_mipmap;
uniform vec3 tint : source_color = vec3(0.35, 0.55, 0.22);
uniform vec3 tint2 : source_color = vec3(0.25, 0.42, 0.15);
uniform float alpha_cut = 0.5;
uniform float sway = 0.08;
varying vec3 wpos;
varying float h;
varying vec3 origin_v;

void vertex() {
	// Instanced cards: INSTANCE_CUSTOM.r = normalised height in the plant (0 base .. 1 top).
	vec3 origin = (MODEL_MATRIX * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
	wpos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	h = INSTANCE_CUSTOM.r;
	origin_v = origin;
	float t = TIME * 1.3 + floor(origin.x * 0.2) * 1.7 + floor(origin.z * 0.2) * 1.3;
	float w = sin(t) * 0.6 + sin(t * 2.3 + wpos.x) * 0.25 + sin(t * 5.1 + wpos.z * 2.0) * 0.15;
	vec3 off = vec3(w, 0.0, w * 0.5) * sway * wind_strength * h;
	VERTEX += (inverse(MODEL_MATRIX) * vec4(off, 0.0)).xyz;
}

void fragment() {
	vec4 c = texture(card, UV);
	if (c.a < alpha_cut) { discard; }
	float n = fract(sin(dot(floor(origin_v.xz * 3.0), vec2(12.9, 78.2))) * 43758.5);
	vec3 col = mix(tint2, tint, c.r) * (0.85 + 0.25 * n);
	col *= 0.75 + 0.35 * clamp(h, 0.0, 1.0);   // darker inside / lower
	ALBEDO = col;
	ROUGHNESS = 0.85;
	SPECULAR = 0.3;
	BACKLIGHT = col * 0.5;
}
