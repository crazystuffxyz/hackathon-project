const backgroundMusic = new Audio("/sounds/harvestv2.wav");

backgroundMusic.volume = 0.05;
backgroundMusic.loop = true;
backgroundMusic.preload = "auto";

document.addEventListener("pointerdown", () => {
    if (backgroundMusic.paused) {
        backgroundMusic.currentTime = 0;
        backgroundMusic.play().catch(console.error);
    }
}, { once: true });

const buttonSound = new Audio("/sounds/button.wav");
const postSound = new Audio("/sounds/post.wav");

buttonSound.volume = 0.3;
postSound.volume = 0.35;

buttonSound.preload = "auto";
postSound.preload = "auto";

document.addEventListener("click", (event) => {
    const clickable = event.target.closest("button, a");

    if (!clickable || clickable.disabled) return;

    if (clickable.id === "submit-post-btn") {
        postSound.currentTime = 0;
        postSound.play().catch(console.error);
        return;
    }

    buttonSound.currentTime = 0;
    buttonSound.play().catch(console.error);
});

const scrollSound = new Audio("/sounds/scroll.wav");
scrollSound.volume = 0.2;
scrollSound.preload = "auto";

let scrollCooldown = false;

window.addEventListener("scroll", () => {
    if (scrollCooldown) return;
    scrollSound.currentTime = 0;
    scrollSound.play().catch(() => {});

    scrollCooldown = true;
    setTimeout(() => {
        scrollCooldown = false;
    }, 600);
});

const allSounds = [backgroundMusic, buttonSound, postSound, scrollSound];
let soundMuted = localStorage.getItem("soundMuted") === "true";
allSounds.forEach(sound => {
    sound.muted = soundMuted;
});

const soundToggle = document.createElement("button");

soundToggle.textContent = soundMuted ? "🔇" : "🔊";
soundToggle.title = "Toggle sound";
soundToggle.setAttribute("aria-label", "Toggle sound");
soundToggle.style.position = "fixed";
soundToggle.style.bottom = "20px";
soundToggle.style.right = "20px";
soundToggle.style.width = "44px";
soundToggle.style.height = "44px";
soundToggle.style.borderRadius = "50%";
soundToggle.style.border = "none";
soundToggle.style.fontSize = "24px";
soundToggle.style.cursor = "pointer";
soundToggle.style.zIndex = "9999";
document.body.appendChild(soundToggle);
soundToggle.addEventListener("click", () => {
    soundMuted = !soundMuted;
    allSounds.forEach((sound) => {
        sound.muted = soundMuted;
    });
    localStorage.setItem("soundMuted", soundMuted);
    soundToggle.textContent = soundMuted ? "🔇" : "🔊";
});

