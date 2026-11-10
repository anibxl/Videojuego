// AFTERLIGHT — soft vertical light beam marking rare discoveries.
shader_type spatial;
render_mode blend_add, unshaded, cull_disabled, depth_draw_never, shadows_disabled;

uniform vec4 color : source_color = vec4(1.0, 0.7, 0.3, 1.0);
uniform float intensity = 0.6;

void fragment() {
	float fres = clamp(abs(dot(NORMAL, VIEW)), 0.0, 1.0);
	float fade = UV.y; // cylinder UV: 0 at top, 1 at bottom
	float pulse = 0.8 + 0.2 * sin(TIME * 2.5);
	ALBEDO = color.rgb * intensity * pow(fres, 2.0) * fade * fade * pulse;
}
