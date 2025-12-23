const animations = {
  button: {
    failure: {
      keyframes: {
        light: [
          { backgroundColor: "hsl(0, 0%, 0%)" },
          { backgroundColor: "hsl(0, 100%, 25%)" },
        ],
        dark: [
          { backgroundColor: "hsl(0, 0%, 100%)" },
          { backgroundColor: "hsl(0, 100%, 75%)" },
        ],
      },
      options: {
        direction: "alternate",
        duration: 400,
        easing: "ease-out",
        iterations: 6,
      },
    },
    success: {
      keyframes: {
        light: [
          { backgroundColor: "hsl(0, 0%, 0%)" },
          { backgroundColor: "hsl(120, 100%, 25%)" },
        ],
        dark: [
          { backgroundColor: "hsl(0, 0%, 100%)" },
          { backgroundColor: "hsl(120, 100%, 75%)" },
        ],
      },
      options: {
        direction: "alternate",
        duration: 500,
        easing: "ease-out",
        iterations: 2,
      },
    },
  },
};

const animateButton = async (button, animation, colorScheme = "light") => {
  button.disabled = true;
  button.style.setProperty("opacity", "1");
  await button.animate(
    animations.button[animation].keyframes[colorScheme],
    animations.button[animation].options
  ).finished;
  button.style.removeProperty("opacity");
  button.disabled = false;
};

export { animateButton };
