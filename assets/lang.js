(function () {
  var KEY = 'rc-site-lang';
  function set(lang) {
    document.body.setAttribute('data-lang', lang);
    document.documentElement.lang = lang;
    document.querySelectorAll('.lang button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.set === lang)); });
    try { localStorage.setItem(KEY, lang); } catch (e) {}
  }
  var q = new URLSearchParams(location.search).get('lang');
  var saved = null; try { saved = localStorage.getItem(KEY); } catch (e) {}
  var initial = q || saved || (/^es/i.test(navigator.language || '') ? 'es' : 'en');
  set(initial === 'es' ? 'es' : 'en');
  document.querySelectorAll('.lang button').forEach(function (b) { b.addEventListener('click', function () { set(b.dataset.set); }); });
})();
