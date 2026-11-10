// AFTERLIGHT — night sky: deep gradient, stars, a soft moon and an aurora band.
shader_type sky;

uniform vec3 top_color : source_color = vec3(0.02, 0.02, 0.07);
uniform vec3 horizon_color : source_color = vec3(0.22, 0.09, 0.32);
uniform vec3 glow_color : source_color = vec3(0.1, 0.35, 0.6);
uniform vec3 moon_dir = vec3(0.4, 0.35, -0.85);
uniform float star_density = 1.0;
uniform float aurora = 1.0;

float hash(vec3 p) {
	p = fract(p * 0.3183099 + 0.1);
	p *= 17.0;
	return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

void sky() {
	vec3 d = normalize(EYEDIR);
	float h = clamp(d.y, -1.0, 1.0);
	vec3 col = mix(horizon_color, top_color, smoothstep(-0.05, 0.55, h));
	col += glow_color * 0.35 * exp(-abs(h) * 9.0);
	{
		// stars
		vec3 sp = floor(d * 220.0);
		float s = hash(sp);
		float tw = 0.6 + 0.4 * sin(TIME * 2.0 + s * 50.0);
		col += vec3(0.85, 0.9, 1.0) * step(1.0 - 0.0045 * star_density, s) * smoothstep(0.05, 0.4, h) * tw * 1.4;
	}
	// moon
	vec3 md = normalize(moon_dir);
	float m = dot(d, md);
	col += vec3(0.9, 0.85, 1.0) * smoothstep(0.9993, 0.9996, m) * 2.0;
	col += vec3(0.5, 0.45, 0.9) * pow(max(m, 0.0), 220.0) * 0.6;
	// aurora ribbon
	float band = sin(d.x * 3.0 + TIME * 0.05) * 0.08 + 0.32;
	float a = exp(-pow((h - band) * 9.0, 2.0)) * smoothstep(-0.2, 0.6, d.z * -1.0 + 0.3);
	col += vec3(0.2, 0.9, 0.8) * a * 0.18 * aurora + vec3(0.6, 0.2, 0.9) * a * 0.08 * aurora;
	COLOR = col;
}
