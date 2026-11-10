shader_type spatial;
render_mode diffuse_burley;
// Realistic ground: tiled grass/soil textures, large-scale colour variation,
// soil patches and a restoration "health" blend (dry -> lush).
uniform sampler2D grass_tex : source_color, filter_linear_mipmap, repeat_enable;
uniform sampler2D soil_tex : source_color, filter_linear_mipmap, repeat_enable;
uniform vec3 color_a : source_color = vec3(0.36, 0.62, 0.22);
uniform vec3 color_b : source_color = vec3(0.26, 0.50, 0.16);
uniform vec3 color_c : source_color = vec3(0.48, 0.70, 0.28);
uniform float scale = 0.35;
uniform float tex_scale = 0.33;
uniform float soil_amount = 0.12;
uniform float use_textures = 1.0;
uniform float roughness_v = 0.9;
uniform float health = 1.0;
uniform vec3 dry : source_color = vec3(0.42, 0.42, 0.24);

float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p) { vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
	return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
varying vec3 wpos;
void vertex() { wpos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz; }
void fragment() {
	vec2 p = wpos.xz * scale;
	float n1 = vn(p) * 0.6 + vn(p * 2.7) * 0.3 + vn(p * 7.0) * 0.1;
	vec3 tint = mix(color_b, color_a, n1);
	tint = mix(tint, color_c, smoothstep(0.65, 0.9, vn(p * 3.3 + 5.0)) * 0.5);
	vec3 col = tint;
	if (use_textures > 0.5) {
		vec3 g1 = texture(grass_tex, wpos.xz * tex_scale).rgb;
		vec3 g2 = texture(grass_tex, wpos.xz * tex_scale * 0.31 + 0.37).rgb;
		vec3 g = mix(g1, g2, 0.35);
		col = g * (tint / vec3(0.3, 0.48, 0.17)) * 0.95;
		float soil_mask = smoothstep(1.0 - soil_amount, 1.0 - soil_amount + 0.12, vn(p * 1.4 + 11.0) * 0.7 + vn(p * 6.0) * 0.3);
		vec3 s = texture(soil_tex, wpos.xz * 0.5).rgb;
		col = mix(col, s, soil_mask);
	}
	col = mix(dry * (0.85 + 0.3 * n1), col, health);
	ALBEDO = col;
	ROUGHNESS = roughness_v;
	SPECULAR = 0.25;
}
