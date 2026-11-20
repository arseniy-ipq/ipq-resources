// Architecture marketing budget calculator. Constants come from the benchmark report November pull
// (26 US architecture firm accounts, 24 with 10+ leads, 18 Nov 2025 to 17 Nov 2026; re-based 2026-11-20).
// all = median account; res/com = pooled per segment; CAP = capture CPL / pooled CPL $47.05;
// SEA = median account-month index; LO/HI = p25 and p75 cost per booked over the median. The static HTML already
// carries the default-state numbers, so the page is correct with JavaScript disabled and this
// only takes over when a setting changes.
(function () {
  var SEG = { all: { cpl: 51.50, cpb: 177.19 }, res: { cpl: 41.51, cpb: 108.47 }, com: { cpl: 46.25, cpb: 89.09 } };
  var CAP = { mixed: 1, form: 0.889, landing: 1.444 };
  var SEA = { year: 1, q1: 0.91, q2: 1.08, q3: 0.92, q4: 1.13 };
  var LO = 0.5760, HI = 1.5620;
  var $ = function (id) { return document.getElementById(id); };
  var el = { b: $('c-budget'), s: $('c-seg'), c: $('c-cap'), q: $('c-season') };
  if (!el.b) return;
  var round = function (n) { return n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ','); };
  function run() {
    var seg = SEG[el.s.value] || SEG.all;
    var m = (CAP[el.c.value] || 1) * (SEA[el.q.value] || 1);
    var cpl = seg.cpl * m, cpb = seg.cpb * m;
    var budget = Math.max(0, Number(el.b.value) || 0);
    $('o-leads').textContent = round(budget / cpl);
    $('o-book').textContent = round(budget / cpb);
    $('o-cpb').textContent = '$' + round(cpb);
    $('o-lo').textContent = round(budget / (cpb * HI));
    $('o-hi').textContent = round(budget / (cpb * LO));
    var rows = document.querySelectorAll('.calc-ladder tr');
    Array.prototype.forEach.call(rows, function (r) {
      var cell = r.querySelector('[data-b]');
      if (!cell) return;
      var v = Number(cell.getAttribute('data-b'));
      r.querySelector('.l-lead').textContent = round(v / cpl);
      r.querySelector('.l-book').textContent = round(v / cpb);
      r.querySelector('.l-band').textContent = round(v / (cpb * HI)) + ' to ' + round(v / (cpb * LO));
    });
  }
  ['input', 'change'].forEach(function (ev) {
    Object.keys(el).forEach(function (k) { el[k].addEventListener(ev, run); });
  });
  run();
})();
