/* ==========================================================================
   Desat Info Tech — interactions
   Vanilla JS, no dependencies. Every module is defensive: if its markup is
   missing the module simply opts out instead of throwing.

   Motion modules respect prefers-reduced-motion and fine-pointer media
   queries, and none of them own a property another module also writes:
     reveal      → --rx0 / --ry0        (CSS `translate`)
     tilt        → --tiltX / --tiltY    (CSS `transform`)
     lift hover  → --lift               (folded into `translate`)
     magnetic    → --mx / --my          (CSS `translate` on .btn)
     parallax    → --py                 (CSS `translate`)
     progress    → --p                  (CSS `scale`)
     svc rows    → --rgx / --rgy, --i   (pointer spotlight, stagger index)

   Modules 19 (service rows) and 20 (page viewer) exist because the site is
   normally reached as a single file from a preview panel, where the sibling
   pages are not addressable at all. Module 20 resolves internal links into
   an in-page dialog built from the content island rather than navigating;
   module 19 owns the expanding rows that module 20 routes service links to.
   ========================================================================== */
(function () {
  'use strict';

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FINE = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* Announce that scripting is alive BEFORE anything else runs. The reveal
     styles are scoped to .js-motion, so until this class lands the page is
     simply static and fully visible; from here on, sections start hidden and
     the reveal module takes responsibility for showing them. If this line
     never runs the page degrades to a plain, readable document rather than a
     blank one. */
  document.documentElement.classList.add('js-motion');

  /* ------------------------------------------------------------------
     1. Sticky header — solidifies once the page scrolls
     ------------------------------------------------------------------ */
  (function stickyHeader() {
    var header = $('#siteHeader');
    if (!header) return;

    var ticking = false;
    function update() {
      header.classList.toggle('is-stuck', window.scrollY > 24);
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }, { passive: true });
    update();
  })();

  /* ------------------------------------------------------------------
     2. Reading progress bar
     ------------------------------------------------------------------ */
  (function scrollProgress() {
    var bar = $('.scroll-progress span');
    if (!bar) return;
    var host = bar.parentNode;

    function update() {
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      var p = max > 0 ? window.scrollY / max : 0;
      host.style.setProperty('--p', Math.min(Math.max(p, 0), 1).toFixed(4));
    }
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    window.addEventListener('visibilitychange', function () { if (!document.hidden) update(); });
    update();
  })();

  /* ------------------------------------------------------------------
     3. Mobile navigation + dropdown accordions
     ------------------------------------------------------------------ */
  (function navigation() {
    var nav = $('#primaryNav');
    var burger = $('#burger');
    var scrim = $('#navScrim');
    if (!nav || !burger) return;

    function setMenu(open) {
      nav.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      document.body.classList.toggle('is-locked', open);
      if (scrim) {
        if (open) {
          scrim.hidden = false;
          window.requestAnimationFrame(function () { scrim.classList.add('is-on'); });
        } else {
          scrim.classList.remove('is-on');
          window.setTimeout(function () { scrim.hidden = true; }, 300);
        }
      }
    }

    burger.addEventListener('click', function () {
      setMenu(!nav.classList.contains('is-open'));
    });
    if (scrim) scrim.addEventListener('click', function () { setMenu(false); });

    // dropdown toggles
    $$('.nav__toggle').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var item = btn.closest('.nav__item');
        var open = !item.classList.contains('is-open');
        $$('.nav__item.has-menu').forEach(function (other) {
          other.classList.remove('is-open');
          var t = $('.nav__toggle', other);
          if (t) t.setAttribute('aria-expanded', 'false');
        });
        item.classList.toggle('is-open', open);
        btn.setAttribute('aria-expanded', String(open));
      });
    });

    document.addEventListener('click', function (e) {
      if (!e.target.closest('.nav__item.has-menu')) {
        $$('.nav__item.has-menu').forEach(function (item) {
          item.classList.remove('is-open');
          var t = $('.nav__toggle', item);
          if (t) t.setAttribute('aria-expanded', 'false');
        });
      }
    });

    // close the drawer after tapping a link
    $$('#primaryNav a').forEach(function (a) {
      a.addEventListener('click', function () {
        if (nav.classList.contains('is-open')) setMenu(false);
      });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) setMenu(false);
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 1024 && nav.classList.contains('is-open')) setMenu(false);
    });
  })();

  /* ------------------------------------------------------------------
     4. Split headlines into words for a staggered mask reveal

     The hero <h1> may carry inline elements, so the splitter walks child
     nodes rather than using innerHTML: text nodes are tokenised into word
     spans, and element nodes are shallow-cloned first so anything inline
     (a <strong>, a <span>) survives intact.
     ------------------------------------------------------------------ */
  (function splitHeadlines() {
    var hosts = $$('[data-split]');
    if (!hosts.length) return;

    function makeWord(text) {
      var outer = document.createElement('span');
      outer.className = 'w';
      var inner = document.createElement('span');
      inner.className = 'w__i';
      inner.textContent = text;
      outer.appendChild(inner);
      return outer;
    }

    hosts.forEach(function (el) {
      if (el.dataset.split === 'done') return;

      var frag = document.createDocumentFragment();
      var index = 0;

      Array.prototype.slice.call(el.childNodes).forEach(function (node) {
        var target;
        if (node.nodeType === 3) {
          target = frag;
        } else if (node.nodeType === 1) {
          target = node.cloneNode(false);
          frag.appendChild(target);
        } else {
          return;
        }

        node.textContent.split(/(\s+)/).forEach(function (token) {
          if (!token) return;
          if (/^\s+$/.test(token)) {
            target.appendChild(document.createTextNode(' '));
            return;
          }
          var word = makeWord(token);
          word.firstChild.style.setProperty('--wd', (index * 55) + 'ms');
          index++;
          target.appendChild(word);
        });
      });

      el.textContent = '';
      el.appendChild(frag);
      el.dataset.split = 'done';
    });
  })();

  /* ------------------------------------------------------------------
     5. SVG line-draw

     Every stroked shape inside a [data-draw] svg is measured and given a
     dash offset equal to its own length, so it starts invisible and wipes
     itself in when the section reveals. Filled shapes are left alone — a
     dash offset on a closed fill just hides it, which looks like a bug.

     Shapes inside a `hidden` tab panel have no layout and report a length
     of 0, so the whole page is briefly unhidden for the measuring pass.
     ------------------------------------------------------------------ */
  (function lineDraw() {
    var svgs = $$('[data-draw]');
    if (!svgs.length) return;

    var unhidden = [];
    svgs.forEach(function (svg) {
      var node = svg;
      while (node && node !== document.body) {
        if (node.nodeType === 1 && node.hasAttribute('hidden')) {
          unhidden.push(node);
          node.removeAttribute('hidden');
        }
        node = node.parentNode;
      }
    });

    svgs.forEach(function (svg) {
      var step = 0;
      $$('path, circle, rect, ellipse, line, polyline, polygon', svg).forEach(function (el) {
        var cs;
        try { cs = window.getComputedStyle(el); } catch (e) { return; }
        if (!cs.stroke || cs.stroke === 'none') return;
        if (parseFloat(cs.strokeOpacity) === 0) return;
        var len;
        try { len = el.getTotalLength(); } catch (e) { return; }
        if (!len || !isFinite(len) || len <= 0) return;
        el.style.setProperty('--len', len.toFixed(2));
        el.style.setProperty('--dd', (step * 90) + 'ms');
        el.classList.add('draw-line');
        step++;
      });
    });

    unhidden.forEach(function (el) { el.setAttribute('hidden', ''); });

    /* the hero trend line draws on the same trigger but sits outside any
       [data-draw] svg, so it is measured separately */
    $$('.chart__line path').forEach(function (p) {
      var len;
      try { len = p.getTotalLength(); } catch (e) { return; }
      if (len && isFinite(len)) p.style.setProperty('--len', len.toFixed(2));
    });
  })();

  /* ------------------------------------------------------------------
     6. Scroll reveal — staggered fade / rise / mask wipe
     ------------------------------------------------------------------ */
  (function reveal() {
    var items = $$('[data-reveal]');
    if (!items.length) return;

    if (REDUCED || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }

    items.forEach(function (el) {
      el.style.setProperty('--d', (parseInt(el.dataset.delay, 10) || 0) + 'ms');
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    items.forEach(function (el) { io.observe(el); });

    /* Backstop. IntersectionObserver alone is not enough: it never fires
       while the document is hidden (background tab, prerender, some embedded
       webviews) and scroll events are unreliable there too, which would leave
       the whole page stuck at opacity 0. A plain interval keeps running when
       hidden, so the content always ends up visible.

       The test is deliberately "has the element reached the trigger line",
       not "is the element on screen". A poll only sees the scroll position at
       the instant it runs, so a fast scroll — or a throttled tab where the
       poll is a second apart — can step clean over an element without it ever
       being inside the viewport. Requiring r.bottom > 0 would strand those
       at opacity 0 permanently, since nothing ever brings them back into view. */
    var pending = items.slice();

    function sweep() {
      if (!pending.length) {
        window.clearInterval(poll);
        return;
      }
      var h = window.innerHeight || document.documentElement.clientHeight;
      pending = pending.filter(function (el) {
        if (el.classList.contains('is-in')) return false;
        // A hidden tab panel reports an all-zero rect; treat it as reached so
        // its contents are ready the moment the panel is shown.
        if (el.getBoundingClientRect().top < h * 0.92) {
          el.classList.add('is-in');
          io.unobserve(el);
          return false;
        }
        return true;
      });
    }

    window.addEventListener('scroll', sweep, { passive: true });
    window.addEventListener('resize', sweep);
    window.addEventListener('load', sweep);
    window.addEventListener('visibilitychange', function () {
      if (!document.hidden) sweep();
    });
    var poll = window.setInterval(sweep, 400);
    sweep();
  })();

  /* ------------------------------------------------------------------
     7. Count-up statistics
     ------------------------------------------------------------------ */
  (function counters() {
    var nums = $$('[data-count]');
    if (!nums.length) return;

    function run(el) {
      var target = parseFloat(el.dataset.count);
      var suffix = el.dataset.suffix || '';
      if (REDUCED || el.dataset.done === '1') { el.textContent = target + suffix; return; }
      el.dataset.done = '1';

      var duration = 1700;
      var start = null;
      function step() {
        // requestAnimationFrame is throttled to a stop while the document is
        // hidden, which would freeze the count at 0 and block `done` from
        // ever retrying. Driving the tween off a timer keeps it correct in
        // background tabs and prerendered documents.
        if (start === null) start = performance.now();
        var p = Math.min((performance.now() - start) / duration, 1);
        var eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);   // easeOutExpo
        el.textContent = Math.round(target * eased) + suffix;
        if (p < 1) window.setTimeout(step, 32);
      }
      step();
    }

    if (!('IntersectionObserver' in window)) {
      nums.forEach(run);
      return;
    }

    var pending = nums.slice();
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        run(entry.target);
        pending = pending.filter(function (el) { return el !== entry.target; });
        io.unobserve(entry.target);
      });
    }, { threshold: 0.6 });
    nums.forEach(function (el) { io.observe(el); });

    /* Same backstop as the reveal module: IntersectionObserver is silent
       while the document is hidden, which would leave the stats at "0".
       Same one-sided test — an element the poll steps over must still count,
       and a counter that is never run stays stuck at its markup value. */
    function sweep() {
      if (!pending.length) { window.clearInterval(poll); return; }
      var h = window.innerHeight || document.documentElement.clientHeight;
      pending = pending.filter(function (el) {
        if (el.getBoundingClientRect().top < h) {
          run(el);
          io.unobserve(el);
          return false;
        }
        return true;
      });
    }
    window.addEventListener('scroll', sweep, { passive: true });
    window.addEventListener('visibilitychange', function () { if (!document.hidden) sweep(); });
    var poll = window.setInterval(sweep, 400);
    sweep();
  })();

  /* ------------------------------------------------------------------
     8. Parallax — decorative layers drift against the scroll

       The offset is written to --py, which CSS applies through the
       independent `translate` property, so it composes with the `transform`
       animations on the same elements (the spinning hero and CTA rings)
       instead of overwriting them.
     ------------------------------------------------------------------ */
  (function parallax() {
    var layers = $$('[data-parallax]');
    if (!layers.length || REDUCED) return;

    var ticking = false;
    function update() {
      var vh = window.innerHeight || document.documentElement.clientHeight;
      for (var i = 0; i < layers.length; i++) {
        var el = layers[i];
        var r = el.getBoundingClientRect();
        if (!r.height) continue;                 // display:none at this breakpoint
        if (r.bottom < -240 || r.top > vh + 240) continue;   // far off-screen
        var depth = parseFloat(el.dataset.depth);
        if (isNaN(depth)) depth = 0.12;
        var centre = r.top + r.height / 2;
        el.style.setProperty('--py', ((centre - vh / 2) * -depth).toFixed(2) + 'px');
      }
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }, { passive: true });
    window.addEventListener('resize', update);
    update();
  })();

  /* ------------------------------------------------------------------
     9. Cursor glow in the hero
     ------------------------------------------------------------------ */
  (function cursorGlow() {
    if (REDUCED || !FINE) return;
    var hero = $('.hero');
    if (!hero) return;

    var raf = null, x = 0, y = 0;
    hero.addEventListener('pointermove', function (e) {
      x = e.clientX; y = e.clientY;
      if (raf) return;
      raf = window.requestAnimationFrame(function () {
        var r = hero.getBoundingClientRect();
        if (!r.width || !r.height) { raf = null; return; }
        hero.style.setProperty('--gx', (((x - r.left) / r.width) * 100).toFixed(2) + '%');
        hero.style.setProperty('--gy', (((y - r.top) / r.height) * 100).toFixed(2) + '%');
        raf = null;
      });
    }, { passive: true });
    hero.addEventListener('pointerenter', function () { hero.classList.add('is-pointer'); });
    hero.addEventListener('pointerleave', function () { hero.classList.remove('is-pointer'); });
  })();

  /* ------------------------------------------------------------------
     10. 3D card tilt
     ------------------------------------------------------------------ */
  (function tilt() {
    if (REDUCED || !FINE) return;
    var cards = $$('.tilt');
    if (!cards.length) return;

    var MAX = 4;   // degrees at the card edge

    cards.forEach(function (el) {
      var raf = null, px = 0, py = 0;

      function apply() {
        el.style.setProperty('--tiltX', (py * MAX).toFixed(2) + 'deg');
        el.style.setProperty('--tiltY', (px * MAX).toFixed(2) + 'deg');
        raf = null;
      }

      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        if (!r.width || !r.height) return;
        px = ((e.clientX - r.left) / r.width) * 2 - 1;
        py = ((e.clientY - r.top) / r.height) * 2 - 1;
        if (!raf) raf = window.requestAnimationFrame(apply);
      }, { passive: true });

      el.addEventListener('pointerleave', function () {
        el.style.setProperty('--tiltX', '0deg');
        el.style.setProperty('--tiltY', '0deg');
      });
    });
  })();

  /* ------------------------------------------------------------------
     11. Magnetic buttons

       The un-translated rect is captured on pointerenter. Measuring inside
       pointermove would feed the button's own offset back into the maths and
       the button would chase the cursor with growing amplitude.
     ------------------------------------------------------------------ */
  (function magneticButtons() {
    if (REDUCED || !FINE) return;
    var buttons = $$('.btn');
    if (!buttons.length) return;

    buttons.forEach(function (btn) {
      var raf = null, box = null;

      function apply() {
        btn.style.setProperty('--mx', dx.toFixed(2) + 'px');
        btn.style.setProperty('--my', dy.toFixed(2) + 'px');
        raf = null;
      }
      var dx = 0, dy = 0;

      btn.addEventListener('pointerenter', function () {
        var r = btn.getBoundingClientRect();
        box = { l: r.left, t: r.top, w: r.width, h: r.height };
      });

      btn.addEventListener('pointermove', function (e) {
        if (!box) return;
        dx = (e.clientX - (box.l + box.w / 2)) * 0.28;
        dy = (e.clientY - (box.t + box.h / 2)) * 0.35;
        if (!raf) raf = window.requestAnimationFrame(apply);
      }, { passive: true });

      btn.addEventListener('pointerleave', function () {
        box = null; dx = 0; dy = 0;
        btn.style.setProperty('--mx', '0px');
        btn.style.setProperty('--my', '0px');
      });
    });
  })();

  /* ------------------------------------------------------------------
     12. About tabs
     ------------------------------------------------------------------ */
  (function tabs() {
    var tabList = $$('.tab');
    if (!tabList.length) return;

    function select(tab) {
      tabList.forEach(function (t) {
        var active = t === tab;
        t.classList.toggle('is-active', active);
        t.setAttribute('aria-selected', String(active));
        t.tabIndex = active ? 0 : -1;
        var panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel) {
          panel.hidden = !active;
          panel.classList.toggle('is-active', active);
        }
      });
    }

    tabList.forEach(function (tab, i) {
      tab.addEventListener('click', function () { select(tab); });
      tab.addEventListener('keydown', function (e) {
        var next = null;
        if (e.key === 'ArrowRight') next = tabList[(i + 1) % tabList.length];
        if (e.key === 'ArrowLeft')  next = tabList[(i - 1 + tabList.length) % tabList.length];
        if (e.key === 'Home')       next = tabList[0];
        if (e.key === 'End')        next = tabList[tabList.length - 1];
        if (!next) return;
        e.preventDefault();
        select(next);
        next.focus();
      });
    });
  })();

  /* ------------------------------------------------------------------
     13. Testimonial carousel

       The active dot fills across the autoplay interval. It is driven from
       the same clock as the slide change rather than a CSS animation, so
       pausing on hover cannot leave the fill and the timer out of step.
     ------------------------------------------------------------------ */
  (function carousel() {
    var root = $('#quoteSlider');
    var track = $('#quoteTrack');
    if (!root || !track) return;

    var slides = $$('.slide', track);
    var dotsWrap = $('#quoteDots');
    if (slides.length < 2) return;

    var index = 0;
    var timer = null;
    var DELAY = 6000;
    var startedAt = 0;

    var dots = slides.map(function (_, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'dot-btn';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-label', 'Testimonial ' + (i + 1));
      b.appendChild(document.createElement('i'));
      b.addEventListener('click', function () { go(i); restart(); });
      if (dotsWrap) dotsWrap.appendChild(b);
      return b;
    });

    function fill(i) {
      for (var k = 0; k < dots.length; k++) {
        var bar = dots[k].firstChild;
        if (bar) bar.style.width = (k === i) ? fill.pct + '%' : '0%';
      }
    }
    fill.pct = 0;

    function render() {
      track.style.transform = 'translateX(' + (-index * 100) + '%)';
      dots.forEach(function (d, i) {
        d.classList.toggle('is-active', i === index);
        d.setAttribute('aria-selected', String(i === index));
      });
      slides.forEach(function (s, i) {
        s.setAttribute('aria-hidden', String(i !== index));
        // keep off-screen quotes out of the tab order
        $$('a, button', s).forEach(function (el) { el.tabIndex = i === index ? 0 : -1; });
      });
    }

    function go(i) {
      index = (i + slides.length) % slides.length;
      startedAt = 0;
      fill.pct = 0;
      render();
      fill(index);
    }
    function next() { go(index + 1); }
    function prev() { go(index - 1); }

    function pump() {
      if (!startedAt) startedAt = performance.now();
      // read the clock rather than accumulating a tick size, so a throttled
      // background tab still advances at the right rate
      fill.pct = Math.min((performance.now() - startedAt) / DELAY, 1);
      fill(index);
      if (fill.pct >= 1) go(index + 1);
    }

    function start() { if (!REDUCED) timer = window.setInterval(pump, 120); }
    function stop()  { window.clearInterval(timer); timer = null; }
    function restart() { stop(); startedAt = 0; fill.pct = 0; fill(index); start(); }

    var prevBtn = $('#quotePrev');
    var nextBtn = $('#quoteNext');
    if (prevBtn) prevBtn.addEventListener('click', function () { prev(); restart(); });
    if (nextBtn) nextBtn.addEventListener('click', function () { next(); restart(); });

    root.addEventListener('mouseenter', stop);
    root.addEventListener('mouseleave', start);
    root.addEventListener('focusin', stop);
    root.addEventListener('focusout', function (e) {
      if (!root.contains(e.relatedTarget)) start();
    });

    // touch / pointer swipe
    var startX = 0, dragging = false;
    root.addEventListener('touchstart', function (e) {
      startX = e.touches[0].clientX; dragging = true; stop();
    }, { passive: true });
    root.addEventListener('touchend', function (e) {
      if (!dragging) return;
      dragging = false;
      var dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 45) { dx < 0 ? next() : prev(); }
      start();
    });

    // pause when off-screen
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries[0].isIntersecting ? start() : stop();
      }, { threshold: 0.25 }).observe(root);
    } else {
      start();
    }

    go(0);
  })();

  /* ------------------------------------------------------------------
     14. Client logo marquee — clone the track for a seamless loop
     ------------------------------------------------------------------ */
  (function marquee() {
    var host = $('[data-marquee]');
    var track = $('#logoTrack');
    if (!host || !track || REDUCED) return;

    var clone = track.cloneNode(true);
    clone.classList.add('is-clone');
    // A deep clone carries every id across, which duplicates them in the
    // document and makes id lookups ambiguous. Strip them from the copy —
    // the original keeps #logoTrack, which is what the module selects on.
    Array.prototype.forEach.call(clone.querySelectorAll('[id]'), function (el) {
      el.removeAttribute('id');
    });
    clone.removeAttribute('id');
    clone.setAttribute('aria-hidden', 'true');
    Array.prototype.forEach.call(clone.querySelectorAll('a, button, input'), function (el) {
      el.setAttribute('tabindex', '-1');
    });
    track.parentNode.appendChild(clone);
  })();

  /* ------------------------------------------------------------------
     15. Search overlay — filters a small index of on-page destinations
     ------------------------------------------------------------------ */
  (function search() {
    var open = $('#searchOpen');
    var panel = $('#searchPanel');
    var input = $('#searchInput');
    var results = $('#searchResults');
    if (!open || !panel || !input || !results) return;

    /* Every page sits in the same directory, so in-page destinations are
       rooted with `index.html` when the visitor is NOT already on the
       homepage. On the homepage the prefix stays empty, which keeps the
       smooth-scroll behaviour. */
    var HERE = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    var HOME = HERE === 'index.html' ? '' : 'index.html';

    var INDEX = [
      { t: 'SaaS Product Development',      s: 'Services',      h: HOME + 'service-saas-product-development.html' },
      { t: 'Custom Web & Mobile Apps',      s: 'Services',      h: HOME + 'service-custom-web-mobile-apps.html' },
      { t: 'UI/UX & Design Systems',        s: 'Services',      h: HOME + 'service-ui-ux-design-systems.html' },
      { t: 'Cloud, DevOps & Reliability',   s: 'Services',      h: HOME + 'service-cloud-devops-reliability.html' },
      { t: 'API & Systems Integration',     s: 'Services',      h: HOME + 'service-api-systems-integration.html' },
      { t: 'Data & Analytics Platforms',    s: 'Services',      h: HOME + 'service-data-analytics-platforms.html' },
      { t: 'Legacy Modernisation',          s: 'Services',      h: HOME + 'service-legacy-modernisation.html' },
      { t: 'Managed Support & AMS',         s: 'Services',      h: HOME + 'service-managed-support-ams.html' },
      { t: 'All services',                  s: 'Services',      h: HOME + 'services.html' },
      { t: 'About Desat',                   s: 'Company',       h: HOME + 'about.html' },
      { t: 'Careers',                       s: 'Company',       h: HOME + 'careers.html' },
      { t: 'Case studies',                  s: 'Company',       h: HOME + 'case-studies.html' },
      { t: 'Blog',                          s: 'Company',       h: HOME + 'blog.html' },
      { t: 'Contact us',                    s: 'Get in touch',  h: HOME + 'contact.html' },
      { t: 'Product Strategy & Discovery',  s: 'About — Product',  h: HOME + '#about' },
      { t: 'Engineering',                   s: 'About — Tabs',     h: HOME + '#about' },
      { t: 'Cloud & Scale',                 s: 'About — Tabs',     h: HOME + '#about' },
      { t: 'Why Choose Desat',              s: 'Why us',        h: HOME + '#why' },
      { t: 'Senior Engineers, Always',      s: 'Why us',        h: HOME + '#why' },
      { t: 'Security & Compliance by Default', s: 'Why us',     h: HOME + '#why' },
      { t: 'Transparent Delivery',          s: 'Why us',        h: HOME + '#why' },
      { t: 'Proven Delivery Record',        s: 'Why us',        h: HOME + '#why' },
      { t: 'Design-Led Engineering',        s: 'Why us',        h: HOME + '#why' },
      { t: 'One Team, End to End',          s: 'Why us',        h: HOME + '#why' },
      { t: 'Client Testimonials',           s: 'Clients',       h: HOME + '#testimonials' },
      { t: 'Healthcare',                    s: 'Industry',      h: HOME + '#industries' },
      { t: 'Government',                    s: 'Industry',      h: HOME + '#industries' },
      { t: 'Retail & E-commerce',           s: 'Industry',      h: HOME + '#industries' },
      { t: 'Manufacturing',                 s: 'Industry',      h: HOME + '#industries' },
      { t: 'Technology',                    s: 'Industry',      h: HOME + '#industries' },
      { t: 'Energy & Utilities',            s: 'Industry',      h: HOME + '#industries' },
      { t: 'Start Your Project',            s: 'Get in touch',  h: HOME + 'contact.html' }
    ];

    function esc(str) { return str.replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    }); }

    function render(q) {
      var term = q.trim().toLowerCase();
      var matches = term
        ? INDEX.filter(function (r) {
            return (r.t + ' ' + r.s).toLowerCase().indexOf(term) > -1;
          })
        : INDEX.slice(0, 8);

      results.innerHTML = matches.length
        ? matches.map(function (r) {
            var label = term
              ? esc(r.t).replace(new RegExp('(' + term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'i'), '<mark>$1</mark>')
              : esc(r.t);
            return '<li role="option"><a href="' + r.h + '">' + label + '<small>' + esc(r.s) + '</small></a></li>';
          }).join('')
        : '<li role="option"><a href="#contact">No matches — ask us instead<small>Get in touch</small></a></li>';
    }

    function show() {
      panel.hidden = false;
      document.body.classList.add('is-locked');
      /* Flush layout while the panel is still at opacity 0, then flip the
         class in the same tick. Doing this inside requestAnimationFrame
         instead leaves a window where the overlay is displayed but not yet
         interactive, because .search:not(.is-open) has pointer-events off. */
      void panel.offsetWidth;
      panel.classList.add('is-open');
      input.focus();
      render('');
    }

    function hide() {
      panel.classList.remove('is-open');
      document.body.classList.remove('is-locked');
      window.setTimeout(function () { panel.hidden = true; }, 220);
      open.focus();
    }

    open.addEventListener('click', show);
    var close = $('#searchClose');
    if (close) close.addEventListener('click', hide);
    panel.addEventListener('click', function (e) { if (e.target === panel) hide(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !panel.hidden) hide();
    });

    input.addEventListener('input', function () { render(input.value); });
    $('#searchForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var first = $('a', results);
      if (first) first.click();
    });

    results.addEventListener('click', function (e) {
      var a = e.target.closest('a');
      if (a) hide();
    });
  })();

  /* ------------------------------------------------------------------
     16. Smooth anchor scrolling with a sticky-header offset
     ------------------------------------------------------------------ */
  (function smoothScroll() {
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a) return;

      var id = a.getAttribute('href');
      if (!id || id === '#') return;

      var target = document.getElementById(id.slice(1));
      if (!target) return;

      e.preventDefault();
      target.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' });
      if (history.replaceState) history.replaceState(null, '', id);
    });
  })();

  /* ------------------------------------------------------------------
     17. Footer year
     ------------------------------------------------------------------ */
  (function year() {
    var el = $('#year');
    if (el) el.textContent = String(new Date().getFullYear());
  })();

  /* ------------------------------------------------------------------
     18. Contact form

     The site is static, so there is no server to POST to. Rather than ship
     a form that silently fails, submit composes a mailto: link with the
     fields pre-filled and hands it to the visitor's mail client. The
     markup still carries action="mailto:..." so the form degrades to a
     plain (if ugly) mailto submit when this script does not run.

     The handler is delegated from the document rather than bound to the one
     #contactForm in the index, because the contact page is also rendered
     from inside the page viewer (module 20) long after this code ran. Every
     field is scoped to the form that submitted it, so the two copies never
     read each other's values.
     ------------------------------------------------------------------ */
  (function contactForm() {
    var TO = 'desatinfotech@gmail.com';

    document.addEventListener('submit', function (e) {
      var form = e.target;
      if (!form || !form.matches || !form.matches('form[id$="contactForm"]')) return;
      e.preventDefault();

      /* The browser has already run constraint validation by this point
         because the submit event only fires for a valid form. */
      var val = function (name) {
        var el = form.querySelector('[name="' + name + '"]');
        return el ? el.value : '';
      };
      var name = val('name');
      var email = val('email');
      var company = val('company');
      var topic = val('topic');
      var message = val('message');

      var subject = 'Enquiry: ' + (topic || 'General');
      var body = [
        name ? 'Name: ' + name : '',
        email ? 'Email: ' + email : '',
        company ? 'Company: ' + company : '',
        topic ? 'Topic: ' + topic : '',
        '',
        message
      ].filter(Boolean).join('\n');

      var href = 'mailto:' + TO +
        '?subject=' + encodeURIComponent(subject) +
        '&body=' + encodeURIComponent(body);

      var note = form.querySelector('.pform__note');
      if (note) note.textContent = 'Opening your email client with the message pre-filled. Nothing is sent from the browser.';

      window.location.href = href;
    });
  })();

  /* ------------------------------------------------------------------
     19. Service rows — expand and collapse in place

       Rows open independently rather than as a one-at-a-time accordion:
       closing the row a visitor just opened because they clicked a second
       one is the kind of surprise a comparison shopper does not want.

       aria-expanded is the source of truth. It is what assistive technology
       announces, and .is-open (which the CSS expands from) is derived from
       it, so the two can never drift apart.

       Ownership: this module writes --rgx / --rgy (the pointer spotlight)
       and --i (the panel's stagger index). Nothing else touches them.
     ------------------------------------------------------------------ */
  (function serviceRows() {
    var host = $('[data-srows]');
    if (!host) return;

    var rows = $$('.srow', host);
    if (!rows.length) return;

    function toggle(row, open) {
      var btn = $('.srow__toggle', row);
      if (!btn) return;
      row.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');

      /* give every card in the panel its own slot in the stagger. Written
         once per toggle rather than baked into the markup because the index
         is only meaningful to this row. */
      if (open) {
        $$('.pcard, .pstep', row).forEach(function (el, k) {
          el.style.setProperty('--i', String(k));
        });
      }
    }

    rows.forEach(function (row) {
      var btn = $('.srow__toggle', row);
      if (!btn) return;
      btn.addEventListener('click', function () {
        toggle(row, !row.classList.contains('is-open'));
      });
    });

    /* Pointer spotlight. Only bound to a real pointer on a device that
       hovers, so touch devices never pay for a listener they cannot fire. */
    if (FINE && !REDUCED) {
      rows.forEach(function (row) {
        row.addEventListener('pointermove', function (e) {
          var r = row.getBoundingClientRect();
          if (!r.width) return;
          row.style.setProperty('--rgx', (((e.clientX - r.left) / r.width) * 100).toFixed(2) + '%');
          row.style.setProperty('--rgy', (((e.clientY - r.top) / r.height) * 100).toFixed(2) + '%');
        });
      });
    }
  })();

  /* ------------------------------------------------------------------
     20. Page viewer — every internal link resolves inside this document

       The site is normally reached as a single file from a preview panel,
       where the sibling pages are not addressable at all: clicking a plain
       href to about.html produced "no url found". So index.html carries a
       JSON island of all sixteen pages' <main> markup, and this module
       renders it into the native <dialog> above instead of navigating.

       Three deliberate safety valves, in order:

         1. It only intercepts a link whose target is in the island. Any
            other href is left completely alone.
         2. With scripting off nothing runs here at all, so the hrefs are
            followed normally and the pages open as real documents.
         3. A link to service-x.html goes to the matching row rather than a
            second copy of the same content, so the homepage is the only
            place that content lives.

       Native <dialog>.showModal() supplies the focus trap, Escape,
       inertness behind the overlay and the backdrop. None of it is
       hand-rolled.
     ------------------------------------------------------------------ */
  (function pageViewer() {
    var host = $('#siteData');
    var dlg = $('#pageView');
    var body = $('#pvBody');
    var crumb = $('#pvCrumb');
    if (!host || !dlg || !body || typeof dlg.showModal !== 'function') return;

    var data;
    try {
      data = JSON.parse(host.textContent);
    } catch (err) {
      return;                      // a malformed island must never break the page
    }
    if (!data || !data.pages) return;

    var HERE = location.pathname.split('/').pop() || 'index.html';
    var IS_HOME = HERE === 'index.html';

    /* Resolve a href to a sibling file, or null to opt out entirely. */
    function siblingFile(href) {
      var f = href.split('#')[0].split('?')[0];
      if (!f) return HERE;                       // a bare "#anchor"
      if (/^[a-z][a-z0-9+.-]*:/i.test(f)) return null;   // http:, mailto:, tel:
      if (f.indexOf('/') > -1) return null;      // not a sibling file
      if (!/\.html?$/i.test(f)) return null;
      return f;
    }

    function closeViewer() {
      if (dlg.open) dlg.close();
    }

    function open(file) {
      var main = data.pages[file];
      if (!main) return false;
      body.innerHTML = main;
      crumb.textContent = (data.titles && data.titles[file]) || file;
      body.scrollTop = 0;
      if (!dlg.open) dlg.showModal();
      body.focus({ preventScroll: true });
      return true;
    }

    document.addEventListener('click', function (e) {
      if (e.defaultPrevented) return;
      // let modified clicks fall through to the browser's own new-tab behaviour
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      var el = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (!el) return;
      if (el.target === '_blank' || el.hasAttribute('download')) return;

      var href = el.getAttribute('href');
      if (!href || href.charAt(0) === '#') return;         // plain in-page anchor
      if (el.hostname && el.hostname !== location.hostname) return;

      var file = siblingFile(href);
      if (!file) return;

      /* "Home" from inside the overlay should close it, not reload. */
      if (file === HERE) {
        if (IS_HOME && dlg.open) {
          e.preventDefault();
          closeViewer();
          return;
        }
        if (IS_HOME && href.indexOf('#') > -1) {
          e.preventDefault();
          var frag = href.split('#')[1];
          var target = frag && document.getElementById(frag);
          if (target) target.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth' });
          return;
        }
        return;
      }

      /* Only an island-known page is ever intercepted; anything else keeps
         its own href and reaches the browser unchanged. */
      if (data.pages[file]) {
        e.preventDefault();
        open(file);
      }
    });

    var closer = $('#pvClose');
    if (closer) closer.addEventListener('click', closeViewer);

    /* The dialog's close event is queued as a task, so it can land *after*
       the viewer has already been reopened with fresh content. Clearing
       unconditionally then wipes what was just rendered — which is exactly
       the failure mode the site was rebuilt to avoid. Only reset while the
       dialog is genuinely shut. */
    dlg.addEventListener('close', function () {
      if (!dlg.open) body.innerHTML = '';
    });

    /* Clicking the backdrop dismisses: the event target is the <dialog>
       itself only when the click landed on the scrim. */
    dlg.addEventListener('click', function (e) {
      if (e.target === dlg) closeViewer();
    });
  })();

  /* ------------------------------------------------------------------
     21. 3D Flowing Cyber Particle Wave & IT Objects in the Hero
     ------------------------------------------------------------------ */
  (function heroParticleWave() {
    var canvas = document.getElementById('heroWaveCanvas');
    if (!canvas) return;

    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var hero = canvas.closest('.hero') || canvas.parentNode;
    var animId = null;
    var isRunning = false;
    var isVisible = true;
    var width = 0;
    var height = 0;
    var dpr = 1;

    // Grid resolution for wave mesh
    var COLS = 48; // horizontal vertices per ribbon
    var ROWS = 16; // depth ribbons
    var points = [];

    // Pointer tracking with smooth easing
    var mouse = { x: -9999, y: -9999, targetX: -9999, targetY: -9999, active: false };

    // Traveling light pulses (simulating high-speed data flow across microservices)
    var packets = [
      { row: 3,  progress: 0.10, speed: 0.22, color: 'rgba(6, 182, 212, 1)',   size: 4.0 },
      { row: 6,  progress: 0.45, speed: 0.18, color: 'rgba(245, 158, 11, 1)',  size: 3.6 },
      { row: 9,  progress: 0.80, speed: 0.26, color: 'rgba(196, 181, 253, 1)', size: 3.4 },
      { row: 12, progress: 0.30, speed: 0.16, color: 'rgba(6, 182, 212, 1)',   size: 4.2 },
      { row: 5,  progress: 0.65, speed: 0.20, color: 'rgba(245, 158, 11, 1)',  size: 3.2 },
      { row: 14, progress: 0.15, speed: 0.24, color: 'rgba(124, 58, 237, 1)',  size: 3.8 }
    ];

    // 3D Floating IT Industry Objects (Wireframe Server Blocks & Quantum Nodes)
    var itCubes = [
      { relX: 0.12, relY: 0.32, zDepth: 60,  size: 32, rx: 0.4, ry: 0.6, rz: 0.1, spdX: 0.35, spdY: 0.55, spdZ: 0.2, color: 'rgba(6, 182, 212, ' },
      { relX: 0.88, relY: 0.26, zDepth: 90,  size: 28, rx: 0.2, ry: 0.8, rz: 0.4, spdX: 0.45, spdY: 0.35, spdZ: 0.3, color: 'rgba(124, 58, 237, ' },
      { relX: 0.48, relY: 0.84, zDepth: 40,  size: 38, rx: 0.6, ry: 0.3, rz: 0.5, spdX: 0.25, spdY: 0.45, spdZ: 0.15, color: 'rgba(79, 70, 229, ' }
    ];

    // Standard 3D cube vertex coordinates (-1 to 1) and edges
    var cubeVertices = [
      [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
      [-1, -1,  1], [1, -1,  1], [1, 1,  1], [-1, 1,  1]
    ];
    var cubeEdges = [
      [0,1], [1,2], [2,3], [3,0],
      [4,5], [5,6], [6,7], [7,4],
      [0,4], [1,5], [2,6], [3,7]
    ];

    function resize() {
      var rect = hero.getBoundingClientRect();
      width = Math.max(rect.width, 320);
      height = Math.max(rect.height, 480);
      dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    }

    var resizeTimer = null;
    window.addEventListener('resize', function () {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        resize();
        if (REDUCED) render(0);
      }, 100);
    }, { passive: true });

    if (FINE) {
      hero.addEventListener('pointermove', function (e) {
        var rect = canvas.getBoundingClientRect();
        mouse.targetX = e.clientX - rect.left;
        mouse.targetY = e.clientY - rect.top;
        mouse.active = true;
      }, { passive: true });

      hero.addEventListener('pointerleave', function () {
        mouse.active = false;
      }, { passive: true });
    }

    var lastTime = 0;
    var simTime = 0;

    function render(timestamp) {
      if (!lastTime) lastTime = timestamp;
      var dt = Math.min((timestamp - lastTime) / 1000, 0.05);
      lastTime = timestamp;

      // Advance simulation time
      simTime += REDUCED ? dt * 0.2 : dt;

      // Easing mouse coordinates toward targets
      if (mouse.active) {
        mouse.x += (mouse.targetX - mouse.x) * 0.12;
        mouse.y += (mouse.targetY - mouse.y) * 0.12;
      } else {
        mouse.x += (-9999 - mouse.x) * 0.05;
        mouse.y += (-9999 - mouse.y) * 0.05;
      }

      ctx.clearRect(0, 0, width, height);

      // 1. Render 3D Floating IT Industry Objects (Wireframe Server Blocks)
      var t = simTime;
      for (var b = 0; b < itCubes.length; b++) {
        var cube = itCubes[b];
        if (!REDUCED) {
          cube.rx += cube.spdX * dt;
          cube.ry += cube.spdY * dt;
          cube.rz += cube.spdZ * dt;
        }

        var posX = width * cube.relX;
        var posY = height * cube.relY + Math.sin(t * 1.2 + b * 2) * 14;

        // Interactive mouse sway
        var cDist = Math.hypot(posX - mouse.x, posY - mouse.y);
        if (cDist < 260 && !REDUCED) {
          var sway = (1 - cDist / 260) * 18;
          posX += (posX > mouse.x ? sway : -sway);
          posY += (posY > mouse.y ? sway : -sway);
        }

        // Project 3D cube vertices
        var proj = [];
        var fov = 340;
        var cosX = Math.cos(cube.rx), sinX = Math.sin(cube.rx);
        var cosY = Math.cos(cube.ry), sinY = Math.sin(cube.ry);
        var cosZ = Math.cos(cube.rz), sinZ = Math.sin(cube.rz);

        for (var vi = 0; vi < cubeVertices.length; vi++) {
          var v = cubeVertices[vi];
          var x0 = v[0] * cube.size;
          var y0 = v[1] * cube.size;
          var z0 = v[2] * cube.size;

          // Rotation around Y
          var x1 = x0 * cosY + z0 * sinY;
          var z1 = -x0 * sinY + z0 * cosY;
          // Rotation around X
          var y2 = y0 * cosX - z1 * sinX;
          var z2 = y0 * sinX + z1 * cosX;
          // Rotation around Z
          var x3 = x1 * cosZ - y2 * sinZ;
          var y3 = x1 * sinZ + y2 * cosZ;

          var depth = cube.zDepth + z2;
          var scale = fov / (fov + depth);
          proj.push({
            x: posX + x3 * scale,
            y: posY + y3 * scale,
            scale: scale
          });
        }

        // Draw cube edges with neon glow
        ctx.beginPath();
        for (var ei = 0; ei < cubeEdges.length; ei++) {
          var e1 = proj[cubeEdges[ei][0]];
          var e2 = proj[cubeEdges[ei][1]];
          ctx.moveTo(e1.x, e1.y);
          ctx.lineTo(e2.x, e2.y);
        }
        ctx.lineWidth = 1.3;
        ctx.strokeStyle = cube.color + '0.55)';
        ctx.stroke();

        // Glowing vertices
        for (var pi = 0; pi < proj.length; pi++) {
          var pt = proj[pi];
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 2.2 * pt.scale, 0, Math.PI * 2);
          ctx.fillStyle = cube.color + '0.9)';
          ctx.fill();
        }

        // Luminous server core
        var corePulse = 1 + 0.3 * Math.sin(t * 3 + b * 1.5);
        var coreGrad = ctx.createRadialGradient(posX, posY, 0, posX, posY, cube.size * 1.4 * corePulse);
        coreGrad.addColorStop(0, cube.color + '0.45)');
        coreGrad.addColorStop(0.5, cube.color + '0.15)');
        coreGrad.addColorStop(1, cube.color + '0)');
        ctx.beginPath();
        ctx.arc(posX, posY, cube.size * 1.4 * corePulse, 0, Math.PI * 2);
        ctx.fillStyle = coreGrad;
        ctx.fill();
      }

      // 2. Calculate 3D Undulating Wave Grid Points
      points = [];
      for (var r = 0; r < ROWS; r++) {
        var rowPoints = [];
        var v = r / (ROWS - 1); // 0 (far) to 1 (near foreground)

        var yBase = height * (0.24 + v * 0.64);
        var lateralSpread = width * (1.20 + v * 0.18);
        var xOffset = (width - lateralSpread) * 0.5;

        for (var c = 0; c < COLS; c++) {
          var u = c / (COLS - 1);

          var px = xOffset + u * lateralSpread;

          // Harmonic multi-wave calculation
          var w1 = Math.sin(u * 4.6 + t * 1.8 + v * 2.4) * 40;
          var w2 = Math.cos(u * 7.5 - t * 1.2 + v * 1.6) * 24;
          var w3 = Math.sin((u * 2.6 + v * 3.6) - t * 0.9) * 18;
          var w4 = Math.sin(u * 12.0 + t * 2.4) * 8;

          var taper = Math.sin(u * Math.PI);
          var waveHeight = (w1 + w2 + w3 + w4) * taper * (0.6 + 0.6 * v);

          // Interactive 3D mouse ripple / magnetic displacement
          var mouseDist = Math.hypot(px - mouse.x, yBase - mouse.y);
          var mouseRadius = 260;
          if (mouseDist < mouseRadius && !REDUCED) {
            var mFactor = Math.pow(1 - mouseDist / mouseRadius, 2);
            waveHeight += Math.sin(mouseDist * 0.04 - t * 5) * mFactor * 36;
          }

          var py = yBase - waveHeight;

          rowPoints.push({
            x: px,
            y: py,
            u: u,
            v: v,
            elevation: waveHeight,
            mouseDist: mouseDist
          });
        }
        points.push(rowPoints);
      }

      // Draw vertical cyber matrix interconnects
      ctx.lineWidth = 1;
      for (var c = 2; c < COLS - 2; c += 4) {
        ctx.beginPath();
        for (var r = 0; r < ROWS; r++) {
          var pt = points[r][c];
          if (r === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        var strutAlpha = (0.05 + 0.09 * Math.sin(c * 0.8 + t)) * Math.sin((c / COLS) * Math.PI);
        ctx.strokeStyle = 'rgba(124, 58, 237, ' + Math.max(0, strutAlpha).toFixed(3) + ')';
        ctx.stroke();
      }

      // Draw flowing wave ribbons
      for (var r = 0; r < ROWS; r++) {
        var v = r / (ROWS - 1);
        var rPts = points[r];

        var alpha = 0.18 + v * 0.48;
        var lineWidth = 0.9 + v * 1.6;

        var grad = ctx.createLinearGradient(0, 0, width, 0);
        grad.addColorStop(0, 'rgba(79, 70, 229, 0)');
        grad.addColorStop(0.16, 'rgba(79, 70, 229, ' + (alpha * 0.8).toFixed(3) + ')');
        grad.addColorStop(0.48, 'rgba(124, 58, 237, ' + (alpha * 1.15).toFixed(3) + ')');
        grad.addColorStop(0.82, 'rgba(6, 182, 212, ' + (alpha * 1.0).toFixed(3) + ')');
        grad.addColorStop(1, 'rgba(6, 182, 212, 0)');

        ctx.beginPath();
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = grad;

        ctx.moveTo(rPts[0].x, rPts[0].y);
        for (var i = 1; i < rPts.length - 1; i++) {
          var midX = (rPts[i].x + rPts[i + 1].x) * 0.5;
          var midY = (rPts[i].y + rPts[i + 1].y) * 0.5;
          ctx.quadraticCurveTo(rPts[i].x, rPts[i].y, midX, midY);
        }
        ctx.lineTo(rPts[rPts.length - 1].x, rPts[rPts.length - 1].y);
        ctx.stroke();

        // Particle nodes along ribbon
        for (var i = 2; i < rPts.length - 2; i += 3) {
          var p = rPts[i];
          var taper = Math.sin(p.u * Math.PI);
          if (taper < 0.1) continue;

          var baseRadius = 1.2 + 2.0 * v;
          var pPulse = Math.sin(p.u * 8 + t * 2.5 + r * 0.6);
          var rad = baseRadius * (1 + 0.25 * pPulse);
          var pAlpha = (0.22 + 0.55 * v + 0.2 * pPulse) * taper;

          // Mouse proximity boost
          if (p.mouseDist < 180 && !REDUCED) {
            var boost = 1 - p.mouseDist / 180;
            rad += boost * 2.6;
            pAlpha = Math.min(1, pAlpha + boost * 0.55);
          }

          ctx.beginPath();
          ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
          ctx.fillStyle = (i % 6 === 0)
            ? 'rgba(6, 182, 212, ' + pAlpha.toFixed(3) + ')'
            : 'rgba(124, 58, 237, ' + pAlpha.toFixed(3) + ')';
          ctx.fill();

          // Soft glow halo on key beacon nodes
          if (i % 9 === 0 && v > 0.35) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, rad * 3.8, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(124, 58, 237, ' + (pAlpha * 0.28).toFixed(3) + ')';
            ctx.fill();
          }
        }
      }

      // 3. Render Traveling Data Packets (Luminous Cloud/API Pulses)
      if (!REDUCED) {
        for (var k = 0; k < packets.length; k++) {
          var pkt = packets[k];
          pkt.progress = (pkt.progress + pkt.speed * dt) % 1.0;

          var targetRow = points[pkt.row];
          if (!targetRow) continue;

          var exactIndex = pkt.progress * (COLS - 1);
          var i0 = Math.floor(exactIndex);
          var i1 = Math.min(i0 + 1, COLS - 1);
          var fract = exactIndex - i0;

          var p0 = targetRow[i0];
          var p1 = targetRow[i1];
          if (!p0 || !p1) continue;

          var curX = p0.x + (p1.x - p0.x) * fract;
          var curY = p0.y + (p1.y - p0.y) * fract;
          var pktTaper = Math.sin(pkt.progress * Math.PI);
          if (pktTaper < 0.05) continue;

          // Radial energy halo
          var glowGrad = ctx.createRadialGradient(curX, curY, 0, curX, curY, pkt.size * 6);
          glowGrad.addColorStop(0, pkt.color);
          glowGrad.addColorStop(0.35, pkt.color.replace('1)', '0.55)'));
          glowGrad.addColorStop(1, 'rgba(79, 70, 229, 0)');

          ctx.beginPath();
          ctx.arc(curX, curY, pkt.size * 6, 0, Math.PI * 2);
          ctx.fillStyle = glowGrad;
          ctx.fill();

          // Intense core spark
          ctx.beginPath();
          ctx.arc(curX, curY, pkt.size * pktTaper, 0, Math.PI * 2);
          ctx.fillStyle = '#FFFFFF';
          ctx.shadowColor = pkt.color;
          ctx.shadowBlur = 12;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      if (isRunning && isVisible && !REDUCED) {
        animId = window.requestAnimationFrame(render);
      }
    }

    function start() {
      if (isRunning) return;
      isRunning = true;
      lastTime = 0;
      animId = window.requestAnimationFrame(render);
    }

    function stop() {
      isRunning = false;
      if (animId) {
        window.cancelAnimationFrame(animId);
        animId = null;
      }
    }

    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          isVisible = entry.isIntersecting;
          if (isVisible) {
            if (!REDUCED && !isRunning) start();
            else if (REDUCED) render(0);
          } else {
            stop();
          }
        });
      }, { threshold: 0.05 });
      observer.observe(hero);
    }

    resize();
    if (REDUCED) {
      render(0);
    } else {
      start();
    }
  })();

})();

