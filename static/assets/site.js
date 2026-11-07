// Remembers checklist ticks in this browser.
(function () {
  var boxes = document.querySelectorAll('input[data-task]');
  if (!boxes.length) return;
  var key = function (id) { return 'mcg:' + id; };
  boxes.forEach(function (box) {
    try { box.checked = localStorage.getItem(key(box.id)) === '1'; } catch (e) {}
    box.addEventListener('change', function () {
      try {
        if (box.checked) localStorage.setItem(key(box.id), '1');
        else localStorage.removeItem(key(box.id));
      } catch (e) {}
    });
  });
})();
