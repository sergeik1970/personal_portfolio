const navToggle = document.querySelector(".nav-toggle")
const navLinks = document.querySelectorAll(".nav__link")

navToggle.addEventListener("click", () => {
    document.body.classList.toggle("nav-open");
});

navLinks.forEach(link => {
    link.addEventListener("click", () => {
        document.body.classList.remove("nav-open");
    });
});

const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            img.removeAttribute("data-src");
            observer.unobserve(img);
        }
    });
}, {
    rootMargin: "9999px"
});

document.querySelectorAll("img[data-src]").forEach(img => {
    imageObserver.observe(img);
});

class HobbiesGallery {
    constructor() {
        this.gallery = document.querySelector(".hobbies__gallery");
        this.items = document.querySelectorAll(".hobbies__item");
        this.prevBtn = document.querySelector(".hobbies__btn--prev");
        this.nextBtn = document.querySelector(".hobbies__btn--next");
        
        this.currentIndex = 0;

        if (this.items.length > 0) {
            this.init();
        }
    }

    init() {
        this.attachEventListeners();
        this.updateDisplay();
    }

    attachEventListeners() {
        this.prevBtn.addEventListener("click", () => this.prev());
        this.nextBtn.addEventListener("click", () => this.next());
    }

    next() {
        this.currentIndex = (this.currentIndex + 1) % this.items.length;
        this.updateDisplay();
    }

    prev() {
        this.currentIndex = (this.currentIndex - 1 + this.items.length) % this.items.length;
        this.updateDisplay();
    }

    updateDisplay() {
        const screenWidth = window.innerWidth;
        let itemsPerPage = 1;

        if (screenWidth >= 600 && screenWidth < 901) {
            itemsPerPage = 2;
        } else if (screenWidth >= 901) {
            itemsPerPage = 3;
        }

        const offset = -this.currentIndex * (100 / itemsPerPage);
        this.gallery.style.transform = `translateY(${offset}%)`;
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
        new HobbiesGallery();
    });
} else {
    new HobbiesGallery();
}

window.addEventListener("resize", () => {
    const gallery = new HobbiesGallery();
    gallery.currentIndex = 0;
    gallery.updateDisplay();
});