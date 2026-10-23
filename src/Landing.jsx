import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { ArrowDown, ArrowRight, ArrowUpRight, BookmarkCheck, BriefcaseBusiness, Check, Compass, Moon, Sparkles, Sun, UserRound, ChartNoAxesColumnIncreasing } from 'lucide-react'
import './Landing.css'

const dashboardLink = '/dashboard'

function BridgeCanvas({ reduceMotion }) {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    let frame = 0
    let visible = true
    let raf = 0
    const resize = () => {
      const scale = Math.min(window.devicePixelRatio || 1, 1.5)
      const rect = canvas.getBoundingClientRect()
      canvas.width = Math.round(rect.width * scale)
      canvas.height = Math.round(rect.height * scale)
      context.setTransform(scale, 0, 0, scale, 0, 0)
    }
    const draw = () => {
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      context.clearRect(0, 0, w, h)
      const center = w * 0.51
      const base = h * 0.72
      context.strokeStyle = 'rgba(60, 96, 72, .18)'
      context.lineWidth = 1
      for (let i = 0; i < 7; i++) {
        context.beginPath()
        context.ellipse(center, base + i * 14, 90 + i * 29, 15 + i * 4, 0, Math.PI, Math.PI * 2)
        context.stroke()
      }
      context.beginPath()
      context.moveTo(w * .12, base)
      context.bezierCurveTo(w * .32, base, w * .36, h * .25, center, h * .25)
      context.bezierCurveTo(w * .66, h * .25, w * .7, base, w * .89, base)
      context.strokeStyle = '#52775e'
      context.lineWidth = 2
      context.stroke()
      const t = reduceMotion ? 0.5 : (Math.sin(frame * .012) + 1) / 2
      const x = w * (.18 + t * .64)
      const y = base - Math.sin(t * Math.PI) * h * .47
      context.beginPath()
      context.arc(x, y, 5, 0, Math.PI * 2)
      context.fillStyle = '#c56f50'
      context.fill()
      context.beginPath()
      context.arc(x, y, 13, 0, Math.PI * 2)
      context.fillStyle = 'rgba(197,111,80,.12)'
      context.fill()
      frame += 1
      if (visible && !reduceMotion) raf = requestAnimationFrame(draw)
    }
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      cancelAnimationFrame(raf)
      if (visible) draw()
    }, { threshold: 0.05 })
    observer.observe(canvas)
    resize()
    window.addEventListener('resize', resize)
    return () => { observer.disconnect(); cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [reduceMotion])
  return <canvas ref={canvasRef} className="bridge-canvas" aria-hidden="true" />
}

