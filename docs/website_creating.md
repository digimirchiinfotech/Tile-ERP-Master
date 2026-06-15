# Standard Website & Web Application Architecture Guide (2024-2026)

This document is a comprehensive, step-by-step technical guide for website and web application developers. It provides detailed architecture patterns, file structures, coding standards, and best practices to build a scalable, performant, and perfectly structured website.

---

## 1. Optimal Project Folder Structure

A well-organized repository is the foundation of a scalable website. Below is the industry-standard folder structure (applicable to React, Next.js, and Vite projects):

```text
root/
├── public/                 # Static assets (favicon, images, robots.txt)
│   ├── images/
│   └── fonts/
├── src/                    # Main application source code
│   ├── assets/             # Assets imported into code (SVGs, specific images)
│   ├── components/         # Reusable UI components
│   │   ├── common/         # Buttons, Inputs, Modals (shared globally)
│   │   └── features/       # Feature-specific components (e.g., LeadForm, SupplierTable)
│   ├── layouts/            # Page layouts (Header, Footer, Sidebar, Main)
│   ├── pages/              # Route-level components (Home, About, Contact)
│   ├── hooks/              # Custom React hooks (e.g., useAuth, useFetch)
│   ├── context/            # React Context or State Management (Redux/Zustand)
│   ├── services/           # API call logic and external integrations
│   ├── utils/              # Helper functions (e.g., formatCurrency, dateParser)
│   ├── styles/             # Global CSS/SCSS and design tokens
│   ├── types/              # TypeScript interfaces (if using TS)
│   ├── App.jsx             # Root component and Routing setup
│   └── main.jsx            # Application entry point
├── .env                    # Environment variables (API keys, Base URLs)
├── package.json            # Project dependencies and scripts
└── vite.config.js          # Build tool configuration
```

---

## 2. Comprehensive Page Requirements & Architecture

When developing pages, follow this exact structure to ensure both user experience (UX) and Search Engine Optimization (SEO) are perfectly aligned.

### A. The Homepage (`/pages/Home.jsx`)
The Homepage must instantly capture attention and direct users to key actions.
*   **Hero Section:** 
    *   **Structure:** `<h1>` Main Value Proposition `</h1>`, `<h2>` Subheadline `</h2>`, and a primary Call to Action (CTA) button (e.g., "Start Free Trial").
    *   **Tech:** Use optimized `<img loading="eager">` for the hero background to ensure fast LCP (Largest Contentful Paint).
*   **Social Proof:** A carousel or grid of client logos / testimonials to build trust.
*   **Features / Services Summary:** A 3-column grid briefly explaining core offerings, each with a "Learn More" link.
*   **Final CTA:** A concluding banner at the bottom urging users to take action.

### B. About Page (`/pages/About.jsx`)
*   **Mission & Vision:** Clear text sections explaining the "Why" behind the company.
*   **Team Section:** A grid of team member profile cards. Ensure each image has an `alt` attribute (e.g., `alt="John Doe, CEO"`).
*   **Company History/Timeline:** Use a visual vertical timeline for engagement.

### C. Services & Products (`/pages/Services.jsx` or dynamic `/pages/Product/[id].jsx`)
*   **Service Catalog:** Use a consistent card layout.
*   **Dynamic Routing:** If dealing with many products, use dynamic routes (e.g., `react-router-dom` params or Next.js `[slug]`).
*   **SEO:** Ensure every product page has unique meta titles and descriptions.

### D. Contact & Support (`/pages/Contact.jsx`)
*   **Contact Form:** Include validation (e.g., using `react-hook-form` + `yup` or `zod`). Needs fields for Name, Email, Subject, and Message.
*   **Business Info:** Display Phone, Email, and physical address.
*   **Map Integration:** Embed an interactive Google Map (lazy-loaded to save performance).

### E. Legal Pages (`/pages/Privacy.jsx`, `/pages/Terms.jsx`)
*   **Typography:** Must be highly readable. Use a narrow max-width container (e.g., `max-w-3xl`) so long paragraphs of text are easy to read.

