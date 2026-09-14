// Architecture marketing budget calculator. Constants come from the benchmark report v1 pull
// (21 US architecture firm accounts, 15 Sep 2025 to 11 Sep 2026). The static HTML already
// carries the default-state numbers, so the page is correct with JavaScript disabled and this
// only takes over when a setting changes.
(function () {
  var SEG = { all: { cpl: 50.41, cpb: 147.76 }, res: { cpl: 39.92, cpb: 114.65 }, com: { cpl: 53.43, cpb: 123.63 } };
  var CAP = { mixed: 1, form: 0.878, landing: 1.519 };
  var SEA = { year: 1, q1: 0.87, q2: 1.12, q3: 0.92, q4: 0.89 };
  var LO = 0.7091, HI = 1.6213;
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
