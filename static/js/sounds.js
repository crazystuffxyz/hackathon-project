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

    // Special sound for submitting a post
    if (clickable.id === "submit-post-btn") {
        postSound.currentTime = 0;
        postSound.play().catch(console.error);
        return;
    }

    // Normal button/link sound
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
