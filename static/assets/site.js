// Remembers checklist ticks and the chosen language in this browser.
(function () {
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }

  document.querySelectorAll('input[data-task]').forEach(function (box) {
    var key = 'mcg:' + box.id;
    box.checked = get(key) === '1';
    box.addEventListener('change', function () { set(key, box.checked ? '1' : null); });
  });

  document.querySelectorAll('.lang-switch a[data-lang]').forEach(function (a) {
    a.addEventListener('click', function () { set('mcg:lang', a.getAttribute('data-lang')); });
  });
})();
