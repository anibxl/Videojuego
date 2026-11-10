shader_type spatial;
render_mode cull_disabled, diffuse_burley;
// Instanced grass clumps (crossed cards) with wind and colour variation.
global uniform float wind_strength;
uniform sampler2D card : source_color, filter_linear_mipmap, repeat_disable;
uniform vec3 base_color : source_color = vec3(0.24, 0.40, 0.13);
uniform vec3 tip_color : source_color = vec3(0.50, 0.62, 0.25);
uniform vec3 dry_color : source_color = vec3(0.62, 0.55, 0.30);
varying vec3 wpos;
varying float tip;

void vertex() {
	tip = 1.0 - UV.y;
	wpos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	float t = TIME * 1.8 + wpos.x * 0.6 + wpos.z * 0.45;
	float w = (sin(t) * 0.7 + sin(t * 2.7) * 0.3) * 0.07 * wind_strength * tip * tip;
	VERTEX += (inverse(MODEL_MATRIX) * vec4(w, 0.0, w * 0.6, 0.0)).xyz;
}

void fragment() {
	vec4 c = texture(card, UV);
	if (c.a < 0.5) { discard; }
	float n = fract(sin(dot(floor(wpos.xz * 0.8), vec2(12.9, 78.2))) * 43758.5);
	vec3 col = mix(base_color, tip_color, tip) * (0.8 + 0.4 * c.g);
	col = mix(col, dry_color, step(0.85, n) * 0.5 * tip);
	ALBEDO = col;
	ROUGHNESS = 0.9;
	SPECULAR = 0.2;
	BACKLIGHT = col * 0.4;
}
