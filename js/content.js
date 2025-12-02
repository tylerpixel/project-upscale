// Render site content from JSON
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const response = await fetch("data/site-content.json");
    const content = await response.json();

    // Render Hero
    renderHero(content.hero);

    // Render Navigation
    renderNav(content.nav);

    // Store content globally for works.js to use
    window.siteContent = content;
  } catch (error) {
    console.error("Error loading site content:", error);
  }
});

function renderHero(hero) {
  if (!hero) return;

  const heroTitle = document.querySelector(".hero");
  const heroContainer = document.querySelector(".hero-container");

  if (heroTitle) {
    heroTitle.textContent = hero.title || "";
  }

  if (heroContainer) {
    // Find or create description paragraph
    let descP = heroContainer.querySelector("p");
    if (!descP) {
      descP = document.createElement("p");
      heroContainer.appendChild(descP);
    }

    // Build description with links
    const parts = hero.description.split(/(@\w+|current site|GitHub)/i);
    descP.innerHTML = "";

    parts.forEach((part, index) => {
      const link = hero.links?.find((l) => {
        const linkText = l.text.toLowerCase();
        const partLower = part.toLowerCase();
        return (
          partLower.includes(linkText) ||
          (linkText === "@tylerpixel" && partLower.includes("@")) ||
          (linkText === "current site" && partLower.includes("current")) ||
          (linkText === "github" && partLower.includes("github"))
        );
      });

      if (link) {
        const a = document.createElement("a");
        a.href = link.url;
        a.className = "linky";
        a.textContent = part;
        descP.appendChild(a);
      } else if (part.trim()) {
        const text = document.createTextNode(part);
        descP.appendChild(text);
      }
    });

    // Add line breaks if needed
    if (hero.description.includes("<br")) {
      descP.innerHTML = hero.description.replace(/\n/g, "<br />");
    }
  }
}

function renderNav(nav) {
  if (!nav) return;

  const navContainer = document.querySelector(".nav-container");
  if (!navContainer) return;

  // Clear existing nav items (except mobile menu)
  const existingItems = navContainer.querySelectorAll(".navbutton:not(.mobile-menu)");
  existingItems.forEach((item) => item.remove());

  // Render nav items
  nav.items?.forEach((item) => {
    const a = document.createElement("a");
    a.href = item.url;
    a.className = "navbutton";
    a.textContent = item.text;
    navContainer.insertBefore(a, navContainer.lastElementChild);
  });

  // Create/Update CTA button
  if (nav.cta) {
    let ctaButton = document.getElementById(nav.cta.id);
    if (!ctaButton) {
      // Create CTA button if it doesn't exist
      ctaButton = document.createElement("a");
      ctaButton.id = nav.cta.id;
      ctaButton.href = "#";
      navContainer.insertBefore(ctaButton, navContainer.lastElementChild);
    }
    ctaButton.textContent = nav.cta.text;
    ctaButton.className = "navbutton cta";
  }
}