export default function Landing({ theme, setTheme }) {
  const reduceMotion = useReducedMotion()
  const heroTitle = useRef(null)
  const progressRef = useRef(null)
  const [navScrolled, setNavScrolled] = useState(false)
  useEffect(() => {
    const updateNav = () => setNavScrolled(window.scrollY > 24)
    updateNav()
    window.addEventListener('scroll', updateNav, { passive: true })
    return () => window.removeEventListener('scroll', updateNav)
  }, [])
  useEffect(() => {
    if (reduceMotion) return
    const split = heroTitle.current?.querySelectorAll('[data-word]')
    if (!split?.length) return
    let animation
    let cancelled = false
    import('animejs').then(({ animate }) => {
      if (!cancelled) animation = animate(split, { opacity: [0, 1], y: [18, 0], delay: (_, i) => i * 72, duration: 680, ease: 'out(3)' })
    })
    return () => { cancelled = true; animation?.pause() }
  }, [reduceMotion])
  useEffect(() => {
    if (reduceMotion) return
    let scope
    let cancelled = false
    Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(([gsapModule, triggerModule]) => {
      if (cancelled) return
      const gsap = gsapModule.gsap
      gsap.registerPlugin(triggerModule.ScrollTrigger)
      scope = gsap.context(() => {
        gsap.to(progressRef.current, {
          scaleX: 1,
          ease: 'none',
          scrollTrigger: { trigger: document.documentElement, start: 'top top', end: 'bottom bottom', scrub: 0.25 },
        })
        gsap.utils.toArray('.reveal:not(.journey-card):not(.coach-preview)').forEach((element) => gsap.fromTo(element, { y: 34, opacity: 0 }, {
          y: 0, opacity: 1, duration: 0.75, ease: 'power2.out',
          scrollTrigger: { trigger: element, start: 'top 88%', once: true },
        }))
        gsap.fromTo('.hero-visual', { opacity: 0, y: 24, scale: 0.97 }, {
          opacity: 1, y: 0, scale: 1, duration: 1.1, delay: 0.18, ease: 'power3.out',
        })
        gsap.fromTo('.journey-card', { opacity: 0, y: 32 }, {
          opacity: 1, y: 0, duration: 0.72, stagger: 0.14, ease: 'power2.out',
          scrollTrigger: { trigger: '.journey-grid', start: 'top 82%', once: true },
        })
        const journeyDetails = gsap.timeline({
          scrollTrigger: { trigger: '.journey-grid', start: 'top 72%', once: true },
        })
        journeyDetails
          .from('.skill-chip-row i', { y: 12, scale: 0.88, opacity: 0, duration: 0.38, stagger: 0.09, ease: 'back.out(1.7)' }, 0.18)
          .from('.match-reason span:not(.match-line)', { y: 10, scale: 0.82, opacity: 0, duration: 0.35, stagger: 0.1, ease: 'back.out(1.5)' }, 0.32)
          .from('.plan-point', { scale: 0.35, opacity: 0, duration: 0.38, stagger: 0.16, ease: 'back.out(2)' }, 0.4)
        gsap.fromTo('.feature-image img', { scale: 1.08 }, {
          scale: 1, ease: 'none',
          scrollTrigger: { trigger: '.feature-image', start: 'top bottom', end: 'bottom top', scrub: 0.45 },
        })
        gsap.fromTo('.coach-preview', { opacity: 0, y: 48, rotate: 3 }, {
          opacity: 1, y: 0, rotate: 1, duration: 0.9, ease: 'power2.out',
          scrollTrigger: { trigger: '.coach-preview', start: 'top 84%', once: true },
        })
        gsap.fromTo('.closing-arc', { scale: 0.86, opacity: 0.25 }, {
          scale: 1, opacity: 1, stagger: 0.12, ease: 'none',
          scrollTrigger: { trigger: '.closing-section', start: 'top 85%', end: 'center center', scrub: 0.6 },
        })
        gsap.to('.hero-photo-small', { yPercent: -10, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.5 } })
        gsap.to('.hero-orbit', { yPercent: 9, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.6 } })
      })
    })
    return () => { cancelled = true; scope?.revert() }
  }, [reduceMotion])

  const title = ['Your next step', 'starts with', 'what you know.']
  return <div className="landing-page">
    <div className="landing-progress" aria-hidden="true"><span ref={progressRef} /></div>
    <a className="landing-skip" href="#landing-main">Skip to content</a>
    <header className={`landing-nav${navScrolled ? ' nav-scrolled' : ''}`}>
      <a className="landing-brand" href="/"><span className="brand-symbol"><span /></span><span>skillbridge<span className="brand-dot">.</span></span></a>
      <nav className="landing-nav-links" aria-label="Main navigation"><a href="#how-it-works">How it works</a><a href="#for-you">For students</a><a href="#coach">The career coach</a></nav>
      <div className="landing-nav-actions"><button className="theme-toggle" aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`} onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>{theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}</button><a className="nav-signin" href={`${dashboardLink}?auth=login`}>Sign in</a><a className="button button-primary nav-cta" href={`${dashboardLink}?auth=register`}>Get started <ArrowUpRight size={16} /></a></div>
      <a className="mobile-start" href={`${dashboardLink}?auth=register`}>Start <ArrowUpRight size={15} /></a>
      <button className="mobile-theme-toggle theme-toggle" aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`} onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>{theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}</button>
    </header>

    <main id="landing-main">
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-grain" aria-hidden="true" />
        <div className="hero-copy">
          <span className="eyebrow"><span className="eyebrow-dot" /> A calmer way to find your way in</span>
          <h1 id="hero-title" ref={heroTitle}>{title.map((line, li) => <span className="title-line" key={line}>{line.split(' ').map((word, wi) => <span data-word key={`${li}-${wi}`}>{word}&nbsp;</span>)}</span>)}</h1>
          <p className="hero-description">Find early-career roles that connect to your skills, make a plan for what’s next, and get a little help along the way.</p>
          <div className="hero-actions"><a className="button button-primary button-large" href={`${dashboardLink}?auth=register`}>Build your career space <ArrowRight size={18} /></a><a className="hero-text-link" href="/dashboard">Explore the workspace <ArrowDown size={16} /></a></div>
          <div className="hero-assurance"><span className="assurance-mark"><Compass size={17} /></span><span>For students finding their footing.<br /><strong>Grow at your own pace.</strong></span></div>
        </div>
        <div className="hero-visual" aria-label="Illustration of a path crossing a bridge toward new opportunities">
          <div className="hero-photo hero-photo-main"><img src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1100&q=85" alt="A small team collaborating around a laptop" fetchPriority="high" /><span className="photo-caption">Good things grow together.</span></div>
          <div className="hero-photo hero-photo-small"><img src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=520&q=80" alt="A student sharing ideas with classmates" /></div>
          <div className="hero-orbit"><BridgeCanvas reduceMotion={reduceMotion} /><div className="orbit-label orbit-label-top"><span><Sparkles size={14} /></span><div><strong>Your next step</strong><small>One thing at a time</small></div></div><div className="orbit-label orbit-label-bottom"><span><BookmarkCheck size={15} /></span><div><strong>Good fit, explained</strong><small>Based on your skills</small></div></div><div className="orbit-number">01</div></div>
          <div className="hero-stamp"><span>ROOM<br />TO GROW</span><ArrowUpRight size={17} /></div>
        </div>
        <a className="scroll-cue" href="#how-it-works"><span>Scroll to explore</span><ArrowDown size={15} /></a>
      </section>

      <section className="intro-strip reveal"><span className="section-index">01 / A BETTER START</span><p>You don’t need to have it all figured out.<br /><em>You just need a place to begin.</em></p><span className="intro-mark"><span /><span /><span /></span></section>

      <section id="how-it-works" className="journey-section">
        <div className="section-heading reveal"><div><span className="eyebrow">A path that meets you here</span><h2>One small step.<br /><em>Then another.</em></h2></div><p>Start with what you already know. SkillBridge helps turn it into a search and a plan that feel like yours.</p></div>
        <div className="journey-grid">
          <article className="journey-card journey-profile reveal"><span className="card-index">01</span><div className="profile-illustration"><div className="profile-card-mini"><span className="mini-avatar"><UserRound size={17} /></span><div><b>Your starting point</b><small>Skills · interests · goals</small></div><Check size={16} /></div><div className="profile-skill-heading"><span>Skills you can build on</span><small>EXAMPLE PROFILE</small></div><div className="skill-chip-row"><i>Excel</i><i>Communication</i><i>Curiosity</i></div><div className="profile-next-step"><span><ChartNoAxesColumnIncreasing size={16} /></span><div><small>ROLE TO EXPLORE</small><b>Junior data analyst</b></div><ArrowRight size={15} /></div></div><div><span className="card-kicker">START WITH YOU</span><h3>Start with what you already know.</h3><p>Add your skills, interests, and goals. SkillBridge can show where they connect to roles—and what to learn next.</p></div></article>
          <article className="journey-card journey-match reveal"><span className="card-index">02</span><div className="match-illustration"><div className="match-listing"><span className="listing-mark"><BriefcaseBusiness size={17} /></span><div><b>Junior Data Analyst</b><small>Northstar Insights · Bengaluru</small></div><span className="fit-score">Good fit</span></div><div className="match-reason"><span className="match-line" /><span>SQL</span><span>Excel</span><span>Curiosity</span></div><span className="match-note"><Sparkles size={14} /> Here’s what connects</span></div><div><span className="card-kicker">FIND YOUR FIT</span><h3>See where your skills connect.</h3><p>Explore roles with a plain-language explanation of the match.</p></div></article>
          <article className="journey-card journey-plan reveal"><span className="card-index">03</span><div className="plan-illustration"><div className="plan-line" /><div className="plan-point point-done"><Check size={13} /></div><div className="plan-point point-current"><span /></div><div className="plan-point point-next" /><div className="plan-note"><span>YOUR NEXT PRACTICE</span><b>Build one small project</b><small>Use what you’ve learned.</small></div><span className="plan-leaf leaf-one">✳</span><span className="plan-leaf leaf-two">✳</span></div><div><span className="card-kicker">KEEP MOVING</span><h3>Build skills at your own pace.</h3><p>Turn a skill gap into a practical next step, not a score to worry about.</p></div></article>
        </div>
      </section>

      <section id="for-you" className="feature-story">
        <div className="feature-image reveal"><img src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1100&q=85" alt="University students talking together on campus" loading="lazy" /><span className="image-note">Your path is allowed<br />to look like yours.</span></div>
        <div className="feature-copy reveal"><span className="eyebrow">A workspace that gets it</span><h2>Less pressure.<br /><em>More possibility.</em></h2><p>Job searching can feel like a lot. SkillBridge brings your roles, saved ideas, applications, and learning plan into one thoughtful space—so it’s easier to see what to do next.</p><ul><li><span><Check size={15} /></span>Keep promising roles close</li><li><span><Check size={15} /></span>Track applications without losing your place</li><li><span><Check size={15} /></span>Get a simple plan shaped around real roles</li></ul><a className="text-link" href="/dashboard">Take a look inside <ArrowRight size={16} /></a></div>
      </section>

      <section id="coach" className="coach-section">
        <div className="coach-copy reveal"><span className="eyebrow"><span className="eyebrow-dot" /> A helpful voice, when you need one</span><h2>Think it through<br /><em>with a coach.</em></h2><p>Ask for help understanding a role, planning what to learn, or finding the words for an application. You stay in charge of every next step.</p><a className="button button-dark button-large" href="/dashboard?view=coach">Meet your career coach <ArrowRight size={17} /></a><small>Suggestions are a starting point. Your judgment comes first.</small></div>
        <div className="coach-preview reveal"><div className="coach-window-top"><span className="coach-avatar"><Sparkles size={17} /></span><div><b>Career coach</b><small>Example conversation</small></div></div><div className="coach-chat"><p className="coach-bubble coach-question">I’m curious about data roles. What could I practice?</p><p className="coach-bubble coach-reply">SQL is a useful place to start. Try exploring a small dataset, then explain one thing you learned from it.</p></div><div className="coach-prompt"><span>Bring a question when you’re ready</span><button aria-label="Open the career coach" onClick={() => window.location.assign('/dashboard?view=coach')}><ArrowUpRight size={17} /></button></div><div className="coach-footnote"><Sparkles size={13} /> A starting point, shaped around your goals</div></div>
      </section>

      <section className="closing-section reveal"><div className="closing-art"><div className="closing-sun" /><span className="closing-arc arc-a" /><span className="closing-arc arc-b" /><span className="closing-arc arc-c" /><span className="closing-path" /></div><span className="eyebrow">Whenever you’re ready</span><h2>Your next chapter<br /><em>can start here.</em></h2><p>There’s no perfect starting point. Take the one that feels right.</p><a className="button button-primary button-large" href={`${dashboardLink}?auth=register`}>Create your free account <ArrowRight size={18} /></a></section>
    </main>

    <footer className="landing-footer"><a className="landing-brand" href="/"><span className="brand-symbol"><span /></span><span>skillbridge<span className="brand-dot">.</span></span></a><span>Made for the next step, wherever it leads.</span><nav aria-label="Footer"><a href="#how-it-works">How it works</a><a href="/dashboard">Explore roles <ArrowUpRight size={13} /></a><a href={`${dashboardLink}?auth=login`}>Sign in</a></nav><small>SkillBridge © {new Date().getFullYear()}</small></footer>
  </div>
}
