shader_type spatial;
render_mode cull_disabled, blend_mix, depth_draw_opaque, specular_schlick_ggx;
#include "res://shaders/dirt_common.gdshaderinc"
uniform float clean_alpha = 0.25;

void fragment() {
	if (circle_clip > 0.5 && length(UV - vec2(0.5)) > 0.5) { discard; }
	vec3 a; float r; float m; float d; vec3 e;
	apply_dirt(UV, a, r, m, d, e);
	float fres = pow(1.0 - clamp(dot(NORMAL, VIEW), 0.0, 1.0), 3.0);
	ALBEDO = a;
	ROUGHNESS = mix(0.05, r, d);
	METALLIC = 0.0;
	SPECULAR = 0.8;
	ALPHA = clamp(mix(clean_alpha + fres * 0.4, 0.92, d), 0.0, 1.0);
	EMISSION = e;
}
