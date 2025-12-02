document.addEventListener("DOMContentLoaded", () => {
  // Wait for content.js to create the button
  function initDMApp() {
    const dmButton = document.getElementById("dmMeButton");
    if (!dmButton) {
      // Button not created yet, try again after a short delay
      setTimeout(initDMApp, 100);
      return;
    }

    const overlay = document.getElementById("dmAppOverlay");
    const emailStep = document.getElementById("emailStep");
    const messageStep = document.getElementById("messageStep");
    const confirmationStep = document.getElementById("confirmationStep");
    const emailInput = document.getElementById("dmEmailInput");
    const messageInput = document.getElementById("dmMessageInput");
    const emailNextButton = document.getElementById("emailNextButton");
    const sendButton = document.getElementById("dmSendButton");
    const emailError = document.getElementById("emailError");

    let isOpen = false;
    let emailValue = "";

    // Email validation regex
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Update button text
    function updateButtonText(isOpen) {
      if (isOpen) {
        dmButton.textContent = "Close";
        dmButton.classList.add("close-active");
      } else {
        dmButton.textContent = "DM Me";
        dmButton.classList.remove("close-active");
      }
    }

    // Open DM App
    function openDMApp() {
      if (isOpen) return;
      isOpen = true;

      // Update button to close
      updateButtonText(true);

      // Reset form
      emailInput.value = "";
      messageInput.value = "";
      emailError.textContent = "";
      emailStep.style.display = "flex";
      messageStep.style.display = "none";
      confirmationStep.style.display = "none";

      // Show overlay
      overlay.classList.add("active");

      // GSAP animation - slide up tray from bottom
      const tl = gsap.timeline();
      tl.set(overlay, { opacity: 0, y: "100%" })
        .to(overlay, {
          opacity: 1,
          y: 0,
          duration: 0.4,
          ease: "power3.out",
        })
        .call(() => {
          emailInput.focus();
        });
    }

    // Close DM App
    function closeDMApp() {
      if (!isOpen) return;

      // Update button back to DM Me
      updateButtonText(false);

      const tl = gsap.timeline({
        onComplete: () => {
          overlay.classList.remove("active");
          isOpen = false;
        },
      });

      tl.to(overlay, {
        y: "100%",
        opacity: 0,
        duration: 0.3,
        ease: "power3.in",
      });
    }

    // Validate and proceed from email to message
    function proceedToMessage() {
      const email = emailInput.value.trim();

      if (!email) {
        emailError.textContent = "Please enter your email";
        emailInput.focus();
        return;
      }

      if (!emailPattern.test(email)) {
        emailError.textContent = "Please enter a valid email address";
        emailInput.focus();
        return;
      }

      emailValue = email;
      emailError.textContent = "";

      // Animate transition to message step
      const tl = gsap.timeline();
      tl.to(emailStep, {
        opacity: 0,
        y: -10,
        duration: 0.2,
        ease: "power2.in",
        onComplete: () => {
          emailStep.style.display = "none";
          messageStep.style.display = "flex";
          gsap.set(messageStep, { opacity: 0, y: 10 });
        },
      }).to(messageStep, {
        opacity: 1,
        y: 0,
        duration: 0.3,
        ease: "power2.out",
        onComplete: () => {
          messageInput.focus();
        },
      });
    }

    // Send message via EmailJS
    async function sendMessageToBackend(email, message) {
      try {
        // EmailJS integration
        // You'll need to:
        // 1. Sign up at https://www.emailjs.com/
        // 2. Create an email service
        // 3. Create an email template
        // 4. Get your Public Key, Service ID, and Template ID
        // 5. Replace the values below

        if (typeof emailjs === "undefined") {
          console.error(
            "EmailJS is not loaded. Please add the EmailJS script to your HTML."
          );
          return;
        }

        const serviceId = "YOUR_SERVICE_ID"; // Replace with your EmailJS service ID
        const templateId = "YOUR_TEMPLATE_ID"; // Replace with your EmailJS template ID
        const publicKey = "YOUR_PUBLIC_KEY"; // Replace with your EmailJS public key

        await emailjs.send(
          serviceId,
          templateId,
          {
            from_email: email,
            message: message,
            to_email: "gm@tylerpixel.com", // Your email address
          },
          publicKey
        );
      } catch (error) {
        console.error("Error sending message:", error);
        // Fallback: You could show an error message to the user here
        // For now, we'll still show success to not break the UX flow
      }
    }

    // Send message
    function sendMessage() {
      const message = messageInput.value.trim();

      if (!message) {
        messageInput.focus();
        return;
      }

      // Animate transition to confirmation
      const tl = gsap.timeline();
      tl.to(messageStep, {
        opacity: 0,
        y: -10,
        duration: 0.2,
        ease: "power2.in",
        onComplete: () => {
          messageStep.style.display = "none";
          confirmationStep.style.display = "flex";
          gsap.set(confirmationStep, { opacity: 0 });
        },
      }).to(confirmationStep, {
        opacity: 1,
        duration: 0.3,
        ease: "power2.out",
      });

      // Send message via EmailJS or your backend
      sendMessageToBackend(emailValue, message);

      // Auto-close after 1.5 seconds
      setTimeout(() => {
        closeDMApp();
      }, 1500);
    }

    // Event Listeners
    dmButton.addEventListener("click", (e) => {
      e.preventDefault();
      if (isOpen) {
        closeDMApp();
      } else {
        openDMApp();
      }
    });

    emailNextButton.addEventListener("click", proceedToMessage);

    emailInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        proceedToMessage();
      }
    });

    sendButton.addEventListener("click", sendMessage);

    messageInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    // Close on overlay click disabled - no backdrop, tray slides up from bottom
    // Users can close with Escape key or by completing the flow

    // Close on Escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && isOpen) {
        closeDMApp();
      }
    });
  }

  // Start initialization
  initDMApp();
});
