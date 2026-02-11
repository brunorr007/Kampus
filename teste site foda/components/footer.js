class CustomFooter extends HTMLElement {
  connectedCallback() {
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          background: rgba(13, 13, 13, 0.8);
          backdrop-filter: blur(10px);
          border-top: 1px solid rgba(0, 245, 212, 0.1);
        }
        footer {
          max-width: 1400px;
          margin: 0 auto;
          padding: 2rem;
          text-align: center;
          color: #94a3b8;
        }
        .footer-links {
          display: flex;
          justify-content: center;
          gap: 2rem;
          margin-bottom: 1rem;
        }
        .footer-links a {
          color: #94a3b8;
          text-decoration: none;
          transition: color 0.3s ease;
        }
        .footer-links a:hover {
          color: var(--primary);
        }
        .copyright {
          font-size: 0.9rem;
        }
      </style>
      <footer>
        <div class="footer-links">
          <a href="/">Home</a>
          <a href="/provas.html">Provas</a>
          <a href="/projetos.html">Projetos</a>
          <a href="/comunidade.html">Comunidade</a>
        </div>
        <p class="copyright">
          Feito com <i data-feather="heart" class="w-4 h-4 inline text-red-400"></i> por estudantes, para estudantes
        </p>
      </footer>
    `;
  }
}
customElements.define('custom-footer', CustomFooter);