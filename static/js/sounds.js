const buttonSound = new Audio("/sounds/button.wav");
buttonSound.volume = 0.3;
buttonSound.preload = "auto";

document.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button || button.disabled) return;
    buttonSound.currentTime = 0;
    buttonSound.play().catch(console.error);
});