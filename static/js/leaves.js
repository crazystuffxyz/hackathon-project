// falling leaves. each one integrates the falling-plate equations (gravity,
// drag + lift at the live angle of attack, aerodynamic torque) with a shared
// ornstein-uhlenbeck gust for the wind, so weight and size actually change
// how a leaf flies: heavy ones power down, light ones flutter and tumble.
(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const AIR = 1.225;        // kg/m3
    const G = 9.81;
    const PX_M = 420;         // world meters -> css px
    const SLOWMO = 0.16;      // screen shows the fall slowed, otherwise it reads as rain
    const DT = 1 / 120;

    // aero fits over angle of attack: drag low edge-on high broadside,
    // lift peaks mid, the sin4 term biases the torque so tumbling happens
    const CD0 = 0.07, CD90 = 1.95, CL0 = 1.15, CM1 = 0.42, CM2 = 0.17, ROT_DAMP = 0.25;

    // shared wind, ou process: lam decay rate, sig gust scale (m/s)
    const WL = 0.5, WS = 0.5;

    const img = new Image();
    img.src = "/images/leaf.png";

    const canvas = document.createElement("canvas");
    canvas.className = "leaf-canvas";
    canvas.setAttribute("aria-hidden", "true");
    const ctx = canvas.getContext("2d");
    document.body.appendChild(canvas);

    let leaves = [];

    function fit() {
        const dpr = Math.min(devicePixelRatio || 1, 2);
        canvas.width = Math.round(innerWidth * dpr);
        canvas.height = Math.round(innerHeight * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    addEventListener("resize", fit);
    fit();

    function newLeaf(prefill) {
        const depth = 0.72 + Math.random() * 0.43;
        const s = 0.03 + Math.random() * 0.045;
        const sigma = 0.07 + Math.random() * 0.26;
        const pxm = PX_M * depth;
        return {
            depth, s, sigma, pxm,
            m: sigma * s * s,
            mA: 0.785 * AIR * s * s,
            I: (sigma * s ** 4) / 12,
            x: Math.random() * (innerWidth / pxm),
            y: prefill ? Math.random() * (innerHeight / pxm) : -(40 + Math.random() * 280) / pxm,
            th: (Math.random() - 0.5) * Math.PI,
            u: 0, v: 0.1,
            w: (Math.random() - 0.5) * 2,
            roll: Math.random() * Math.PI * 2,
            rollRate: 0.5 + Math.random() * 1.2,
            alpha: 0.62 + (depth - 0.72) * 0.55,
            jx: 0, jy: 0
        };
    }

    function reseed() {
        const n = Math.max(7, Math.min(18, Math.round(innerWidth / 85)));
        leaves = Array.from({ length: n }, () => newLeaf(true));
    }
    reseed();
    addEventListener("resize", () => {
        if (leaves.length !== Math.max(7, Math.min(18, Math.round(innerWidth / 85)))) reseed();
    });

    let spare = null;
    function gauss() {
        if (spare !== null) { const v = spare; spare = null; return v; }
        const r = Math.sqrt(-2 * Math.log(Math.random() + 1e-12));
        const t = 2 * Math.PI * Math.random();
        spare = r * Math.sin(t);
        return r * Math.cos(t);
    }

    function wrapAngle(a) {
        while (a > Math.PI) a -= 2 * Math.PI;
        while (a < -Math.PI) a += 2 * Math.PI;
        return a;
    }

    let Wx = 0, Wy = 0;

    function step(dt) {
        Wx += -WL * Wx * dt + WS * Math.sqrt(2 * WL * dt) * gauss();
        Wy += -WL * Wy * dt + WS * Math.sqrt(2 * WL * dt) * gauss() * 0.4;

        for (let n = 0; n < leaves.length; n++) {
            const l = leaves[n];

            // per-leaf turbulence, its own ou process so leaves don't move as one block
            l.jx += -3 * l.jx * dt + 0.9 * Math.sqrt(6 * dt) * gauss();
            l.jy += -3 * l.jy * dt + 0.9 * Math.sqrt(6 * dt) * gauss();

            const ct = Math.cos(l.th), st = Math.sin(l.th);
            const vlx = l.u * ct - l.v * st;
            const vly = l.u * st + l.v * ct;
            const rx = vlx - Wx - l.jx, ry = vly - Wy - l.jy;
            const U = Math.max(Math.hypot(rx, ry), 1e-4);

            const a = wrapAngle(l.th - Math.atan2(ry, rx));
            const cd = CD0 + (CD90 - CD0) * Math.sin(a) ** 2;
            const cl = CL0 * Math.sin(2 * a);

            const q = 0.5 * AIR * l.s * l.s * U * U;
            const dx = -q * cd * rx / U, dy = -q * cd * ry / U;
            const lx = -q * cl * ry / U, ly = q * cl * rx / U;

            // added mass: the leaf hauls a slug of air with it, which is why
            // light ones take the whole drop to get going
            const meff = l.m + l.mA;
            const ax = (dx + lx) / meff;
            const ay = (dy + ly + l.m * G) / meff;

            const at = ax * ct + ay * st, an = -ax * st + ay * ct;
            l.u += (at + l.w * l.v) * dt;
            l.v += (an - l.w * l.u) * dt;

            const cm = CM1 * Math.sin(2 * a) + CM2 * Math.sin(4 * a);
            const tq = 0.5 * AIR * l.s ** 3 * U * U * cm - ROT_DAMP * AIR * l.s ** 4 * U * l.w;
            l.w += (tq / l.I) * dt;
            l.th = wrapAngle(l.th + l.w * dt);

            l.x += vlx * dt;
            l.y += vly * dt;
            l.roll += l.rollRate * dt;

            const span = innerWidth / l.pxm;
            if (l.x * l.pxm < -80) l.x += span + 160 / l.pxm;
            else if (l.x * l.pxm > innerWidth + 80) l.x -= span + 160 / l.pxm;
        }
    }

    function draw() {
        ctx.clearRect(0, 0, innerWidth, innerHeight);
        for (let n = 0; n < leaves.length; n++) {
            const l = leaves[n];
            const px = l.x * l.pxm, py = l.y * l.pxm;
            const w = l.s * l.pxm;
            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(l.th);
            ctx.scale(0.45 + 0.55 * Math.abs(Math.cos(l.roll)), 1);
            ctx.globalAlpha = l.alpha;
            ctx.drawImage(img, -w / 2, -w / 2, w, w);
            ctx.restore();
        }
    }

    let last = performance.now(), acc = 0;
    function frame(now) {
        requestAnimationFrame(frame);
        acc += Math.min((now - last) / 1000, 0.1) * SLOWMO;
        last = now;
        while (acc >= DT) {
            step(DT);
            acc -= DT;
            // swap out leaves that landed
            for (let n = 0; n < leaves.length; n++) {
                if (leaves[n].y * leaves[n].pxm > innerHeight + 80) leaves[n] = newLeaf(false);
            }
        }
        draw();
    }
    requestAnimationFrame(frame);
})();