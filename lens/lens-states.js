/* lens-states.js - THE SEVEN STATES. One small file, the same in all three
   places (the Alalay app, the widget circle, the website). The colours and
   names are the approved ones in docs/design/lens-*.html: the engine
   (lens-engine.js) has the same numbers, and tests/unit/test-lens.js fails if
   the two ever disagree, or if any copy of either file drifts.

   It also gives the page its --s-* colour tokens ("r,g,b", for rgb(var(--s-x)))
   so every chip, dot and pill uses these same seven colours. */
(function (root) {
  'use strict';
  var LENS_STATES = {
    //      engine key   name shown      colour
    ready:  { name: 'Ready',     hex: '#5B6472' },
    listen: { name: 'Listening', hex: '#3DA5FF' },
    work:   { name: 'Working',   hex: '#8B7CF6', from: '#3DA5FF' }, // blue at the back, violet at the front
    need:   { name: 'Needs you', hex: '#F5B342' },
    done:   { name: 'Completed', hex: '#4ADE80' },
    stop:   { name: 'Stopped',   hex: '#CBD5E1' },
    prob:   { name: 'Problem',   hex: '#F26D6D' }
  };
  // The app's own state names -> the engine's. Anything else is left alone.
  var FROM_APP = {
    ready: 'ready', listening: 'listen', working: 'work', needsYou: 'need',
    completed: 'done', stopped: 'stop', problem: 'prob',
    listen: 'listen', work: 'work', need: 'need', done: 'done', stop: 'stop', prob: 'prob'
  };
  var LOOKS = ['aperture', 'breath', 'eyes'];       // the first is the default
  var rgb = function (hex) { return [1, 3, 5].map(function (i) { return parseInt(hex.slice(i, i + 2), 16); }).join(','); };

  // --s-ready ... --s-prob, plus the names the screens already used.
  var TOKENS = {
    ready: 'ready', listen: 'listen', work: 'work', need: 'need', done: 'done', stop: 'stop', prob: 'prob',
    resting: 'ready', listening: 'listen', working: 'work', needs: 'need', blocked: 'need',
    verified: 'done', stopped: 'stop', unverified: 'stop', failed: 'prob', problem: 'prob'
  };
  function applyTokens(doc) {
    if (!doc || !doc.documentElement) return;
    var st = doc.documentElement.style;
    Object.keys(TOKENS).forEach(function (t) { st.setProperty('--s-' + t, rgb(LENS_STATES[TOKENS[t]].hex)); });
    st.setProperty('--s-work-from', rgb(LENS_STATES.work.from));
  }

  var api = {
    STATES: LENS_STATES, FROM_APP: FROM_APP, LOOKS: LOOKS, TOKENS: TOKENS, DEFAULT_LOOK: LOOKS[0],
    engineState: function (appState) { return FROM_APP[appState] || null; },
    name: function (appState) { var k = FROM_APP[appState] || appState; return LENS_STATES[k] ? LENS_STATES[k].name : ''; },
    look: function (v) { return LOOKS.indexOf(v) >= 0 ? v : LOOKS[0]; },
    rgb: rgb, applyTokens: applyTokens
  };
  root.LensStates = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (typeof document !== 'undefined') applyTokens(document);
})(typeof window !== 'undefined' ? window : globalThis);