---

## 3. UI/UX & Design System Implementation

To ensure visual consistency and development speed, establish a Design System before building pages.

### CSS Architecture (Global vs. Local)
1.  **Global Styles (`src/styles/index.css`):** Define CSS variables (Custom Properties) for colors, typography, and spacing.
    ```css
    :root {
      --color-primary: #2563eb;
      --color-secondary: #1e293b;
      --color-background: #f8fafc;
      --font-main: 'Inter', sans-serif;
      --spacing-md: 1rem;
    }
    ```
2.  **Component Scoping:** If not using TailwindCSS, use CSS Modules (`Button.module.css`) to prevent class name collisions.

### Modern Design Aesthetics
*   **Typography:** Do not use default fonts. Import modern fonts from Google Fonts (e.g., *Inter*, *Roboto*, *Outfit*).
*   **Micro-interactions:** Add subtle hover effects to all clickable elements.
    ```css
    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      transition: all 0.2s ease-in-out;
    }
    ```
*   **Responsive Breakpoints:**
    *   Mobile: `< 768px`
    *   Tablet: `768px - 1024px`
    *   Desktop: `> 1024px`

---

## 4. API Integration & State Management

### Centralized API Services (`src/services/api.js`)
Never scatter `fetch` or `axios` calls across components. Centralize them.

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
});

// Interceptor for attaching auth tokens
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const fetchProducts = () => api.get('/products');
export const submitContactForm = (data) => api.post('/contact', data);

export default api;
```

### State Management Rules
*   **Local State (`useState`):** Use for UI toggles, form inputs, and component-specific data.
*   **Global State (`Context API` or `Zustand`/`Redux`):** Use for User Authentication state, Shopping Cart, or Theme (Dark/Light mode).
*   **Server State (`React Query` / `SWR`):** Use for fetching API data. It provides automatic caching, loading states, and error handling.

---

## 5. SEO & Accessibility (Technical Checklist)

Every website developer must adhere to these standards:

### SEO Fundamentals
- [ ] **Semantic HTML:** Use `<header>`, `<main>`, `<section>`, `<article>`, `<aside>`, and `<footer>` instead of standard `<div>` wrappers.
- [ ] **Heading Hierarchy:** One `<h1>` per page. `<h2>` for major sections, `<h3>` for sub-sections. Never skip levels (e.g., H2 straight to H4).
- [ ] **Meta Tags:** Ensure `react-helmet` or Next.js `<Head>` is used to dynamically inject unique `<title>` and `<meta name="description">` tags per route.
- [ ] **Alt Attributes:** Every `<img />` tag must have an `alt` description.

### Performance (Core Web Vitals)
- [ ] **Image Optimization:** Convert large images to WebP.
- [ ] **Lazy Loading:** Add `loading="lazy"` to images below the fold.
- [ ] **Code Splitting:** Use `React.lazy()` for route-level components to reduce the initial JavaScript bundle size.

### Accessibility (a11y)
- [ ] **Keyboard Navigation:** Ensure users can navigate the entire site using the `Tab` key. Elements should have visible `:focus` outlines.
- [ ] **ARIA Attributes:** Use `aria-expanded`, `aria-hidden`, and `aria-label` where visual context is missing for screen readers.
- [ ] **Contrast Ratios:** Ensure text color vs. background color passes WCAG AA contrast standards.

---

## 6. Deployment Workflow

1.  **Environment Variables:** Ensure `.env` is in `.gitignore`. Provide a `.env.example` file for other developers.
2.  **Build Command:** Run `npm run build`. Fix any warnings or errors.
3.  **Hosting:** Deploy the `/dist` or `/build` folder to platforms like Vercel, Netlify, or AWS.
4.  **CI/CD:** Set up GitHub Actions to automatically lint, test, and deploy upon pushing to the `main` branch.
