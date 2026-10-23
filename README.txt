NAQSH BRIDAL COUTURE - scroll film website (demo)
=================================================

HOW TO OPEN
- Best: serve the folder over http so the film decodes frames off the main thread.
    npx http-server .   (or any web host: Netlify Drop, Vercel, cPanel, WordPress theme folder)
- Double-clicking index.html (file://) also works; frames then load as plain images.

WHAT IS WHERE
- index.html ............ all sections
- assets/css/style.css .. design tokens at the top (:root colours, fonts)
- assets/js/app.js ...... CHAPTERS (film captions) and LOOKS (lehengas, prices, hours) at the top
- assets/seq/film/d ..... desktop film frames (1600w WebP)
- assets/seq/film/m ..... mobile film frames (720x960 centre crop), used under 760px
- assets/img ............ collection, macro, karigar, fitting and haveli photos
- assets/vendor ......... GSAP 3.12.5, ScrollTrigger, Lenis 1.1.13 (self-hosted)

FILM LENGTH
- .film height in style.css (900vh desktop, 760vh mobile) sets how much scrolling the film takes.
- P0 / P1 in app.js set the intro hold and the final showroom hold.

WOOCOMMERCE PORT
- LOOKS -> WC products (name, price, image, occasion as a category, hours as a custom field).
- "Save" can map to a wishlist plugin; "Book a trial for this" can pass the product to the form.
- Trial form -> CF7 / WPForms / WooCommerce Bookings.

All names, prices, the address and people are fictional. Images and film are AI-generated.
