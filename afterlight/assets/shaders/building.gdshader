// AFTERLIGHT — procedural skyscraper facade.
// Windows are generated in world space (no textures, no extra geometry):
// a handful of lit windows, warm/cyan/magenta tints and rare flicker.
shader_type spatial;
render_mode diffuse_lambert, specular_schlick_ggx;

uniform vec3 base_color : source_color = vec3(0.07, 0.07, 0.13);
uniform vec3 trim_color : source_color = vec3(0.12, 0.11, 0.22);
uniform float lit_ratio = 0.22;
uniform float seed = 1.0;
uniform float window_energy = 2.2;
uniform vec2 cell = vec2(2.4, 3.2);
uniform float ground_floor = 4.5;

varying vec3 wpos;
varying vec3 wnrm;

float hash(vec2 p) {
	p = fract(p * vec2(123.34, 456.21) + seed * 0.731);
	p += dot(p, p + 45.32);
	return fract(p.x * p.y);
}

void vertex() {
	wpos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	wnrm = normalize((MODEL_MATRIX * vec4(NORMAL, 0.0)).xyz);
}

void fragment() {
	vec3 col = base_color;
	vec3 emi = vec3(0.0);
	float rough = 0.85;
	if (abs(wnrm.y) < 0.5) {
		float h = abs(wnrm.x) > 0.5 ? wpos.z : wpos.x;
		vec2 uv = vec2(h, wpos.y) / cell;
		vec2 id = floor(uv);
		vec2 f = fract(uv);
		float in_win = step(0.18, f.x) * step(f.x, 0.82) * step(0.28, f.y) * step(f.y, 0.78);
		// vertical trim columns every 4 cells
		float trim = step(0.94, fract(uv.x / 4.0));
		col = mix(col, trim_color, trim);
		if (wpos.y > ground_floor && in_win > 0.5 && trim < 0.5) {
			float r = hash(id + vec2(seed * 3.1, wnrm.x * 7.0 + wnrm.z * 13.0));
			float tint = hash(id * 1.7 + 4.2);
			vec3 wc = tint < 0.55 ? vec3(1.0, 0.72, 0.42) : (tint < 0.82 ? vec3(0.45, 0.85, 1.0) : vec3(1.0, 0.4, 0.8));
			if (r < lit_ratio) {
				float flick = 1.0;
				if (r < lit_ratio * 0.06) {
					flick = step(0.3, fract(sin(TIME * 7.0 + id.x * 3.0) * 43758.5));
				}
				// soft gradient inside window (curtain-like)
				float g = 0.65 + 0.35 * smoothstep(0.28, 0.78, f.y);
				emi = wc * window_energy * g * flick;
				col = wc * 0.2;
			} else {
				col = vec3(0.03, 0.035, 0.07);
				rough = 0.15; // dark glass reflects the sky
			}
		}
	} else {
		col = trim_color * 0.8;
	}
	ALBEDO = col;
	ROUGHNESS = rough;
	METALLIC = 0.1;
	EMISSION = emi;
}
