if (window.matchMedia('(display-mode: standalone)').matches) {
    // Change the status bar style to white-translucent for PWA
    let metaTag = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (metaTag) {
        metaTag.setAttribute('content', 'white-translucent');
    } else {
        metaTag = document.createElement('meta');
        metaTag.setAttribute('name', 'apple-mobile-web-app-status-bar-style');
        metaTag.setAttribute('content', 'white-translucent');
        document.head.appendChild(metaTag);}}