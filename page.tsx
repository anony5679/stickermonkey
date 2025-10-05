"use client"
export default function AboutPage() {
  return (
    <main>
      <header className="site-header">
        <nav className="navbar" aria-label="Main navigation">
          <button
            className="nav-toggle"
            aria-label="Toggle navigation"
            aria-expanded="false"
            aria-controls="primary-menu"
          >
            <span className="bar"></span>
            <span className="bar"></span>
            <span className="bar"></span>
          </button>
          <a className="brand" href="/">
            StickerApp Clone
          </a>
          <ul id="primary-menu" className="nav-links">
            <li>
              <a href="/stickers">Stickers</a>
            </li>
            <li>
              <a href="/#labels">Labels</a>
            </li>
            <li>
              <a href="/#materials">Materials</a>
            </li>
            <li>
              <a aria-current="page" href="/about">
                About Us
              </a>
            </li>
          </ul>
        </nav>
      </header>

      <header className="about-hero">
        <div className="container">
          <h1 className="about-title text-balance">About Us</h1>
          <p className="about-sub">Creating premium custom stickers and labels since day one.</p>
        </div>
      </header>

      <section className="section">
        <div className="container about-grid">
          <div className="about-content">
            <h2 className="section-title">Our Story</h2>
            <p className="about-text">
              We started with a simple mission: make it easy for anyone to create high-quality custom stickers and
              labels. Whether you're a small business owner, artist, or just someone with a creative idea, we believe
              everyone deserves access to professional-grade printing.
            </p>
            <p className="about-text">
              Our platform combines cutting-edge design tools with premium materials and fast turnaround times. We've
              helped thousands of customers bring their visions to life, from product labels to promotional stickers,
              and everything in between.
            </p>
            <p className="about-text">
              Quality is at the heart of everything we do. We carefully source our materials, rigorously test our
              printing processes, and stand behind every order with our satisfaction guarantee.
            </p>
          </div>
          <div className="about-media">
            <img src="/assets/sample-pack.jpg" alt="Our sticker production facility" />
          </div>
        </div>
      </section>

      <section className="section" style={{ background: "#f9fafb" }}>
        <div className="container">
          <h2 className="section-title" style={{ textAlign: "center" }}>
            Why Choose Us
          </h2>
          <div className="grid-4">
            <article className="card">
              <div className="card-body">
                <h3 className="card-title">Premium Materials</h3>
                <p className="card-text">
                  We offer 16+ material options including vinyl, paper, foil, and specialty finishes to match your exact
                  needs.
                </p>
              </div>
            </article>

            <article className="card">
              <div className="card-body">
                <h3 className="card-title">Fast Turnaround</h3>
                <p className="card-text">
                  Most orders ship within 2-3 business days. Need it faster? We offer rush production options.
                </p>
              </div>
            </article>

            <article className="card">
              <div className="card-body">
                <h3 className="card-title">Easy Design Tools</h3>
                <p className="card-text">
                  Our intuitive editor makes it simple to create professional designs, even if you've never designed
                  before.
                </p>
              </div>
            </article>

            <article className="card">
              <div className="card-body">
                <h3 className="card-title">Quality Guarantee</h3>
                <p className="card-text">
                  Not satisfied? We'll reprint your order or provide a full refund. Your satisfaction is our priority.
                </p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2 className="section-title" style={{ textAlign: "center" }}>
            Our Values
          </h2>
          <div className="row-2">
            <div className="pane">
              <h3 className="pane-title">Quality First</h3>
              <p className="pane-text">
                We never compromise on quality. Every sticker is printed with precision and inspected before shipping.
              </p>
            </div>
            <div className="pane">
              <h3 className="pane-title">Customer Focus</h3>
              <p className="pane-text">
                Your success is our success. We're here to help you create stickers that exceed your expectations.
              </p>
            </div>
            <div className="pane">
              <h3 className="pane-title">Sustainability</h3>
              <p className="pane-text">
                We offer eco-friendly materials and continuously work to reduce our environmental impact.
              </p>
            </div>
            <div className="pane">
              <h3 className="pane-title">Innovation</h3>
              <p className="pane-text">
                We're constantly improving our tools, materials, and processes to give you the best experience.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="container footer-inner">
          <p>
            © <span id="year"></span> StickerApp Clone. All rights reserved.
          </p>
          <a href="#top" className="back-to-top">
            Back to top
          </a>
        </div>
      </footer>
    </main>
  )
}
