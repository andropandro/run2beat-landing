// Run2Beat landing page — minimal interactions
(() => {
    "use strict";

    // ---------- Google Analytics helpers ----------
    function track(eventName, params) {
        if (typeof window.gtag !== "function") return;
        window.gtag("event", eventName, params || {});
    }

    function appStorePlacement(el) {
        if (el.closest(".nav")) return "nav";
        if (el.closest(".hero")) return "hero";
        if (el.closest(".cta")) return "footer_cta";
        if (el.closest(".support")) return "support";
        return "other";
    }

    // ---------- Reveal-on-scroll ----------
    // Only apply the fade to elements that start below the initial viewport,
    // so the hero/first-section content is visible immediately.
    const candidateSelector =
        ".feature, .section, .cta, .badge, .tech-grid__item";
    const viewportH = window.innerHeight || 800;
    const revealTargets = [];

    document.querySelectorAll(candidateSelector).forEach((el) => {
        const top = el.getBoundingClientRect().top;
        if (top > viewportH * 0.85) {
            el.classList.add("reveal");
            revealTargets.push(el);
        }
    });

    if ("IntersectionObserver" in window) {
        const io = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("is-visible");
                        io.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.12, rootMargin: "0px 0px -60px 0px" }
        );
        revealTargets.forEach((el) => io.observe(el));
    } else {
        revealTargets.forEach((el) => el.classList.add("is-visible"));
    }

    // Safety net: ensure all content is visible after 4s no matter what.
    setTimeout(() => {
        document
            .querySelectorAll(".reveal:not(.is-visible)")
            .forEach((el) => el.classList.add("is-visible"));
    }, 4000);

    // ---------- Smooth scroll for in-page anchors ----------
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
        a.addEventListener("click", (e) => {
            const id = a.getAttribute("href").slice(1);
            if (!id) return;
            const target = document.getElementById(id);
            if (!target) return;
            e.preventDefault();
            target.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    });

    // ---------- Subtle parallax for ambient orbs ----------
    let ticking = false;
    const orbs = document.querySelectorAll(".ambient");
    window.addEventListener(
        "scroll",
        () => {
            if (ticking || orbs.length === 0) return;
            ticking = true;
            window.requestAnimationFrame(() => {
                const y = window.scrollY;
                orbs.forEach((orb, i) => {
                    const factor = i === 0 ? 0.15 : -0.1;
                    orb.style.transform = `translate3d(0, ${y * factor}px, 0)`;
                });
                ticking = false;
            });
        },
        { passive: true }
    );

    // ---------- App Store: iOS opens the store, QR dialog otherwise ----------
    function isIOS() {
        const ua = navigator.userAgent || "";
        // Classic iPhone / iPad / iPod
        if (/iPad|iPhone|iPod/.test(ua)) return true;
        // iPadOS 13+ reports as Mac; sniff out by touch support.
        if (/Mac/.test(ua) && navigator.maxTouchPoints > 1) return true;
        return false;
    }

    const dialog = document.getElementById("appstore-dialog");
    const appLinks = document.querySelectorAll(".js-appstore");
    const qrLinks = document.querySelectorAll(".js-qr");
    const onIOS = isIOS();

    // Track every App Store intent (iOS direct open + non-iOS QR path).
    appLinks.forEach((link) => {
        link.addEventListener("click", (e) => {
            const placement = appStorePlacement(link);
            const modified =
                e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1;

            if (onIOS || modified || !dialog) {
                track("app_store_click", {
                    method: "direct",
                    placement,
                    platform: onIOS ? "ios" : "other",
                });
                return;
            }

            // Non-iOS: intercept and show the QR dialog.
            e.preventDefault();
            track("app_store_click", {
                method: "qr_dialog",
                placement,
                platform: "other",
            });
            track("qr_open", { source: "app_store_non_ios", placement });
            if (typeof dialog.showModal === "function") {
                dialog.showModal();
            } else {
                window.open(link.href, "_blank", "noopener");
            }
        });
    });

    // Explicit "Show QR code" triggers always open the dialog.
    qrLinks.forEach((btn) => {
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            track("qr_open", {
                source: "qr_button",
                placement: appStorePlacement(btn),
            });
            if (dialog && typeof dialog.showModal === "function") {
                dialog.showModal();
            }
        });
    });

    if (dialog) {
        // Close on backdrop click
        dialog.addEventListener("click", (e) => {
            if (e.target === dialog) dialog.close();
        });

        // Close button
        dialog.querySelectorAll("[data-tf-close]").forEach((btn) => {
            btn.addEventListener("click", () => dialog.close());
        });

        // Copy link button
        const copyBtn = dialog.querySelector("[data-tf-copy]");
        const copyLabel = dialog.querySelector("[data-tf-copy-label]");
        const urlText = dialog.querySelector("#appstore-dialog-url");
        if (copyBtn && copyLabel && urlText) {
            copyBtn.addEventListener("click", async () => {
                const url = urlText.textContent.trim();
                track("app_store_copy_link", { link_url: url });
                try {
                    await navigator.clipboard.writeText(url);
                    copyLabel.textContent = "Copied";
                    copyBtn.classList.add("is-copied");
                } catch {
                    // Fallback: select the text so the user can copy manually.
                    const range = document.createRange();
                    range.selectNodeContents(urlText);
                    const sel = window.getSelection();
                    sel.removeAllRanges();
                    sel.addRange(range);
                    copyLabel.textContent = "Press ⌘C";
                }
                setTimeout(() => {
                    copyLabel.textContent = "Copy";
                    copyBtn.classList.remove("is-copied");
                }, 2200);
            });
        }
    }

    // ---------- Find music: source cards + deep-dive link ----------
    document.querySelectorAll(".source-card").forEach((card) => {
        card.addEventListener("click", () => {
            let destination = "other";
            if (card.classList.contains("source-card--soundcloud")) {
                destination = "soundcloud";
            } else if (card.classList.contains("source-card--bandcamp")) {
                destination = "bandcamp";
            } else if (card.classList.contains("source-card--fma")) {
                destination = "freemusicarchive";
            } else if (card.classList.contains("source-card--jamendo")) {
                destination = "jamendo";
            }
            track("find_music_click", {
                destination,
                link_url: card.href || "",
            });
        });
    });

    document.querySelectorAll('a[href="find-music.html"]').forEach((a) => {
        a.addEventListener("click", () => {
            track("find_music_click", {
                destination: "deep_dive",
                link_url: a.href,
            });
        });
    });
})();
