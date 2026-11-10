// AFTERLIGHT — hologram / energy material for collectibles and fragments.
shader_type spatial;
render_mode blend_add, unshaded, cull_disabled, depth_draw_never;

uniform vec4 color : source_color = vec4(0.4, 0.95, 1.0, 1.0);
uniform float energy = 1.6;
uniform float scan_speed = 1.5;

varying vec3 wpos;

void vertex() {
	wpos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
}

void fragment() {
	float fres = pow(1.0 - clamp(abs(dot(NORMAL, VIEW)), 0.0, 1.0), 2.0);
	float scan = 0.75 + 0.25 * sin(wpos.y * 40.0 - TIME * scan_speed * 6.0);
	ALBEDO = color.rgb * energy * (0.35 + fres * 1.4) * scan;
	ALPHA = color.a;
}
