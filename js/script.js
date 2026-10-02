/* ==========================================================================
   KDSV — site script
   Nav + lazy-load are plain vanilla JS and always run.
   Motion (Lenis / GSAP / ScrollTrigger) is progressive enhancement: it is
   skipped entirely if the libraries fail to load or the user prefers
   reduced motion, and the pinned showcase only activates on desktop.
   ========================================================================== */

(function () {
    "use strict";

    /* ---------------------------------------------------------------------
       Mobile nav toggle
       ------------------------------------------------------------------- */
    var navToggle = document.querySelector(".nav-toggle");
    var navLinks = document.querySelectorAll(".nav__link");

    function closeNav() {
        document.body.classList.remove("nav-open");
        if (navToggle) navToggle.setAttribute("aria-expanded", "false");
    }

    if (navToggle) {
        navToggle.setAttribute("aria-expanded", "false");
        navToggle.addEventListener("click", function () {
            var isOpen = document.body.classList.toggle("nav-open");
            navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
        });
    }

    navLinks.forEach(function (link) {
        link.addEventListener("click", closeNav);
    });

    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") closeNav();
    });

    /* ---------------------------------------------------------------------
       Lazy-load images
       ------------------------------------------------------------------- */
    var lazyImages = document.querySelectorAll("img[data-src]");

    if ("IntersectionObserver" in window) {
        var imageObserver = new IntersectionObserver(function (entries, observer) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                var img = entry.target;
                img.src = img.dataset.src;
                img.removeAttribute("data-src");
                observer.unobserve(img);
            });
        }, { rootMargin: "500px 0px" });

        lazyImages.forEach(function (img) { imageObserver.observe(img); });
    } else {
        lazyImages.forEach(function (img) {
            img.src = img.dataset.src;
            img.removeAttribute("data-src");
        });
    }

    /* ---------------------------------------------------------------------
       Page-to-page transition overlay
       Degrades safely: with JS disabled the overlay stays hidden (CSS
       default opacity:0), so navigation is a normal instant page load.
       ------------------------------------------------------------------- */
    var overlay = document.getElementById("pageTransition");

    // Cross-document View Transitions (see the end of style.css) replace the
    // overlay fade wherever the browser supports them.
    var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var nativePageTransitions = "CSSViewTransitionRule" in window && !reduceMotion;

    if (nativePageTransitions) {
        // The case-page hero carries view-transition-name "case-media". On the
        // outgoing page, give that name to the image of the case being opened
        // so it morphs into the new hero; clear it from an off-screen hero so
        // it doesn't swoop in from above the viewport.
        var lastLink = null;
        document.addEventListener("click", function (e) {
            lastLink = e.target.closest ? e.target.closest("a[href]") : null;
        }, true);

        window.addEventListener("pageswap", function (e) {
            if (!e.viewTransition) return;
            var ownHero = document.querySelector(".case-hero__visual");
            if (ownHero) {
                var r = ownHero.getBoundingClientRect();
                if (r.bottom < 0 || r.top > window.innerHeight) ownHero.style.viewTransitionName = "none";
            }
            if (!lastLink || !/cases\//.test(lastLink.getAttribute("href") || "")) return;
            var card = lastLink.closest(".showcase__case");
            var media = card ? card.querySelector(".showcase__img") : lastLink.querySelector("img");
            if (media && !ownHero) media.style.viewTransitionName = "case-media";
        });
    }

    if (overlay && !nativePageTransitions) {
        var TRANSITION_MS = 420;

        // Fade the "arrival" cover out (only present if the previous page set it).
        window.requestAnimationFrame(function () {
            overlay.style.transition = "opacity 520ms ease";
            overlay.style.opacity = "0";
            overlay.style.pointerEvents = "none";
        });

        window.addEventListener("pageshow", function (e) {
            // Back/forward cache restore: never leave the page stuck under the cover.
            if (e.persisted) {
                overlay.style.transition = "none";
                overlay.style.opacity = "0";
                overlay.style.pointerEvents = "none";
            }
        });

        var origin = window.location.origin;
        var anchors = document.querySelectorAll("a[href]");

        anchors.forEach(function (link) {
            var href = link.getAttribute("href");
            if (!href) return;
            if (href.charAt(0) === "#") return;
            if (href.indexOf("mailto:") === 0 || href.indexOf("tel:") === 0) return;
            if (link.target && link.target !== "_self") return;
            if (link.hasAttribute("download")) return;
            if (/^https?:\/\//i.test(href) && href.indexOf(origin) !== 0) return;

            link.addEventListener("click", function (e) {
                if (e.defaultPrevented) return;
                if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

                e.preventDefault();
                overlay.style.transition = "opacity " + TRANSITION_MS + "ms ease";
                overlay.style.opacity = "1";
                overlay.style.pointerEvents = "auto";

                try { sessionStorage.setItem("kdsv-nav", "1"); } catch (err) { /* ignore */ }

                window.setTimeout(function () {
                    window.location.href = href;
                }, TRANSITION_MS);
            });
        });
    }

    /* ---------------------------------------------------------------------
       Header: solid once the dark hero has scrolled out of view
       ------------------------------------------------------------------- */
    var header = document.querySelector(".site-header");
    var heroEl = document.querySelector(".hero, .case-hero");

    var pastHero = false;
    var scrolled = false;
    var activeDarkEls = [];

    function updateHeaderTone() {
        if (!header) return;
        // Once the page moves, hero text starts sliding under the still
        // transparent header — give it the dark fill while over the hero.
        var onDark = activeDarkEls.length > 0 || (scrolled && !pastHero);
        header.classList.toggle("site-header--on-dark", onDark);
        header.classList.toggle("site-header--solid", pastHero && !onDark);
    }

    if (header && heroEl && "IntersectionObserver" in window) {
        var headerObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                pastHero = !entry.isIntersecting;
            });
            updateHeaderTone();
        }, { rootMargin: "0px 0px -88% 0px" });
        headerObserver.observe(heroEl);

        window.addEventListener("scroll", function () {
            var next = window.scrollY > 24;
            if (next !== scrolled) {
                scrolled = next;
                updateHeaderTone();
            }
        }, { passive: true });

        // Secondary dark sections further down the page (contact block, case
        // CTA) need the header to switch to a dark-on-dark treatment instead
        // of the paper "solid" state, so it never renders as a stray light
        // bar over a black section.
        var darkSections = document.querySelectorAll(".section--dark");
        if (darkSections.length) {
            var darkObserver = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    var idx = activeDarkEls.indexOf(entry.target);
                    if (entry.isIntersecting && idx === -1) {
                        activeDarkEls.push(entry.target);
                    } else if (!entry.isIntersecting && idx !== -1) {
                        activeDarkEls.splice(idx, 1);
                    }
                });
                updateHeaderTone();
            }, { rootMargin: "0px 0px -88% 0px" });
            darkSections.forEach(function (el) { darkObserver.observe(el); });
        }
    } else if (header) {
        header.classList.add("site-header--solid");
    }

    /* ---------------------------------------------------------------------
       Motion layer — GSAP / ScrollTrigger / Lenis
       ------------------------------------------------------------------- */
    var prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var hasMotionLibs = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";

    if (prefersReduced || !hasMotionLibs) {
        // Reveal everything statically — no scroll-jack, no stagger, no parallax.
        document.querySelectorAll("[data-reveal]").forEach(function (el) {
            el.classList.add("is-revealed");
        });
        return;
    }

    var gsap = window.gsap;
    var ScrollTrigger = window.ScrollTrigger;
    gsap.registerPlugin(ScrollTrigger);

    // Smooth inertia scrolling (skipped on touch by Lenis' own defaults).
    if (typeof window.Lenis !== "undefined") {
        // The CSS `scroll-behavior: smooth` on <html> (kept as the anchor-jump
        // fallback for reduced-motion/no-JS, where Lenis never runs) fights
        // Lenis once it IS running: Lenis calls scrollTo() on every animation
        // frame, and the browser tries to re-animate each of those calls with
        // its own native smooth-scroll easing on top of Lenis' easing. The
        // two compounding animations make real scroll input translate into
        // only a fraction of the actual page movement — measured at roughly
        // 0.3x (scroll 100px, page moves ~30px) with both active, vs. ~1.0x
        // with native smoothing turned off here. Lenis owns scroll easing
        // from this point on, so hand it off cleanly.
        document.documentElement.style.scrollBehavior = "auto";

        var lenis = new window.Lenis({
            duration: 1.05,
            smoothWheel: true
        });

        lenis.on("scroll", ScrollTrigger.update);
        gsap.ticker.add(function (time) {
            lenis.raf(time * 1000);
        });
        gsap.ticker.lagSmoothing(0);

        // Route same-page anchor links through Lenis so in-page nav scrolls
        // with the same inertia as the rest of the page (avoids double
        // smoothing against the CSS `scroll-behavior: smooth` fallback).
        document.querySelectorAll('a[href^="#"]').forEach(function (link) {
            var hash = link.getAttribute("href");
            if (!hash || hash === "#") return;
            link.addEventListener("click", function (e) {
                var target = document.querySelector(hash);
                if (!target) return;
                e.preventDefault();
                lenis.scrollTo(target, { duration: 1.1 });
            });
        });
    }

    /* ---- Hero entrance: staggered word reveal + scroll parallax ---- */
    var hero = document.querySelector(".hero");
    if (hero) {
        var words = hero.querySelectorAll(".hero__title .word");
        var heroBits = [
            hero.querySelector(".hero__eyebrow"),
            hero.querySelector(".hero__subtitle"),
            hero.querySelector(".hero__tagline"),
            hero.querySelector(".hero__actions")
        ].filter(Boolean);

        var tl = gsap.timeline({ defaults: { ease: "power3.out" } });
        if (words.length) {
            tl.from(words, { yPercent: 120, opacity: 0, duration: 0.9, stagger: 0.045 }, 0.15);
        }
        tl.from(heroBits, { y: 22, opacity: 0, duration: 0.8, stagger: 0.08 }, 0.5);

        // Project stack: cards rise in one after another, then drift at
        // different speeds while the hero scrolls away. Parallax goes through
        // the --py custom property so the CSS tilt and hover transforms keep
        // working (an inline GSAP transform would override them).
        var shots = hero.querySelectorAll(".hero__shot");
        if (shots.length) {
            tl.from(shots, {
                y: 70,
                opacity: 0,
                duration: 1.1,
                stagger: 0.12,
                clearProps: "transform,opacity"
            }, 0.35);

            var drift = [-30, -70, -120];
            shots.forEach(function (shot, i) {
                gsap.to(shot, {
                    "--py": drift[i % drift.length] + "px",
                    ease: "none",
                    scrollTrigger: {
                        trigger: hero,
                        start: "top top",
                        end: "bottom top",
                        scrub: true
                    }
                });
            });
        }
    }

    /* ---- Case hero visual: gentle reveal + drift on load ---- */
    var caseHero = document.querySelector(".case-hero");
    if (caseHero) {
        var chIndex = caseHero.querySelector(".case-hero__index");
        var chTitle = caseHero.querySelectorAll(".case-hero__title .word");
        var chBits = [
            caseHero.querySelector(".case-hero__description"),
            caseHero.querySelector(".case-hero__tags")
        ].filter(Boolean);
        var chVisual = caseHero.querySelector(".case-hero__visual");

        var chTl = gsap.timeline({ defaults: { ease: "power3.out" } });
        if (chIndex) chTl.from(chIndex, { y: 16, opacity: 0, duration: 0.6 }, 0);
        if (chTitle.length) chTl.from(chTitle, { yPercent: 120, opacity: 0, duration: 0.85, stagger: 0.04 }, 0.1);
        chTl.from(chBits, { y: 18, opacity: 0, duration: 0.7, stagger: 0.08 }, 0.4);
        var arrivedByMorph = nativePageTransitions && document.referrer.indexOf(window.location.origin) === 0;
        if (chVisual && !arrivedByMorph) chTl.from(chVisual, { y: 40, opacity: 0, duration: 0.9 }, 0.35);

        if (chVisual) {
            gsap.to(chVisual, {
                yPercent: -4,
                ease: "none",
                scrollTrigger: { trigger: caseHero, start: "top top", end: "bottom top", scrub: true }
            });
        }
    }

    /* ---- Generic scroll reveals (batched) ---- */
    var revealEls = gsap.utils.toArray("[data-reveal]");
    if (revealEls.length) {
        ScrollTrigger.batch(revealEls, {
            start: "top 86%",
            onEnter: function (batch) {
                batch.forEach(function (el) { el.classList.add("is-revealed"); });
            },
            once: true
        });
    }

    /* ---- Facts: count up to the number already in the markup ---- */
    document.querySelectorAll("[data-countup]").forEach(function (el) {
        var target = parseInt(el.getAttribute("data-countup"), 10) || 0;
        ScrollTrigger.create({
            trigger: el,
            start: "top 92%",
            once: true,
            onEnter: function () {
                var obj = { v: 0 };
                gsap.to(obj, {
                    v: target,
                    duration: target > 20 ? 1.6 : 1.1,
                    ease: "power2.out",
                    onUpdate: function () { el.textContent = Math.round(obj.v); }
                });
            }
        });
    });

    /* ---- Process: the line fills with scroll and lights up each step ---- */
    var stepsWrap = document.querySelector("[data-steps]");
    if (stepsWrap) {
        var stepItems = stepsWrap.querySelectorAll(".steps__item");
        var stepsTrack = stepsWrap.querySelector(".steps__track");
        var stepEdges = [];
        stepsWrap.classList.add("is-animated");
        stepsWrap.style.setProperty("--progress", "0");

        // Where along the line (0–1) the fill first touches each number
        // circle: its left edge on the horizontal desktop row, its top edge
        // on the vertical mobile list. Circles sit at the start of each
        // column, not at even quarters, so even spacing lit them late.
        function measureStepEdges() {
            var t = stepsTrack.getBoundingClientRect();
            var vertical = t.height > t.width;
            stepEdges = Array.prototype.map.call(stepItems, function (item) {
                var n = item.querySelector(".steps__num").getBoundingClientRect();
                return vertical ? (n.top - t.top) / t.height : (n.left - t.left) / t.width;
            });
        }

        function paintSteps(progress) {
            stepsWrap.style.setProperty("--progress", progress.toFixed(4));
            stepItems.forEach(function (item, i) {
                item.classList.toggle("is-active", progress > Math.max(stepEdges[i], 0));
            });
        }

        measureStepEdges();
        ScrollTrigger.create({
            trigger: stepsWrap,
            start: "top 80%",
            // The horizontal (desktop) row is short, so give it a longer
            // scroll distance to fill over; the vertical mobile list is tall
            // enough to track its own height.
            end: function () { return window.innerWidth > 900 ? "top 25%" : "bottom 55%"; },
            invalidateOnRefresh: true,
            onRefresh: function (self) {
                measureStepEdges();
                paintSteps(self.progress);
            },
            onUpdate: function (self) {
                paintSteps(self.progress);
            }
        });
    }

    /* ---- Count-up index numbers ----
       The markup already ships the real final number as its text content
       (so reduced-motion and no-JS users see "01"-"04", never a "00"
       placeholder). Read that value as the animation target instead of
       treating the DOM as blank, then animate up to it from zero. */
    var counters = document.querySelectorAll("[data-count]");
    counters.forEach(function (el) {
        var target = parseInt(el.textContent, 10);
        if (!isFinite(target)) target = parseInt(el.getAttribute("data-count"), 10) || 0;
        ScrollTrigger.create({
            trigger: el,
            start: "top 90%",
            once: true,
            onEnter: function () {
                var counterObj = { v: 0 };
                gsap.to(counterObj, {
                    v: target,
                    duration: 0.7,
                    ease: "power1.out",
                    onUpdate: function () {
                        el.textContent = String(Math.round(counterObj.v)).padStart(2, "0");
                    }
                });
            }
        });
    });

    /* ---- Pinned case showcase (desktop only, progressive enhancement) ---- */
    var stage = document.querySelector("[data-showcase]");
    if (stage) {
        ScrollTrigger.matchMedia({
            "(min-width: 901px)": function () {
                var cases = stage.querySelectorAll(".showcase__case");
                if (cases.length < 2) return;

                stage.classList.add("is-pinned");
                cases[0].classList.add("is-active");
                cases.forEach(function (el, i) { el.toggleAttribute("inert", i !== 0); });

                // Each case gets an equal, undivided share of the scrub —
                // (cases.length - 1) * 100% total gives every case ~1
                // viewport-height's worth of dwell (~600-700px in practice),
                // instead of the previous scheme which appended a whole
                // extra segment onto the last case alone (1500px vs 600px).
                var st = ScrollTrigger.create({
                    trigger: stage,
                    start: "top top",
                    end: "+=" + (cases.length - 1) * 100 + "%",
                    pin: true,
                    scrub: true,
                    onUpdate: function (self) {
                        var idx = Math.min(cases.length - 1, Math.floor(self.progress * cases.length));
                        cases.forEach(function (el, i) {
                            var active = i === idx;
                            el.classList.toggle("is-active", active);
                            // Inactive panels sit at opacity:0 — keep their
                            // "Смотреть кейс" link out of the tab order while
                            // hidden so focus never lands on an invisible
                            // element (WCAG 2.4.7).
                            el.toggleAttribute("inert", !active);
                        });
                    }
                });

                return function () {
                    stage.classList.remove("is-pinned");
                    cases.forEach(function (el) {
                        el.classList.remove("is-active");
                        el.removeAttribute("inert");
                    });
                    st.kill();
                };
            }
        });
    }

    // The showcase pin above is created last but adds ~2 viewports of
    // pin-spacer to the middle of the page. Triggers created earlier for
    // content below it (process line, reveals) were measured without that
    // height and fired far too early; re-sort into page order and re-measure.
    ScrollTrigger.sort();
    ScrollTrigger.refresh();
})();
