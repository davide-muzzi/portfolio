(function () {
  const SELECTORS = {
    hero: '[data-animate="hero"]',
    animated: '[data-animate]'
  };
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointerQuery = window.matchMedia('(pointer: fine) and (hover: hover)');
  let intersectionObserver = null;

  const clamp = (value, min = 0, max = 1) => Math.min(Math.max(value, min), max);

  const observeMediaQuery = (query, handler) => {
    if (typeof query.addEventListener === 'function') {
      query.addEventListener('change', handler);
    } else if (typeof query.addListener === 'function') {
      query.addListener(handler);
    }
  };

  function applyStaggers() {
    const setDelay = (selector, step) => {
      document.querySelectorAll(selector).forEach((node, index) => {
        node.style.setProperty('--enter-delay', `${index * step}s`);
      });
    };

    setDelay('[data-animate="project"]', 0.1);
    setDelay('[data-animate="tech"]', 0.1);
    setDelay('[data-animate="stat"]', 0.1);
    setDelay('[data-animate="social"]', 0.1);
  }

  function initAnimations() {
    const nodes = document.querySelectorAll(SELECTORS.animated);
    if (!nodes.length) {
      return null;
    }

    if (prefersReducedMotion.matches) {
      nodes.forEach((node) => node.classList.add('is-visible'));
      return null;
    }

    const hero = document.querySelector(SELECTORS.hero);
    if (hero) {
      window.requestAnimationFrame(() => hero.classList.add('is-visible'));
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.2,
      rootMargin: '0px 0px -10% 0px'
    });

    nodes.forEach((node) => {
      if (node === hero) {
        return;
      }
      observer.observe(node);
    });

    return observer;
  }

  function initScrollSystems() {
    const progress = document.querySelector('.scroll-progress');
    const backToTop = document.querySelector('.back-to-top');
    let progressValue = 0;
    let progressTarget = 0;

    const updateMetrics = () => {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      progressTarget = scrollable <= 0 ? 0 : window.scrollY / scrollable;

      if (backToTop) {
        if (window.scrollY > 300) {
          backToTop.classList.add('is-visible');
        } else {
          backToTop.classList.remove('is-visible');
        }
      }
    };

    const render = () => {
      if (progress) {
        if (prefersReducedMotion.matches) {
          progressValue = progressTarget;
        } else {
          progressValue += (progressTarget - progressValue) * 0.15;
        }
        progress.style.transform = `scaleX(${clamp(progressValue)})`;
      }
      window.requestAnimationFrame(render);
    };

    window.addEventListener('scroll', updateMetrics, { passive: true });
    window.addEventListener('resize', updateMetrics);
    updateMetrics();
    render();

    if (backToTop) {
      backToTop.addEventListener('click', (event) => {
        event.preventDefault();
        backToTop.classList.add('is-pressed');
        window.setTimeout(() => backToTop.classList.remove('is-pressed'), 150);

        if (prefersReducedMotion.matches) {
          window.scrollTo({ top: 0 });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    }
  }

  function initCustomCursor() {
    const cursor = document.querySelector('.custom-cursor');
    const dot = cursor?.querySelector('.custom-cursor__dot');
    const ring = cursor?.querySelector('.custom-cursor__ring');
    if (!cursor || !dot || !ring) {
      return { refresh: () => {} };
    }

    const INTERACTIVE_SELECTOR = 'a, button, [role="button"], [data-cursor="interactive"], .project-card, .social-card, .stat-card, .back-to-top';
    let rafId = null;
    let enabled = false;
    const position = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const target = { ...position };

    const updateCursorState = (targetNode) => {
      const textTarget = targetNode?.closest('input, textarea, select, [contenteditable="true"]');
      const interactiveTarget = targetNode?.closest(INTERACTIVE_SELECTOR);

      document.body.classList.toggle('cursor-text', Boolean(textTarget));
      cursor.classList.toggle('is-hidden', Boolean(textTarget));
      cursor.classList.toggle('is-active', Boolean(interactiveTarget));
    };

    const animateCursor = () => {
      if (!enabled) {
        return;
      }
      const stiffness = 0.2;
      position.x += (target.x - position.x) * stiffness;
      position.y += (target.y - position.y) * stiffness;
      cursor.style.left = `${position.x}px`;
      cursor.style.top = `${position.y}px`;
      rafId = window.requestAnimationFrame(animateCursor);
    };

    const enable = () => {
      if (enabled || !finePointerQuery.matches || prefersReducedMotion.matches) {
        return;
      }
      enabled = true;
      document.body.classList.add('use-custom-cursor');
      cursor.classList.remove('is-hidden');
      cursor.classList.add('is-ready');
      animateCursor();
    };

    const disable = () => {
      if (!enabled) {
        return;
      }
      enabled = false;
      document.body.classList.remove('use-custom-cursor', 'cursor-text');
      cursor.classList.add('is-hidden');
      if (rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
    };

    document.addEventListener('pointermove', (event) => {
      if (!enabled) {
        enable();
      }
      target.x = event.clientX;
      target.y = event.clientY;
      cursor.classList.remove('is-hidden');
      updateCursorState(event.target);
    });

    document.addEventListener('pointerleave', () => {
      if (!enabled) {
        return;
      }
      cursor.classList.add('is-hidden');
      document.body.classList.remove('cursor-text');
    });

    document.addEventListener('touchstart', () => {
      disable();
    }, { passive: true });

    if (!finePointerQuery.matches || prefersReducedMotion.matches) {
      disable();
    }

    return {
      refresh: () => {
        if (!finePointerQuery.matches || prefersReducedMotion.matches) {
          disable();
        } else {
          enable();
        }
      }
    };
  }

  function handlePreferenceChanges(cursorController) {
    const refreshAll = () => {
      applyStaggers();
      if (intersectionObserver) {
        intersectionObserver.disconnect();
      }
      intersectionObserver = initAnimations();
      cursorController.refresh();
    };

    observeMediaQuery(prefersReducedMotion, refreshAll);
    observeMediaQuery(finePointerQuery, () => cursorController.refresh());
  }

  document.addEventListener('DOMContentLoaded', () => {
    applyStaggers();
    intersectionObserver = initAnimations();
    initScrollSystems();
    const cursorController = initCustomCursor();
    handlePreferenceChanges(cursorController);
  });
})();
