/* =========================================================================
   INETRIS — Interações do site público
   ========================================================================= */

document.addEventListener("DOMContentLoaded", () => {

  /* ---------- Ano automático no rodapé ---------- */
  const anoEl = document.getElementById("ano");
  if (anoEl) anoEl.textContent = new Date().getFullYear();

  /* ---------- Menu mobile ---------- */
  const navToggle = document.getElementById("nav-toggle");
  const mainNav = document.getElementById("main-nav");

  if (navToggle && mainNav) {
    navToggle.addEventListener("click", () => {
      const isOpen = mainNav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
      navToggle.classList.toggle("is-active", isOpen);
      document.body.classList.toggle("no-scroll", isOpen); // AJUSTE
    });

    // Fecha o menu ao clicar em um link (útil no mobile)
    mainNav.querySelectorAll(".nav-link").forEach((link) => {
      link.addEventListener("click", () => {
        mainNav.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
        navToggle.classList.remove("is-active"); // AJUSTE
        document.body.classList.remove("no-scroll"); // AJUSTE
      });
    });
  }

  /* ---------- Header com sombra ao rolar a página ---------- */
  const header = document.querySelector(".site-header");
  const onScroll = () => {
    if (window.scrollY > 12) {
      header.style.boxShadow = "0 12px 30px -18px rgba(0,0,0,0.5)";
    } else {
      header.style.boxShadow = "none";
    }
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Barra de progresso de rolagem ---------- */
  const progressBar = document.getElementById("scroll-progress-bar");
  if (progressBar) {
    const updateProgress = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      progressBar.style.width = pct + "%";
    };
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
    updateProgress();
  }

  /* ---------- Indicador deslizante do menu (magic line) ---------- */
  const navMagic = document.getElementById("nav-magic");
  const navUl = document.querySelector(".main-nav ul");
  if (navMagic && navUl) {
    let isHoveringNav = false;
    const moveMagicTo = (link) => {
      const ulRect = navUl.getBoundingClientRect();
      const linkRect = link.getBoundingClientRect();
      navMagic.style.left = (linkRect.left - ulRect.left) + "px";
      navMagic.style.width = linkRect.width + "px";
    };
    const activeLink = () => navUl.querySelector(".nav-link.is-active");

    navUl.querySelectorAll(".nav-link").forEach((link) => {
      link.addEventListener("mouseenter", () => {
        isHoveringNav = true;
        navMagic.classList.add("is-active");
        moveMagicTo(link);
      });
    });
    navUl.addEventListener("mouseleave", () => {
      isHoveringNav = false;
      const active = activeLink();
      if (active) moveMagicTo(active);
      else navMagic.classList.remove("is-active");
    });

    const syncMagicToActive = () => {
      if (isHoveringNav) return;
      const active = activeLink();
      if (active) {
        navMagic.classList.add("is-active");
        moveMagicTo(active);
      }
    };
    setInterval(syncMagicToActive, 400);
    window.addEventListener("resize", syncMagicToActive);
  }

  /* ---------- Brilho de cursor + leve paralaxe no Hero ---------- */
  const heroSection = document.querySelector(".hero");
  const heroSpotlight = document.getElementById("hero-spotlight");
  const heroParallax = document.getElementById("hero-parallax");
  const reduceMotionGlobal = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (heroSection && !reduceMotionGlobal) {
    heroSection.addEventListener("mousemove", (e) => {
      const rect = heroSection.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (heroSpotlight) {
        heroSpotlight.style.setProperty("--x", x + "px");
        heroSpotlight.style.setProperty("--y", y + "px");
      }
      if (heroParallax && window.innerWidth > 860) {
        const relX = (x / rect.width - 0.5) * 2;
        const relY = (y / rect.height - 0.5) * 2;
        heroParallax.style.transform = `translate(${relX * -6}px, ${relY * -6}px)`;
      }
    });
    heroSection.addEventListener("mouseleave", () => {
      if (heroParallax) heroParallax.style.transform = "translate(0, 0)";
    });
  }

  /* ---------- Botões magnéticos (seguem levemente o cursor) ---------- */
  if (!reduceMotionGlobal) {
    document.querySelectorAll(".btn-magnetic").forEach((btn) => {
      btn.addEventListener("mousemove", (e) => {
        const rect = btn.getBoundingClientRect();
        const relX = e.clientX - rect.left - rect.width / 2;
        const relY = e.clientY - rect.top - rect.height / 2;
        btn.style.transform = `translate(${relX * 0.18}px, ${relY * 0.28}px) translateY(-3px)`;
      });
      btn.addEventListener("mouseleave", () => {
        btn.style.transform = "";
      });
    });
  }

  /* ---------- Inclinação 3D sutil nos cards ao passar o mouse ---------- */
  if (!reduceMotionGlobal && window.matchMedia("(hover: hover)").matches) {
    const tiltSelectors = ".problem-card, .solution-card, .testimonial-card, .contact-card, .feature-panel, .blueprint-card";
    document.querySelectorAll(tiltSelectors).forEach((card) => {
      card.classList.add("tilt-card");
      card.addEventListener("mousemove", (e) => {
        const rect = card.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width;
        const py = (e.clientY - rect.top) / rect.height;
        const rotateY = (px - 0.5) * 8;
        const rotateX = (0.5 - py) * 8;
        card.style.transform = `perspective(700px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-7px)`;
      });
      card.addEventListener("mouseleave", () => {
        card.style.transform = "";
      });
    });
  }

  /* ---------- Animação de revelar elementos ao rolar (.reveal), com atraso
     escalonado (stagger) quando o elemento faz parte de uma grade ---------- */
  const revealEls = document.querySelectorAll(".reveal");
  const staggerParentSelectors = ".cards-grid, .gallery-grid, .testimonials-grid, .contact-grid";

  revealEls.forEach((el) => {
    const staggerParent = el.closest(staggerParentSelectors);
    if (staggerParent) {
      const siblings = Array.from(staggerParent.children).filter((c) => c.classList.contains("reveal"));
      const index = siblings.indexOf(el);
      if (index > -1) el.style.setProperty("--delay", `${Math.min(index, 6) * 90}ms`);
    }
  });

  if ("IntersectionObserver" in window && revealEls.length) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach((el) => observer.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  }

  /* ---------- Constelação animada no Hero (assinatura visual, ecoa a
     marca do INETRIS: nós conectados por linhas) ---------- */
  const canvas = document.querySelector(".hero-constellation");
  if (canvas) {
    const ctx = canvas.getContext("2d");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width, height, nodes, dpr;

    const rand = (min, max) => Math.random() * (max - min) + min;

    const setup = () => {
      const rect = canvas.parentElement.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = width < 640 ? 26 : width < 1100 ? 38 : 52;
      nodes = Array.from({ length: count }, () => ({
        x: rand(0, width),
        y: rand(0, height),
        vx: rand(-0.12, 0.12),
        vy: rand(-0.1, 0.1),
        r: rand(1.1, 2.6),
        gold: Math.random() < 0.16,
      }));
    };

    const linkDist = 150;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < linkDist) {
            ctx.strokeStyle = `rgba(233, 150, 16, ${0.16 * (1 - dist / linkDist)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      nodes.forEach((n) => {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = n.gold ? "rgba(244, 198, 107, 0.85)" : "rgba(255, 255, 255, 0.55)";
        ctx.fill();

        if (!reduceMotion) {
          n.x += n.vx;
          n.y += n.vy;
          if (n.x < -20) n.x = width + 20;
          if (n.x > width + 20) n.x = -20;
          if (n.y < -20) n.y = height + 20;
          if (n.y > height + 20) n.y = -20;
        }
      });
    };

    let rafId;
    const loop = () => {
      draw();
      if (!reduceMotion) rafId = requestAnimationFrame(loop);
    };

    setup();
    if (reduceMotion) {
      draw();
    } else {
      loop();
    }

    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        cancelAnimationFrame(rafId);
        setup();
        if (reduceMotion) draw(); else loop();
      }, 200);
    });
  }

  /* ---------- Contadores animados na seção de Resultados ---------- */
  const statNumbers = document.querySelectorAll(".stat-number[data-count]");
  const animateCount = (el) => {
    const target = parseInt(el.dataset.count, 10) || 0;
    const duration = 1400;
    const start = performance.now();

    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.floor(eased * target);
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = target;
      }
    };
    requestAnimationFrame(step);
  };

  if ("IntersectionObserver" in window && statNumbers.length) {
    const statObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCount(entry.target);
            statObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.4 }
    );
    statNumbers.forEach((el) => statObserver.observe(el));
  } else {
    statNumbers.forEach((el) => (el.textContent = el.dataset.count));
  }

});
