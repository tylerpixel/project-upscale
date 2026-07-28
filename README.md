# Project Upscale: A Design and Development Portfolio

[![X Follow](https://img.shields.io/twitter/follow/tylerpixel?style=social)](https://x.com/tylerpixel) &ensp;

**Project Upscale** is a ground-up redesign and redevelopment of my current portfolio website. This is a full recode of my website in pure HTML, CSS, and JavaScript, moving away from no-code tools like Webflow or Framer that can be costly.

### 🎯 Goals
- ✨ **Simplicty** - Minimal dependencies, pure code that loads fast.
- 🆕 **Easily Updateable** - Easy to update & post articles, change text, and new portfolio items.
- 🧑‍🎨 **Aesthetic** -  Looks nice and has precise UX/UI that aren't distracting.

### 🏗️ Tech Stack
- **Languages**: HTML, CSS, and JS — no framework, and nothing to install. The
  one build step is `./scripts/build.sh`, which minifies `styles/main.css` and
  `js/*.js` into the `.min` files `index.html` loads. Edit the sources; run the
  script (or just `ship.sh`, which runs it for you) to see the change locally.
- **Editor**: VS Code
- **Hosting**: Cloudflare Workers (static assets + a worker for the message
  form and the vanity-subdomain redirects — see `worker/index.js`)
- **Content**: `data/site-content.json`, edited in place by the local CMS
  (`node admin/server.js`, loopback only)
- **Version Control**: GitHub

### Shipping
`./scripts/ship.sh` rebuilds the minified assets, bumps the version in
`data/site-content.json`, commits and tags it, deploys to Cloudflare, and pushes — so the version chip on the About
page always names the build that's actually live. Pass `minor` or `major` to
bump those instead of the patch, or `--dry-run` to preview.

### Links
[Figma File](https://www.figma.com/design/BHYeizEnUXlrv3Hf82ce19/Project-Upscale?node-id=0%3A1&t=5VoSTA0YajevcYPG-1)
&ensp;|&ensp;
[Staging Website](https://upscale.tylerpixel.com)
&ensp;|&ensp;
[Current Website](https://tylerpixel.com)

### Archive
[Merge 12](https://archive.is/NVRyb)
[Merge 13](https://archive.is/Ia0zS)

I hope you enjoy **Project Upscale**! This project is my challenge and showcases my wide range of design and development skillsets.

**🪙 [BTC Tip](https://pay.tylerpixel.com)**
&ensp;|&ensp;
**🛠️ [Work with Me](https://tylerpixel.com)**
