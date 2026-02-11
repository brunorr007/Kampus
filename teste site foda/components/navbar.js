class CustomNavbar extends HTMLElement {
  connectedCallback() {
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          position: fixed;
          top: 0;
          left: 0;
          z-index: 1000;
          backdrop-filter: blur(10px);
          background: rgba(13, 13, 13, 0.8);
          border-bottom: 1px solid rgba(0, 245, 212, 0.2);
        }
        nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 2rem;
          max-width: 1400px;
          margin: 0 auto;
        }
        .logo {
          display: flex;
          align-items: center;
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 700;
          font-size: 1.5rem;
          color: var(--primary);
          text-decoration: none;
        }
        .logo i {
          margin-right: 0.5rem;
        }
        .nav-links {
          display: flex;
          gap: 1.5rem;
        }
        .nav-links a {
          color: #94a3b8;
          text-decoration: none;
          font-weight: 500;
          transition: all 0.3s ease;
          position: relative;
        }
        .nav-links a:hover {
          color: var(--primary);
        }
        .nav-links a::after {
          content: '';
          position: absolute;
          bottom: -5px;
          left: 0;
          width: 0;
          height: 2px;
          background: var(--primary);
          transition: width 0.3s ease;
        }
        .nav-links a:hover::after {
          width: 100%;
        }
        @media (max-width: 768px) {
          nav {
            padding: 1rem;
            flex-direction: column;
            gap: 1rem;
          }
          .nav-links {
            gap: 1rem;
          }
        }
      </style>
      <nav>
        <a href="/" class="logo">
          <i data-feather="book-open"></i>
          Gabarita.ai
        </a>
        <div class="nav-links">
          <a href="/">Home</a>
          <a href="/provas.html">Provas</a>
          <a href="/projetos.html">Projetos</a>
          <a href="/forum.html">Comunidade</a>
        </div>
      </nav>
    `;
  }
}
customElements.define('custom-navbar', CustomNavbar);