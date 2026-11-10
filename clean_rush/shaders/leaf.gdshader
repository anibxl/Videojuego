shader_type spatial;
render_mode cull_disabled, diffuse_burley;
// Realistic leaf from an 8-cell atlas. INSTANCE_CUSTOM.r selects the leaf type,
// INSTANCE_CUSTOM.g adds a per-leaf brightness variation. COLOR tints slightly.
uniform sampler2D atlas : source_color, filter_linear_mipmap, repeat_disable;
uniform float alpha_cut = 0.45;
varying float cell;
varying float bright;

void vertex() {
	cell = floor(INSTANCE_CUSTOM.r * 8.0 + 0.5);
	bright = 0.82 + INSTANCE_CUSTOM.g * 0.36;
}

void fragment() {
	vec2 c = vec2(mod(cell, 4.0), floor(cell / 4.0));
	vec2 uv = (c + clamp(UV, vec2(0.01), vec2(0.99))) / vec2(4.0, 2.0);
	vec4 t = texture(atlas, uv);
	if (t.a < alpha_cut) { discard; }
	ALBEDO = t.rgb * COLOR.rgb * bright;
	ROUGHNESS = 0.78;
	SPECULAR = 0.25;
	// Thin leaves let some light through.
	BACKLIGHT = vec3(0.35, 0.22, 0.08);
}
