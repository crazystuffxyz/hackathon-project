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