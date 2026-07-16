const header = document.querySelector('.header');
const navToggle = document.querySelector('.nav-toggle');
const navLinks = document.querySelector('.nav-links');

window.addEventListener('scroll', () => {
  header.classList.toggle('scrolled', window.scrollY > 30);
});

navToggle.addEventListener('click', () => {
  const isOpen = navLinks.classList.toggle('open');
  navToggle.classList.toggle('active', isOpen);
  navToggle.setAttribute('aria-expanded', isOpen);
  document.body.style.overflow = isOpen ? 'hidden' : '';
});

document.querySelectorAll('.nav-links a').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    navToggle.classList.remove('active');
    navToggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  });
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

const filters = document.querySelectorAll('.filter');
const projects = document.querySelectorAll('.project');
filters.forEach(filter => {
  filter.addEventListener('click', () => {
    filters.forEach(btn => btn.classList.remove('active'));
    filter.classList.add('active');
    const selected = filter.dataset.filter;
    projects.forEach(project => {
      project.classList.toggle('hidden', selected !== 'all' && project.dataset.category !== selected);
    });
  });
});

const testimonials = [...document.querySelectorAll('.testimonial')];
const dotsWrap = document.querySelector('.slider-dots');
let currentSlide = 0;
let autoSlide;

testimonials.forEach((_, index) => {
  const dot = document.createElement('button');
  dot.setAttribute('aria-label', `Show testimonial ${index + 1}`);
  dot.addEventListener('click', () => showSlide(index));
  dotsWrap.appendChild(dot);
});
const dots = [...dotsWrap.children];

function showSlide(index) {
  currentSlide = (index + testimonials.length) % testimonials.length;
  testimonials.forEach((item, i) => item.classList.toggle('active', i === currentSlide));
  dots.forEach((dot, i) => dot.classList.toggle('active', i === currentSlide));
}
function startSlider() {
  clearInterval(autoSlide);
  autoSlide = setInterval(() => showSlide(currentSlide + 1), 6500);
}
document.querySelector('.slider-btn.next').addEventListener('click', () => { showSlide(currentSlide + 1); startSlider(); });
document.querySelector('.slider-btn.prev').addEventListener('click', () => { showSlide(currentSlide - 1); startSlider(); });
showSlide(0);
startSlider();

document.querySelectorAll('.faq-item button').forEach(button => {
  button.addEventListener('click', () => {
    const item = button.parentElement;
    const wasActive = item.classList.contains('active');
    document.querySelectorAll('.faq-item').forEach(faq => faq.classList.remove('active'));
    if (!wasActive) item.classList.add('active');
  });
});

document.getElementById('contactForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const subject = encodeURIComponent(`Project Request — ${data.get('service')}`);
  const body = encodeURIComponent(
`Hello Adem Digital,

My name is ${data.get('name')}.
Email: ${data.get('email')}
Service needed: ${data.get('service')}

Project details:
${data.get('message')}

Thank you.`
  );
  document.getElementById('formNote').textContent = 'Opening your email app…';
  window.location.href = `mailto:dmheddi@gmail.com?subject=${subject}&body=${body}`;
});

document.getElementById('year').textContent = new Date().getFullYear();
