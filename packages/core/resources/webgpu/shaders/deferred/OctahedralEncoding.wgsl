// From: https://knarkowicz.wordpress.com/2014/04/16/octahedron-normal-vector-encoding/
fn OctWrap(v: vec2f) -> vec2f {
    return (1.0 - abs(v.yx)) * select(vec2f(-1.0), vec2f(1.0), v.xy >= vec2(0.0));
}

fn OctEncode(_n: vec3f) -> vec2f {
    var n = _n.xy;
    let nz = _n.z;
    n /= (abs(n.x) + abs(n.y) + abs(nz));
    n = select(OctWrap(n.xy), n.xy, nz >= 0.0);
    n = n.xy * 0.5 + 0.5;
    return n.xy;
}

fn OctDecode(_f: vec2f) -> vec3f {
    let f = _f * 2.0 - 1.0;

    // https://twitter.com/Stubbesaurus/status/937994790553227264
    var n = vec3f(f.x, f.y, 1.0 - abs(f.x) - abs(f.y));
    let t = saturate(-n.z);
    let cond = select(vec2f(t), vec2f(-t), n.xy >= vec2f(0.0));
    n.x += cond.x; n.y += cond.y;
    return normalize(n);
}