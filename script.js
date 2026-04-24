// Essência Feminina - E-commerce JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Mobile Navigation Toggle
    const navToggle = document.createElement('button');
    navToggle.innerHTML = '☰';
    navToggle.classList.add('mobile-nav-toggle');
    
    const navbar = document.querySelector('.navbar');
    const navLinks = document.querySelector('.nav-links');
    
    // Add mobile toggle button
    if (navbar && navLinks) {
        navbar.appendChild(navToggle);
        
        navToggle.addEventListener('click', function() {
            navLinks.classList.toggle('active');
            this.classList.toggle('active');
        });
    }

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Product card hover effects
    const productCards = document.querySelectorAll('.product-card');
    productCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-4px)';
            this.style.transition = 'transform 0.3s ease';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });

    // Add to cart button functionality
    const buyButtons = document.querySelectorAll('.product-button');
    buyButtons.forEach(button => {
        button.addEventListener('click', function() {
            const productCard = this.closest('.product-card');
            const productName = productCard.querySelector('.product-name').textContent;
            const productPrice = productCard.querySelector('.product-price').textContent;
            
            // Show added to cart notification
            showNotification(`${productName} adicionado ao carrinho!`);
            
            // Update cart counter
            updateCartCounter();
        });
    });

    // Cart functionality
    let cart = [];
    
    function updateCartCounter() {
        const cartIcon = document.querySelector('.cart-icon');
        if (cartIcon) {
            cartIcon.setAttribute('data-count', cart.length);
            cartIcon.classList.add('has-items');
        }
    }

    // Notification system
    function showNotification(message) {
        const notification = document.createElement('div');
        notification.classList.add('notification');
        notification.innerHTML = `
            <span>${message}</span>
            <button class="close-notification">×</button>
        `;
        
        document.body.appendChild(notification);
        
        // Style notification
        Object.assign(notification.style, {
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            backgroundColor: '#10b981',
            color: 'white',
            padding: '16px 24px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: '1000',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            animation: 'slideIn 0.3s ease'
        });
        
        // Close button functionality
        const closeBtn = notification.querySelector('.close-notification');
        closeBtn.style.background = 'none';
        closeBtn.style.border = 'none';
        closeBtn.style.color = 'white';
        closeBtn.style.fontSize = '20px';
        closeBtn.style.cursor = 'pointer';
        
        closeBtn.addEventListener('click', () => {
            notification.remove();
        });
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 3000);
    }

    // Newsletter subscription
    const newsletterForm = document.createElement('form');
    newsletterForm.innerHTML = `
        <h4>Receba nossas novidades</h4>
        <div class="newsletter-input">
            <input type="email" placeholder="Seu e-mail" required>
            <button type="submit">Inscrever</button>
        </div>
    `;
    
    // Add newsletter to footer
    const footerBrand = document.querySelector('.footer-brand');
    if (footerBrand) {
        footerBrand.appendChild(newsletterForm);
        
        newsletterForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = this.querySelector('input[type="email"]').value;
            showNotification('Inscrição realizada com sucesso!');
            this.reset();
        });
    }

    // Scroll animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);

    // Observe product cards for animation
    document.querySelectorAll('.product-card, .benefit-card, .testimonial-card').forEach(el => {
        observer.observe(el);
    });

    // Search functionality
    const searchIcon = document.querySelector('.cart-icon');
    if (searchIcon) {
        searchIcon.addEventListener('click', function() {
            // Could open a search modal or navigate to search page
            console.log('Search clicked');
        });
    }

    // Initialize cart counter
    updateCartCounter();
});

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .mobile-nav-toggle {
        display: none;
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
    }
    
    .animate-in {
        animation: fadeInUp 0.6s ease forwards;
    }
    
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    @media (max-width: 768px) {
        .mobile-nav-toggle {
            display: block;
        }
        
        .nav-links {
            display: none;
            position: absolute;
            top: 72px;
            left: 0;
            right: 0;
            background: white;
            flex-direction: column;
            padding: 20px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        
        .nav-links.active {
            display: flex;
        }
    }
`;
document.head.appendChild(style);