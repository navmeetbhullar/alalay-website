/* lens-host.js - PLUGS THE ENGINE IN. The same file in all three places.

   lens-engine.js is the approved reference engine, byte for byte, and is never
   edited. This file is the only glue around it, and it changes only what the
   brief allows:
     - a set(state) call, with the app's state names mapped to the engine's;
     - the real microphone level instead of the pretend voice;
     - real task progress (lens.prog, 0..1, or null when the steps are unknown);
     - the canvas size (the canvas is sized by the page's CSS);
     - the real cursor position for the Eyes;
     - the real idle times: still after 10 s, deep sleep after 10 min.
   Everything else - colours, sizes, springs, timings, glass - is the engine's.

   The loop is the reference page's loop (3 sub-steps a frame, pause while
   hidden), plus one thing for a desktop app: when no lens has moved for a
   while it stops asking for frames and only ticks the clock 4 times a second,
   so a resting lens costs almost nothing. It wakes the moment anything moves.

   Load order: lens-states.js, lens-engine.js, lens-host.js (plain scripts).

     var h = LensHost.create(canvas, { look: 'aperture', state: 'ready' });
     // { keepDone: true } for a showcase that must stay on Completed
     h.state('working');      // app names or engine names
     h.look('eyes');
     h.level(0.6);            // real mic level 0..1 (null: back to pretend)
     h.progress(0.4);         // step 2 of 5 (null: unknown)
     LensHost.cursor(x, y);   // real cursor, in this page's CSS pixels
*/
(function (root) {
  'use strict';
  /* global Lens, Breath, Eyes, MOTION, MOUSE, LensStates */
  var KIND = { aperture: Lens, breath: Breath, eyes: Eyes };
  var DONE_HOLD_MS = 5000;      // Completed goes back to Ready after about 5 s

  // The real idle times (the reference pages use short ones for the preview).
  MOTION.idleStill = 10;
  MOTION.deepSleep = 600;

  var hosts = [];
  var last = 0, raf = 0, tick = 0, calm = 0, running = false;

  function now() { return performance.now(); }

  function Host(canvas, opt) {
    opt = opt || {};
    this.cv = canvas;
    this.kind = LensStates.look(opt.look);
    this.app = null;            // the state the app asked for
    this.eng = 'ready';         // the state the engine shows
    this.lvl = null;            // real mic level, or null
    this.prog = null;
    this.doneTimer = 0;
    this.keepDone = Boolean(opt.keepDone);   // a showcase cell stays Completed
    this.seen = true; this.seenAt = 0;
    this.lastSet = now();
    this.m = new KIND[this.kind](canvas, 'ready');
    this.m.prog = null;
    hosts.push(this);
    if (opt.state) this.state(opt.state);
    wake();
  }

  Host.prototype.engineSet = function (name) {
    this.eng = name;
    this.lastSet = now();
    this.m.prog = this.prog;
    this.m.set(name);
    wake();
  };

  // set(state): app names (ready, listening, working, needsYou, completed,
  // stopped, problem) or engine names. Repeats of the same state change
  // nothing, so a run that says "working" at every step does not restart it.
  Host.prototype.state = function (appState) {
    var name = LensStates.engineState(appState);
    if (!name || appState === this.app) return this;
    this.app = appState;
    clearTimeout(this.doneTimer);
    if (name !== 'work') this.prog = null;
    if (name !== this.eng) this.engineSet(name);
    if (name === 'done' && !this.keepDone) {
      var self = this;
      this.doneTimer = setTimeout(function () { if (self.eng === 'done') self.engineSet('ready'); }, DONE_HOLD_MS);
    }
    return this;
  };
  Host.prototype.set = Host.prototype.state;

  Host.prototype.look = function (look) {
    look = LensStates.look(look);
    if (look === this.kind) return this;
    this.kind = look;
    this.m = new KIND[look](this.cv, 'ready');
    this.m.prog = this.prog;
    if (this.eng !== 'ready') this.m.set(this.eng);
    this.lastSet = now();
    wake();
    return this;
  };

  // The real microphone. The engine picks a pretend level whenever its own
  // countdown (lvlT) runs out; holding the countdown off and setting the
  // target is all it takes. Silence must be exactly 0 (the Eyes nod on it).
  Host.prototype.level = function (v) {
    if (v === null || v === undefined) { this.lvl = null; this.m.lvlT = 0; return this; }
    this.lvl = Math.max(0, Math.min(1, Number(v) || 0));
    if (this.lvl < 0.04) this.lvl = 0;
    wake();
    return this;
  };

  // Real progress: 0..1 as steps finish, or null when the steps are unknown.
  Host.prototype.progress = function (p) {
    this.prog = (p === null || p === undefined || !isFinite(p)) ? null : Math.max(0, Math.min(1, Number(p)));
    this.m.prog = this.prog;
    wake();
    return this;
  };

  Host.prototype.resize = function () { this.m.resize(); this.lastSet = now(); wake(); return this; };
  Host.prototype.destroy = function () { clearTimeout(this.doneTimer); hosts = hosts.filter(function (h) { return h !== this; }, this); };
  Host.prototype.toString = function () { return '[lens ' + this.kind + ' ' + this.eng + ']'; };

  function feed(h) {
    if (h.lvl !== null) { h.m.lvlT = Infinity; h.m.lvl.t = h.eng === 'listen' ? h.lvl : 0; }
  }

  // A canvas nobody can see (a hidden section, a closed panel) is not
  // drawn. Looked at 4 times a second, and drawn again once it shows.
  function visible(h, t) {
    if (t - h.seenAt > 250) {
      h.seenAt = t;
      var was = h.seen, cv = h.cv;
      h.seen = cv.isConnected && (cv.checkVisibility ? cv.checkVisibility({ opacityProperty: true, visibilityProperty: true }) : true);
      if (h.seen && !was) { h.m.drawnOnce = false; h.lastSet = t; }
    }
    return h.seen;
  }

  // Draw only when the engine says so AND something is actually changing.
  // Listening and Working always move (the arc spins without its springs
  // moving), and a lens that has just changed state is given a moment.
  function wantsDraw(h, t) {
    if (!visible(h, t)) return false;
    if (!h.m.W) { h.m.resize(); if (!h.m.W) return false; }
    if (!h.m.needsDraw()) return false;
    if (h.eng === 'listen' || h.eng === 'work') return true;
    if (t - h.lastSet < 1500) return true;
    return h.m.moving();
  }

  function step(dt) {
    for (var i = 0; i < hosts.length; i++) { feed(hosts[i]); }
    for (var k = 0; k < 3; k++) for (var j = 0; j < hosts.length; j++) hosts[j].m.update(dt / 3);
  }

  function paint(t) {
    var drew = 0;
    for (var i = 0; i < hosts.length; i++) {
      var h = hosts[i], m = h.m;
      var o = (m.dimv === undefined || m.dimv === null ? 1 : m.dimv).toFixed(3);
      if (m.cv.style.opacity !== o) m.cv.style.opacity = o;
      if (wantsDraw(h, t)) { m.draw(); drew++; }
    }
    return drew;
  }

  function frame(t) {
    raf = 0;
    if (!running) return;
    var dt = Math.min(0.05, (t - last) / 1000); last = t;
    step(dt);
    var drew = paint(t);
    var busy = drew > 0 || hosts.some(function (h) { return h.seen && (h.eng === 'listen' || h.eng === 'work'); });
    calm = busy ? 0 : calm + 1;
    if (document.hidden) { running = false; return; }
    if (calm > 30) { tick = setTimeout(quiet, 250); return; }   // nothing moving: rest
    raf = requestAnimationFrame(frame);
  }

  // Resting: keep the clock going (idle, deep sleep, the 15 s knock) without
  // asking for frames. Same 1/60 s sub-steps as the loop, so nothing differs.
  function quiet() {
    tick = 0;
    if (!running || document.hidden) { running = false; return; }
    var t = now(), left = Math.min(2, (t - last) / 1000); last = t;
    while (left > 0) { var dt = Math.min(1 / 60, left); step(dt); left -= dt; }
    if (hosts.some(function (h) { return wantsDraw(h, t); })) { calm = 0; last = now(); raf = requestAnimationFrame(frame); return; }
    paint(t);
    tick = setTimeout(quiet, 250);
  }

  function wake() {
    if (typeof document === 'undefined' || document.hidden) return;
    calm = 0;
    if (!running) { running = true; last = now(); }
    if (tick) { clearTimeout(tick); tick = 0; last = now(); }
    if (!raf) raf = requestAnimationFrame(frame);
  }

  document.addEventListener('visibilitychange', function () { if (!document.hidden) wake(); });
  addEventListener('resize', function () { hosts.forEach(function (h) { h.resize(); }); });
  addEventListener('scroll', function () { hosts.forEach(function (h) { h.m.rect = h.cv.getBoundingClientRect(); }); }, { passive: true });
  addEventListener('mousemove', function () { if (hosts.some(function (h) { return h.kind === 'eyes'; })) wake(); }, { passive: true });

  // Windows "Animation effects" off -> reduce motion, live, like the
  // reference page's switch: nothing spins, bounces or shakes.
  try {
    var mq = matchMedia('(prefers-reduced-motion: reduce)');
    var onMq = function () { MOTION.reduce = mq.matches; hosts.forEach(function (h) { h.m.set(h.eng); h.lastSet = now(); }); wake(); };
    if (mq.addEventListener) mq.addEventListener('change', onMq); else if (mq.addListener) mq.addListener(onMq);
  } catch (e) { /* older engines: the value read at load stays */ }

  // The real cursor, for a lens whose window does not get mouse moves of its
  // own (the widget circle never takes focus). x, y in this page's CSS pixels.
  function cursor(x, y) {
    MOUSE.x = x; MOUSE.y = y; MOUSE.on = true; MOUSE.t = now();
    hosts.forEach(function (h) { h.m.rect = h.cv.getBoundingClientRect(); });
    wake();
  }

  // Progress out of an Aether event: "Step 2 of 5: ..." notes and "2/5: ..."
  // finished steps. undefined when the event says nothing about it.
  function progressFrom(ev) {
    if (!ev || typeof ev !== 'object') return undefined;
    var m;
    if (ev.type === 'note' && (m = /^Step (\d+) of (\d+)\b/.exec(String(ev.text || '')))) return (Number(m[1]) - 1) / Number(m[2]);
    if (ev.type === 'step' && ev.step && (m = /^(\d+)\/(\d+):/.exec(String(ev.step.intended || '')))) return Number(m[1]) / Number(m[2]);
    return undefined;
  }

  root.LensHost = {
    create: function (canvas, opt) { return new Host(canvas, opt); },
    cursor: cursor,
    progressFrom: progressFrom,
    wake: wake,
    get all() { return hosts.slice(); },
    DONE_HOLD_MS: DONE_HOLD_MS
  };
})(window);
