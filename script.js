/* ══════════════════════════════════════════════
   NAVIGATION — Mobile Menu
   ══════════════════════════════════════════════ */
const header = document.querySelector('.header');
const navToggle = document.querySelector('.nav-toggle');
const navLinks = document.querySelector('.nav-links');
let savedScrollY = 0;

function openMenu() {
  savedScrollY = window.scrollY;
  navLinks.classList.add('open');
  navToggle.classList.add('active');
  navToggle.setAttribute('aria-expanded', 'true');
  navToggle.setAttribute('aria-label', 'Close navigation');
  document.body.classList.add('nav-open');
  document.body.style.top = '-' + savedScrollY + 'px';
}

function closeMenu() {
  navLinks.classList.remove('open');
  navToggle.classList.remove('active');
  navToggle.setAttribute('aria-expanded', 'false');
  navToggle.setAttribute('aria-label', 'Open navigation');
  document.body.classList.remove('nav-open');
  document.body.style.top = '';
  window.scrollTo(0, savedScrollY);
  savedScrollY = 0;
}

function isMenuOpen() {
  return navLinks.classList.contains('open');
}

navToggle.addEventListener('click', function () {
  if (isMenuOpen()) {
    closeMenu();
  } else {
    openMenu();
  }
});

/* Close menu on any nav link click — uses event delegation for reliability */
navLinks.addEventListener('click', function (e) {
  const link = e.target.closest('a');
  if (!link) return;
  closeMenu();
});

/* Close menu on logo click */
document.querySelector('.logo').addEventListener('click', function (e) {
  if (isMenuOpen()) {
    e.preventDefault();
    closeMenu();
  }
});

/* Close menu on resize if screen becomes wider than mobile breakpoint */
window.addEventListener('resize', function () {
  if (isMenuOpen() && window.innerWidth > 820) {
    closeMenu();
  }
});

/* Close menu on Escape key */
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && isMenuOpen()) {
    closeMenu();
    navToggle.focus();
  }
});

/* ══════════════════════════════════════════════
   HEADER — Scroll shadow
   ══════════════════════════════════════════════ */
window.addEventListener('scroll', function () {
  header.classList.toggle('scrolled', window.scrollY > 30);
}, { passive: true });

/* ══════════════════════════════════════════════
   REVEAL — Intersection Observer
   ══════════════════════════════════════════════ */
const observer = new IntersectionObserver(function (entries) {
  entries.forEach(function (entry) {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach(function (el) {
  observer.observe(el);
});

/* ══════════════════════════════════════════════
   PORTFOLIO — Filters
   ══════════════════════════════════════════════ */
const filters = document.querySelectorAll('.filter');
const projects = document.querySelectorAll('.project');
filters.forEach(function (filter) {
  filter.addEventListener('click', function () {
    filters.forEach(function (btn) { btn.classList.remove('active'); });
    filter.classList.add('active');
    var selected = filter.dataset.filter;
    projects.forEach(function (project) {
      project.classList.toggle('hidden', selected !== 'all' && project.dataset.category !== selected);
    });
  });
});

/* ══════════════════════════════════════════════
   TESTIMONIALS — Slider
   ══════════════════════════════════════════════ */
var testimonials = Array.from(document.querySelectorAll('.testimonial'));
var dotsWrap = document.querySelector('.slider-dots');
var currentSlide = 0;
var autoSlide;

testimonials.forEach(function (_, index) {
  var dot = document.createElement('button');
  dot.setAttribute('aria-label', 'Show testimonial ' + (index + 1));
  dot.addEventListener('click', function () { showSlide(index); });
  dotsWrap.appendChild(dot);
});
var dots = Array.from(dotsWrap.children);

function showSlide(index) {
  currentSlide = (index + testimonials.length) % testimonials.length;
  testimonials.forEach(function (item, i) {
    item.classList.toggle('active', i === currentSlide);
  });
  dots.forEach(function (dot, i) {
    dot.classList.toggle('active', i === currentSlide);
  });
}

function startSlider() {
  clearInterval(autoSlide);
  autoSlide = setInterval(function () { showSlide(currentSlide + 1); }, 6500);
}

document.querySelector('.slider-btn.next').addEventListener('click', function () {
  showSlide(currentSlide + 1);
  startSlider();
});
document.querySelector('.slider-btn.prev').addEventListener('click', function () {
  showSlide(currentSlide - 1);
  startSlider();
});
showSlide(0);
startSlider();

/* ══════════════════════════════════════════════
   FAQ — Accordion
   ══════════════════════════════════════════════ */
document.querySelectorAll('.faq-item button').forEach(function (button) {
  button.addEventListener('click', function () {
    var item = button.parentElement;
    var wasActive = item.classList.contains('active');
    document.querySelectorAll('.faq-item').forEach(function (faq) {
      faq.classList.remove('active');
    });
    if (!wasActive) item.classList.add('active');
  });
});

/* ══════════════════════════════════════════════
   CONTACT — Form → Mailto
   ══════════════════════════════════════════════ */
document.getElementById('contactForm').addEventListener('submit', function (event) {
  event.preventDefault();
  var data = new FormData(event.currentTarget);
  var subject = encodeURIComponent('Project Request — ' + data.get('service'));
  var body = encodeURIComponent(
    'Hello Adem Digital,\n\n' +
    'My name is ' + data.get('name') + '.\n' +
    'Email: ' + data.get('email') + '\n' +
    'Service needed: ' + data.get('service') + '\n\n' +
    'Project details:\n' + data.get('message') + '\n\n' +
    'Thank you.'
  );
  document.getElementById('formNote').textContent = 'Opening your email app…';
  window.location.href = 'mailto:dmheddi@gmail.com?subject=' + subject + '&body=' + body;
});

/* ══════════════════════════════════════════════
   FOOTER — Year
   ══════════════════════════════════════════════ */
document.getElementById('year').textContent = new Date().getFullYear();
