shader_type spatial;
render_mode cull_disabled, diffuse_burley, specular_schlick_ggx;
#include "res://shaders/dirt_common.gdshaderinc"

void fragment() {
	if (circle_clip > 0.5 && length(UV - vec2(0.5)) > 0.5) { discard; }
	vec3 a; float r; float m; float d; vec3 e;
	apply_dirt(UV, a, r, m, d, e);
	ALBEDO = a;
	ROUGHNESS = r;
	METALLIC = m;
	SPECULAR = mix(0.5, 0.2, d);
	EMISSION = e;
}
