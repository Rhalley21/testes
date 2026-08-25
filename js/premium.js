/* =========================================================================
   INETRIS — Camada Premium (somente index.html)
   Interações adicionais: preloader, header que encolhe, cursor com brilho,
   lightbox da galeria e botão "voltar ao topo" com anel de progresso.
   Isolado de script.js de propósito — não é carregado nas outras páginas.
   ========================================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Preloader ---------- */
  const preloader = document.querySelector(".preloader");
  if (preloader) {
    const hidePreloader = () => preloader.classList.add("is-done");
    window.addEventListener("load", () => setTimeout(hidePreloader, 250));
    setTimeout(hidePreloader, 2200); // rede de segurança, caso "load" demore
  }

  /* ---------- Header: encolhe suavemente ao rolar ---------- */
  const header = document.querySelector(".site-header");
  if (header) {
    const onScrollHeader = () => header.classList.toggle("is-scrolled", window.scrollY > 40);
    window.addEventListener("scroll", onScrollHeader, { passive: true });
    onScrollHeader();
  }

  /* ---------- Quem Somos: anima as tags do card em cascata ao entrar na tela ---------- */
  const blueprintCard = document.querySelector(".blueprint-card");
  if (blueprintCard && "IntersectionObserver" in window) {
    const bpObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          blueprintCard.classList.add("is-visible");
          bpObserver.disconnect();
        }
      });
    }, { threshold: 0.35 });
    bpObserver.observe(blueprintCard);
  }

  /* ---------- Hero: constelação com pequenas logos do INETRIS ---------- */
  const logoCanvas = document.querySelector(".hero-logo-constellation");
  if (logoCanvas) {
    const ctx = logoCanvas.getContext("2d");
    const logoImg = new Image();

    let width = 0, height = 0, dpr = 1, nodes = [];
    let rafId = null;

    const resize = () => {
      const rect = logoCanvas.parentElement.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      logoCanvas.width = Math.round(width * dpr);
      logoCanvas.height = Math.round(height * dpr);
      logoCanvas.style.width = width + "px";
      logoCanvas.style.height = height + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const initNodes = () => {
      const count = Math.max(9, Math.min(22, Math.floor((width * height) / 60000)));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.12,
        vy: (Math.random() - 0.5) * 0.12,
        size: 16 + Math.random() * 14,
        alpha: 0.35 + Math.random() * 0.3,
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 170) {
            ctx.strokeStyle = `rgba(244, 198, 107, ${0.16 * (1 - dist / 170)})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      nodes.forEach((n) => {
        ctx.globalAlpha = n.alpha;
        ctx.drawImage(logoImg, n.x - n.size / 2, n.y - n.size / 2, n.size, n.size);
      });
      ctx.globalAlpha = 1;
    };

    const step = () => {
      nodes.forEach((n) => {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < -24) n.x = width + 24;
        if (n.x > width + 24) n.x = -24;
        if (n.y < -24) n.y = height + 24;
        if (n.y > height + 24) n.y = -24;
      });
      draw();
      rafId = requestAnimationFrame(step);
    };

    const start = () => {
      resize();
      initNodes();
      if (reduceMotion) {
        draw();
      } else {
        if (rafId) cancelAnimationFrame(rafId);
        step();
      }
    };

    logoImg.onload = start;
    logoImg.src = new URL("assets/logo-watermark.png", document.baseURI).href;
    if (logoImg.complete && logoImg.naturalWidth) start();
    window.addEventListener("resize", () => {
      resize();
      initNodes();
      draw();
    });
  }

  /* ---------- Cursor personalizado com a logo, substitui o mouse (desktop) ---------- */
  if (!reduceMotion && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    document.body.classList.add("has-custom-cursor");

    const cursor = document.createElement("div");
    cursor.className = "custom-cursor";
    cursor.innerHTML = '<img src="assets/logo.png" alt="">';
    document.body.appendChild(cursor);

    let mx = window.innerWidth / 2, my = window.innerHeight / 2, cx = mx, cy = my;

    window.addEventListener("mousemove", (e) => {
      mx = e.clientX;
      my = e.clientY;
    });

    const animateCursor = () => {
      cx += (mx - cx) * 0.2;
      cy += (my - cy) * 0.2;
      cursor.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
      requestAnimationFrame(animateCursor);
    };
    animateCursor();

    document.querySelectorAll("a, button, .gallery-card, .hero-person-bg").forEach((el) => {
      el.addEventListener("mouseenter", () => cursor.classList.add("is-active"));
      el.addEventListener("mouseleave", () => cursor.classList.remove("is-active"));
    });
  }

  /* ---------- Botão "Voltar ao topo" com anel de progresso ---------- */
  const backToTop = document.querySelector(".back-to-top");
  if (backToTop) {
    const circle = backToTop.querySelector("circle.progress");
    const radius = circle.r.baseVal.value;
    const circumference = 2 * Math.PI * radius;
    circle.style.strokeDasharray = `${circumference}`;

    const onScrollBtt = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? scrollTop / docHeight : 0;
      circle.style.strokeDashoffset = `${circumference * (1 - pct)}`;
      backToTop.classList.toggle("is-visible", scrollTop > 480);
    };
    window.addEventListener("scroll", onScrollBtt, { passive: true });
    window.addEventListener("resize", onScrollBtt);
    onScrollBtt();

    backToTop.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    });
  }

  /* ---------- Lightbox da galeria (construído dinamicamente, sem alterar o HTML da galeria) ---------- */
  const galleryCards = Array.from(document.querySelectorAll(".gallery-card"));
  if (galleryCards.length) {
    const items = galleryCards.map((card) => {
      const imgEl = card.querySelector(".gallery-img");
      const bg = imgEl ? imgEl.style.backgroundImage : "";
      const url = bg.replace(/^url\(["']?/, "").replace(/["']?\)$/, "");
      const title = card.querySelector("figcaption h3")?.textContent || "";
      const desc = card.querySelector("figcaption p")?.textContent || "";
      return { url, title, desc };
    });

    const overlay = document.createElement("div");
    overlay.className = "lightbox-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.innerHTML = `
      <button class="lightbox-close" aria-label="Fechar">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg>
      </button>
      <button class="lightbox-nav lightbox-prev" aria-label="Foto anterior">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
      <button class="lightbox-nav lightbox-next" aria-label="Próxima foto">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
      </button>
      <figure class="lightbox-figure">
        <img alt="">
        <figcaption class="lightbox-caption">
          <h3></h3>
          <p></p>
        </figcaption>
      </figure>`;
    document.body.appendChild(overlay);

    const imgTag = overlay.querySelector("img");
    const captionH3 = overlay.querySelector(".lightbox-caption h3");
    const captionP = overlay.querySelector(".lightbox-caption p");
    let currentIndex = 0;

    const openAt = (index) => {
      currentIndex = (index + items.length) % items.length;
      const item = items[currentIndex];
      if (!item.url) return;
      imgTag.src = item.url;
      imgTag.alt = item.title;
      captionH3.textContent = item.title;
      captionP.textContent = item.desc;
      overlay.classList.add("is-open");
      document.body.classList.add("no-scroll");
    };
    const closeLightbox = () => {
      overlay.classList.remove("is-open");
      document.body.classList.remove("no-scroll");
    };

    galleryCards.forEach((card, index) => {
      card.setAttribute("tabindex", "0");
      card.setAttribute("role", "button");
      card.setAttribute("aria-label", "Ampliar foto: " + (items[index].title || "galeria"));
      card.addEventListener("click", () => openAt(index));
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openAt(index);
        }
      });
    });

    overlay.querySelector(".lightbox-close").addEventListener("click", closeLightbox);
    overlay.querySelector(".lightbox-prev").addEventListener("click", () => openAt(currentIndex - 1));
    overlay.querySelector(".lightbox-next").addEventListener("click", () => openAt(currentIndex + 1));
    overlay.addEventListener("click", (e) => { if (e.target === overlay) closeLightbox(); });

    document.addEventListener("keydown", (e) => {
      if (!overlay.classList.contains("is-open")) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") openAt(currentIndex - 1);
      if (e.key === "ArrowRight") openAt(currentIndex + 1);
    });
  }
});
