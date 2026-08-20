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

  /* ---------- Cursor premium (só desktop com mouse de precisão) ---------- */
  if (!reduceMotion && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    document.body.classList.add("has-premium-cursor");

    const glow = document.createElement("div");
    glow.className = "cursor-glow";
    const ring = document.createElement("div");
    ring.className = "cursor-ring";
    document.body.append(glow, ring);

    let mx = window.innerWidth / 2, my = window.innerHeight / 2, rx = mx, ry = my;

    window.addEventListener("mousemove", (e) => {
      mx = e.clientX;
      my = e.clientY;
      glow.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
    });

    const animateRing = () => {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
      requestAnimationFrame(animateRing);
    };
    animateRing();

    const attachHoverTargets = () => {
      document.querySelectorAll("a, button, .gallery-card").forEach((el) => {
        el.addEventListener("mouseenter", () => ring.classList.add("is-active"));
        el.addEventListener("mouseleave", () => ring.classList.remove("is-active"));
      });
    };
    attachHoverTargets();
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
