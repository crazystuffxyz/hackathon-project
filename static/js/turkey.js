// a turkey crosses the bottom of the screen now and then, that's it
(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const SPRITES = { 1: "/images/turkeywalkright.png", [-1]: "/images/turkeywalkleft.png" };
    const SIZE = 64, OFFSTAGE = 100;

    const wrap = document.createElement("div");
    wrap.className = "yard-turkey";
    wrap.setAttribute("aria-hidden", "true");
    wrap.style.visibility = "hidden";

    const sprite = document.createElement("div");
    sprite.className = "yard-turkey-sprite";
    wrap.appendChild(sprite);
    document.body.appendChild(wrap);

    let x = -OFFSTAGE, dir = 1, speed = 60;
    let mode = "wait", nextShow = performance.now() + 6000 + Math.random() * 4000;
    let frame = 0, frameT = 0, peckUntil = 0, pecks = 0, turnLeft = 0;

    function spawn() {
        dir = Math.random() < 0.5 ? 1 : -1;
        x = dir === 1 ? -OFFSTAGE : innerWidth + OFFSTAGE - SIZE;
        speed = 44 + Math.random() * 30;
        pecks = 0;
        turnLeft = Math.random() < 0.3 ? 1 : 0;
        mode = "walk";
        sprite.style.backgroundImage = `url(${SPRITES[dir]})`;
    }

    let last = performance.now();
    function tick(now) {
        requestAnimationFrame(tick);
        const dt = Math.min((now - last) / 1000, 0.1);
        last = now;

        if (mode === "wait") {
            if (now >= nextShow) {
                spawn();
                wrap.style.visibility = "visible";
            }
            return;
        }

        if (now < peckUntil) {
            // holding still for the peck, frames too
            return;
        }
        sprite.classList.remove("peck");

        x += dir * speed * dt;

        if (pecks < 2 && Math.random() < dt * 0.25) {
            pecks++;
            sprite.classList.add("peck");
            peckUntil = now + 950;
        } else if (turnLeft > 0 && Math.random() < dt * 0.05) {
            turnLeft--;
            dir = -dir;
            sprite.style.backgroundImage = `url(${SPRITES[dir]})`;
        }

        frameT += dt;
        if (frameT > 0.14) {
            frameT = 0;
            frame ^= 1;
        }
        sprite.style.backgroundPosition = frame ? "0% 0" : "100% 0";
        wrap.style.transform = `translate3d(${Math.round(x)}px, 0, 0)`;

        if (x < -OFFSTAGE - 10 || x > innerWidth + OFFSTAGE + 10) {
            mode = "wait";
            nextShow = now + 45000 + Math.random() * 60000;
            wrap.style.visibility = "hidden";
        }
    }
    requestAnimationFrame(tick);
})();