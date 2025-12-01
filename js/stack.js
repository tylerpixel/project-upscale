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

      lenis.on("scroll", ({ scroll }) => {
        if (isJumping) return;
        enforceLoop(scroll);
      });

      lenis.scrollTo(worksWrapper.scrollTop, { immediate: true, force: true });
    } else {
      worksWrapper.addEventListener(
        "scroll",
        () => {
          if (isJumping) return;
          enforceLoop(worksWrapper.scrollTop);
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
});
