// Shared code for cleanable surfaces: procedural clean materials + dirt mask blending.
uniform sampler2D dirt_mask : filter_linear, repeat_disable, hint_default_black;
uniform vec3 clean_a : source_color = vec3(0.8, 0.8, 0.78);
uniform vec3 clean_b : source_color = vec3(0.7, 0.7, 0.68);
uniform int pattern = 0;
uniform vec2 size = vec2(1.0, 1.0);
uniform float pattern_scale = 1.0;
uniform vec3 dirt_a : source_color = vec3(0.33, 0.22, 0.12);
uniform vec3 dirt_b : source_color = vec3(0.24, 0.16, 0.09);
uniform int dirt_mode = 0;
uniform float clean_roughness = 0.6;
uniform float clean_metallic = 0.0;
uniform float foam = 0.0;
uniform float circle_clip = 0.0;
uniform float shine = 0.0;
uniform float seed = 0.0;

float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
	vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
	return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) {
	float v = 0.0; float a = 0.5;
	for (int i = 0; i < 3; i++) { v += a * vnoise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
	return v;
}

// Returns the clean albedo for the chosen pattern; `grout` gets 1.0 on joints.
vec3 clean_albedo(vec2 p, out float grout) {
	grout = 0.0;
	float n = fbm(p * 1.3 + seed);
	if (pattern == 1) { // square tiles
		vec2 c = p / 0.5; vec2 f = fract(c);
		grout = 1.0 - step(0.06, f.x) * step(0.06, f.y);
		vec3 tcol = mix(clean_a, clean_b, h21(floor(c)) * 0.6 + n * 0.2);
		return mix(tcol, clean_b * 0.55, grout);
	} else if (pattern == 2) { // wooden planks
		vec2 c = vec2(p.x / 1.6, p.y / 0.22);
		float row = floor(c.y);
		c.x += h21(vec2(row, 3.0)) * 3.0;
		vec2 f = fract(c);
		grout = 1.0 - step(0.035, f.y) * step(0.012, f.x);
		float grain = vnoise(vec2(p.x * 2.0, p.y * 40.0) + row) * 0.5 + vnoise(vec2(p.x * 9.0, p.y * 90.0)) * 0.2;
		vec3 wcol = mix(clean_a, clean_b, grain + h21(vec2(row, floor(c.x))) * 0.35);
		return mix(wcol, clean_b * 0.45, grout);
	} else if (pattern == 3) { // stone pavers, staggered
		vec2 c = vec2(p.x / 0.8, p.y / 0.5);
		c.x += mod(floor(c.y), 2.0) * 0.5;
		vec2 f = fract(c);
		grout = 1.0 - step(0.045, f.x) * step(0.07, f.y) * step(f.x, 0.955) * step(f.y, 0.93);
		vec3 scol = mix(clean_a, clean_b, h21(floor(c)) * 0.7 + n * 0.3);
		return mix(scol, clean_b * 0.6, grout);
	} else if (pattern == 4) { // bricks
		vec2 c = vec2(p.x / 0.32, p.y / 0.12);
		c.x += mod(floor(c.y), 2.0) * 0.5;
		vec2 f = fract(c);
		grout = 1.0 - step(0.05, f.x) * step(0.12, f.y);
		vec3 bcol = mix(clean_a, clean_b, h21(floor(c)) * 0.8 + n * 0.2);
		return mix(bcol, vec3(0.82, 0.8, 0.76), grout);
	} else if (pattern == 9) { // irregular flagstones (voronoi)
		vec2 c = p / 0.62;
		vec2 ip = floor(c); vec2 fp = fract(c);
		float d1 = 8.0; float d2 = 8.0; vec2 id = vec2(0.0);
		for (int y = -1; y <= 1; y++) {
			for (int x = -1; x <= 1; x++) {
				vec2 g = vec2(float(x), float(y));
				vec2 o = vec2(h21(ip + g), h21(ip + g + 17.3)) * 0.8 + 0.1;
				float d = length(g + o - fp);
				if (d < d1) { d2 = d1; d1 = d; id = ip + g; }
				else if (d < d2) { d2 = d; }
			}
		}
		float edge = d2 - d1;
		grout = 1.0 - smoothstep(0.035, 0.07, edge);
		float bevel = smoothstep(0.07, 0.25, edge);
		vec3 scol = mix(clean_a, clean_b, h21(id) * 0.8 + n * 0.25);
		scol *= 0.82 + 0.18 * bevel;                      // rounded stone edges
		float crack = smoothstep(0.985, 1.0, vnoise(p * vec2(9.0, 2.0) + id * 3.1));
		scol *= 1.0 - crack * 0.35;
		return mix(scol, clean_b * 0.42, grout);
	} else if (pattern == 6) { // car paint: smooth with subtle flake
		return mix(clean_a, clean_b, n * 0.25 + vnoise(p * 60.0) * 0.05);
	} else if (pattern == 7) { // asphalt / concrete speckle
		return mix(clean_a, clean_b, vnoise(p * 14.0) * 0.6 + n * 0.4);
	} else if (pattern == 8) { // fabric / upholstery
		float weave = 0.5 + 0.5 * sin(p.x * 120.0) * sin(p.y * 120.0);
		return mix(clean_a, clean_b, weave * 0.4 + n * 0.3);
	}
	return mix(clean_a, clean_b, n * 0.6);
}

// Computes final albedo / roughness / metallic for a dirt mask value.
void apply_dirt(vec2 uv, out vec3 albedo, out float rough, out float metal, out float dirt_vis, out vec3 emit) {
	vec2 p = uv * size * pattern_scale;
	float grout;
	vec3 clean = clean_albedo(p, grout);
	vec4 mask = texture(dirt_mask, uv);
	float m = mask.r;
	float wet = mask.g;
	float detail = fbm(p * 3.0 + seed * 7.0);
	rough = clean_roughness;
	metal = clean_metallic;
	vec3 col = clean;
	float d = 0.0;
	if (dirt_mode == 1) {
		d = smoothstep(0.18, 0.3, m);
		vec3 hue = 0.5 + 0.5 * cos(6.2831 * (vec3(0.0, 0.33, 0.67) + uv.x * 1.3 + uv.y * 0.6 + seed));
		hue = mix(hue, dirt_a, step(0.55, m) * step(0.5, fract(uv.x * 7.0 + seed)) * 0.6);
		col = mix(clean, hue * 1.05, d);
		rough = mix(rough, 0.45, d);
	} else if (dirt_mode == 2) {
		d = smoothstep(0.03, 0.35, m * (0.75 + 0.5 * detail));
		vec3 bub = mix(dirt_a, dirt_b, vnoise(p * 18.0));
		col = mix(clean, bub, d);
		rough = mix(rough, 0.35, d);
	} else if (dirt_mode == 3) {
		d = smoothstep(0.02, 0.6, m);
		vec3 dull = mix(clean, vec3(dot(clean, vec3(0.33))), 0.55) * 0.72 + vec3(0.05);
		col = mix(clean, dull, d);
		rough = mix(clean_roughness, 0.8, d);
		metal = mix(clean_metallic, 0.0, d);
	} else {
		d = smoothstep(0.02, 0.45, m * (0.6 + 0.8 * detail));
		vec3 dc = mix(dirt_a, dirt_b, fbm(p * 1.7 + seed * 3.0));
		dc *= 0.85 + 0.3 * vnoise(p * 9.0);
		col = mix(clean, dc, d * 0.97);
		rough = mix(rough, 0.95, d);
		metal = mix(metal, 0.0, d);
	}
	// Dirt settles in the joints first.
	col = mix(col, col * 0.7, grout * clamp(m * 2.0, 0.0, 1.0));
	// Freshly cleaned surfaces get a gentle extra brightness.
	col *= 1.0 + 0.03 * (1.0 - d);
	// Wet look where water tools have just worked (dries over a few seconds).
	col *= 1.0 - wet * 0.28;
	rough = mix(rough, 0.12, wet * 0.9);
	if (foam > 0.001) {
		float fb = smoothstep(0.35, 0.75, vnoise(p * 7.0 + seed)) * 0.5 + 0.5;
		col = mix(col, vec3(0.96, 0.97, 1.0), clamp(foam * fb * (0.45 + 0.4 * d), 0.0, 0.9));
	}
	albedo = col;
	dirt_vis = d;
	emit = vec3(0.55, 1.0, 0.95) * shine * 0.45;
}
