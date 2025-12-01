document.addEventListener("DOMContentLoaded", () => {
  const worksWrapper = document.querySelector(".works-wrapper");

  if (!worksWrapper) return;

  const LOOP_COPIES = 5; // Needs to be >= 3 so we always have a buffer above and below.
  const LOOP_CENTER_INDEX = Math.floor(LOOP_COPIES / 2);
  const PROJECTS_ENDPOINT = "data/projects.json";

  let projectsData = [];
  let lenis = null;
  let isJumping = false;
  let singleSetHeight = 0;
  let loopLowerLimit = 0;
  let loopUpperLimit = 0;
  let scrollControllerReady = false;
  let snapTimeout = null;
  let lastScrollPosition = 0;
  let lastScrollTime = Date.now();

  const setAnchors = [];
  const supportsResizeObserver = typeof ResizeObserver === "function";
  const resizeObserver = supportsResizeObserver
    ? new ResizeObserver(() => measureLoop())
    : null;

  fetch(PROJECTS_ENDPOINT)
    .then((response) => response.json())
    .then((projects) => {
      projectsData = Array.isArray(projects) ? projects : [];
      if (!projectsData.length) return;
      buildLoop();
    })
    .catch((error) => console.error("Error loading projects:", error));

  function buildLoop() {
    worksWrapper.innerHTML = "";
    setAnchors.length = 0;

    for (let copyIndex = 0; copyIndex < LOOP_COPIES; copyIndex++) {
      const setStartIndex = worksWrapper.children.length;

      projectsData.forEach((project) => {
        worksWrapper.appendChild(createCard(project));
      });

      worksWrapper.appendChild(createSeparator());

      const startElement = worksWrapper.children[setStartIndex];
      setAnchors.push(startElement);
    }

    bindImageLoadHandlers();
    requestAnimationFrame(() => {
      measureLoop();
      positionAtCenter();
      initScrollController();
      if (supportsResizeObserver && resizeObserver) {
        resizeObserver.observe(worksWrapper);
      } else {
        window.addEventListener("resize", measureLoop);
      }
    });
  }

  function createCard(project) {
    const container = document.createElement("div");
    container.classList.add("works-container");

    const img = document.createElement("img");
    img.classList.add("works-img");
    img.src = project.image;
    img.alt = `${project.title} Project Image`;
    img.loading = "lazy";

    container.appendChild(img);

    const infoDiv = document.createElement("div");
    infoDiv.classList.add("works-info");

    const title = document.createElement("p");
    title.classList.add("works-info-text", "title");
    title.textContent = project.title;

    const year = document.createElement("p");
    year.classList.add("works-info-text", "year");
    year.textContent = project.year;

    infoDiv.appendChild(title);
    infoDiv.appendChild(year);

    container.appendChild(infoDiv);

    return container;
  }

  function createSeparator() {
    const separator = document.createElement("div");
    separator.classList.add("works-separator");
    return separator;
  }

  function bindImageLoadHandlers() {
    const images = worksWrapper.querySelectorAll("img");
    images.forEach((img) => {
      if (img.complete) return;
      const handleLoad = () => {
        img.removeEventListener("load", handleLoad);
        img.removeEventListener("error", handleLoad);
        measureLoop();
      };
      img.addEventListener("load", handleLoad);
      img.addEventListener("error", handleLoad);
    });
  }

  function prefersReducedMotion() {
    return (
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function measureLoop() {
    if (setAnchors.length < 2) return;

    const nextStart = setAnchors[1].offsetTop;
    const firstStart = setAnchors[0].offsetTop;
    const newSingleSetHeight = nextStart - firstStart;

    if (newSingleSetHeight <= 0) return;

    singleSetHeight = newSingleSetHeight;
    loopLowerLimit = nextStart;
    loopUpperLimit = setAnchors[setAnchors.length - 1].offsetTop;

    if (lenis) {
      lenis.resize();
    }

    if (scrollControllerReady) {
      enforceLoop(currentScroll());
    }
  }

  function currentScroll() {
    return lenis ? lenis.scroll : worksWrapper.scrollTop;
  }

  function positionAtCenter() {
    const anchor = setAnchors[LOOP_CENTER_INDEX];
    if (!anchor) return;

    const target = anchor.offsetTop;
    worksWrapper.scrollTop = target;
    if (lenis) {
      lenis.scrollTo(target, { immediate: true, force: true });
    }
  }

  function initScrollController() {
    if (scrollControllerReady) return;

    if (typeof Lenis !== "undefined" && !prefersReducedMotion()) {
      lenis = new Lenis({
        wrapper: worksWrapper,
        content: worksWrapper,
        wheelEventsTarget: worksWrapper,
        eventsTarget: worksWrapper,
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        smoothTouch: true,
      });

      const raf = (time) => {
        lenis.raf(time);
        requestAnimationFrame(raf);
      };
      requestAnimationFrame(raf);

      lenis.on("scroll", ({ scroll, velocity }) => {
        if (isJumping) return;
        enforceLoop(scroll);

        // Track scroll position and velocity for snap detection
        const currentTime = Date.now();
        lastScrollPosition = scroll;
        lastScrollTime = currentTime;

        // Clear any pending snap
        clearTimeout(snapTimeout);

        // Check if scrolling has stopped (velocity is near zero)
        // Wait a bit to ensure scrolling has truly stopped
        snapTimeout = setTimeout(() => {
          // Double-check velocity is zero and position hasn't changed
          if (
            Math.abs(velocity) < 0.1 &&
            Math.abs(lenis.scroll - lastScrollPosition) < 1
          ) {
            snapToNearestCard();
          }
        }, 100); // Wait 100ms after last scroll event
      });

      lenis.scrollTo(worksWrapper.scrollTop, { immediate: true, force: true });
    } else {
      let nativeScrollVelocity = 0;
      let nativeLastScrollTop = 0;
      let nativeLastScrollTime = Date.now();

      worksWrapper.addEventListener(
        "scroll",
        () => {
          if (isJumping) return;
          enforceLoop(worksWrapper.scrollTop);

          // Track scroll velocity for native scrolling
          const currentTime = Date.now();
          const timeDelta = currentTime - nativeLastScrollTime;
          const scrollDelta = worksWrapper.scrollTop - nativeLastScrollTop;

          if (timeDelta > 0) {
            nativeScrollVelocity = scrollDelta / timeDelta;
          }

          nativeLastScrollTop = worksWrapper.scrollTop;
          nativeLastScrollTime = currentTime;

          // Clear any pending snap
          clearTimeout(snapTimeout);

          // Check if scrolling has stopped
          snapTimeout = setTimeout(() => {
            // Check if velocity is near zero
            if (Math.abs(nativeScrollVelocity) < 0.1) {
              snapToNearestCard();
            }
          }, 100);
        },
        { passive: true }
      );
    }

    scrollControllerReady = true;
  }

  function enforceLoop(position) {
    if (!singleSetHeight || setAnchors.length < 3) return;

    let target = position;

    if (position < loopLowerLimit) {
      do {
        target += singleSetHeight;
      } while (target < loopLowerLimit);
      setScrollSilently(target);
    } else if (position >= loopUpperLimit) {
      do {
        target -= singleSetHeight;
      } while (target >= loopUpperLimit);
      setScrollSilently(target);
    }
  }

  function setScrollSilently(value) {
    isJumping = true;
    if (lenis) {
      lenis.scrollTo(value, { immediate: true, force: true });
    } else {
      worksWrapper.scrollTop = value;
    }
    requestAnimationFrame(() => {
      isJumping = false;
    });
  }

  // Snap to nearest card top when scrolling stops
  function snapToNearestCard() {
    if (isJumping) return;

    const containers = worksWrapper.querySelectorAll(".works-container");
    if (containers.length === 0) return;

    const scrollTop = lenis ? lenis.scroll : worksWrapper.scrollTop;
    let nearestContainer = null;
    let nearestDistance = Infinity;

    // Find the nearest card
    containers.forEach((container) => {
      const containerTop = container.offsetTop;
      const distance = Math.abs(containerTop - scrollTop);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestContainer = container;
      }
    });

    if (nearestContainer) {
      const targetScroll = nearestContainer.offsetTop;

      // Only snap if we're not already aligned (within 2px threshold)
      if (Math.abs(scrollTop - targetScroll) > 2) {
        isJumping = true;

        if (lenis) {
          lenis.scrollTo(targetScroll, {
            duration: 0.4,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            force: true,
          });
        } else {
          worksWrapper.scrollTo({
            top: targetScroll,
            behavior: "smooth",
          });
        }

        setTimeout(() => {
          isJumping = false;
        }, 400);
      }
    }
  }
});
