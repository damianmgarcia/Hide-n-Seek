const animations = {
  button: {
    failure: {
      keyframes: [
        { backgroundColor: "hsl(0, 0%, 0%)" },
        { backgroundColor: "hsl(0, 100%, 25%)" },
      ],
      options: {
        direction: "alternate",
        duration: 400,
        easing: "ease-out",
        iterations: 6,
      },
    },
    success: {
      keyframes: [
        { backgroundColor: "hsl(0, 0%, 0%)" },
        { backgroundColor: "hsl(120, 100%, 25%)" },
      ],
      options: {
        direction: "alternate",
        duration: 500,
        easing: "ease-out",
        iterations: 2,
      },
    },
  },
};

const animateButton = async (button, animation) => {
  button.disabled = true;
  button.style.setProperty("opacity", "1");
  await button.animate(
    animations.button[animation].keyframes,
    animations.button[animation].options
  ).finished;
  button.style.removeProperty("opacity");
  button.disabled = false;
};

export { animateButton };
