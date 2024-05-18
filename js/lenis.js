<script src="js/lenis.min.js"></script>

// Initialize Lenis for smooth scrolling
const lenis = new Lenis({
  // Optional settings for Lenis can go here
});

// Animation frame loop for smooth scrolling effect
function raf(time) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}

// Start the animation frame loop
requestAnimationFrame(raf);