document.addEventListener('DOMContentLoaded', () => {

    /* 1. Scroll-Based Navigation Highlight (Debounced) */
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.nav-link');
    let scrollTimeout;

    window.addEventListener('scroll', () => {
        if (scrollTimeout) return;
        
        scrollTimeout = setTimeout(() => {
            let current = '';
            sections.forEach(section => {
                const sectionTop = section.offsetTop;
                const sectionHeight = section.clientHeight;
                if (pageYOffset >= (sectionTop - sectionHeight / 3)) {
                    current = section.getAttribute('id');
                }
            });

            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href').includes(current)) {
                    link.classList.add('active');
                }
            });
            scrollTimeout = null;
        }, 50); // 50ms Response time
    });

    /* 2. Scroll Animations (Intersection Observer) */
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

    /* 3. Contact Form Logic */
    const contactForm = document.getElementById("contactForm");

    if (contactForm) {
        const emailInput = document.getElementById('email');
        const emailMsg = contactForm.querySelector('.email-msg');
        const submitBtn = contactForm.querySelector('button[type="submit"]');
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

        // Real-time Email Validation
        emailInput.addEventListener('input', function () {
            const val = this.value.trim();
            
            if (val.length === 0) {
                emailMsg.innerText = "";
                this.style.borderColor = "rgba(255, 255, 255, 0.1)";
                return;
            }

            if (emailRegex.test(val)) {
                emailMsg.innerText = "✓ Valid Email";
                emailMsg.style.color = "#4ade80";
                this.style.borderColor = "#4ade80";
            } else {
                emailMsg.innerText = "⚠ Invalid Email";
                emailMsg.style.color = "#f87171";
                this.style.borderColor = "#f87171";
            }
        });

        // Form Submit
        contactForm.addEventListener("submit", function (e) {
            e.preventDefault();

            if (!emailRegex.test(emailInput.value.trim())) {
                alert("Please enter a valid email address.");
                emailInput.focus();
                return;
            }

            const formData = new FormData(contactForm);
            const originalBtnHtml = submitBtn.innerHTML;

            submitBtn.innerText = "Sending...";
            submitBtn.disabled = true;
            submitBtn.style.opacity = "0.7";

            fetch(contactForm.action, {
                method: "POST",
                body: formData,
                headers: { 'Accept': 'application/json' }
            })
            .then(response => {
                if (response.ok) {
                    contactForm.reset();
                    emailMsg.innerText = "";
                    emailInput.style.borderColor = "rgba(255, 255, 255, 0.1)";
                    
                    // Success Feedback
                    submitBtn.innerHTML = "Message Sent! <i class='bx bx-check'></i>";
                    submitBtn.style.backgroundColor = "#4ade80"; // Green success
                    submitBtn.style.color = "#000";
                    submitBtn.disabled = false;
                    submitBtn.style.opacity = "1";

                    // Reset button after 3 seconds
                    setTimeout(() => {
                        submitBtn.innerHTML = originalBtnHtml;
                        submitBtn.style.backgroundColor = ""; 
                        submitBtn.style.color = ""; 
                    }, 3000);
                } else {
                    throw new Error('Network response was not ok.');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert("There was a problem sending your message. Please try again.");
                submitBtn.innerHTML = originalBtnHtml;
                submitBtn.disabled = false;
                submitBtn.style.opacity = "1";
            });
        });
    }
});