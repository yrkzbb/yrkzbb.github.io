(function () {
  'use strict';
  var startedAt = new Date('2026-08-17T00:00:00+08:00');

  function updateDuration() {
    var elapsed = Math.max(0, Date.now() - startedAt.getTime());
    var totalSeconds = Math.floor(elapsed / 1000);
    var days = Math.floor(totalSeconds / 86400);
    var hours = Math.floor((totalSeconds % 86400) / 3600);
    var minutes = Math.floor((totalSeconds % 3600) / 60);
    var seconds = totalSeconds % 60;
    var dayTarget = document.getElementById('timeDate');
    var timeTarget = document.getElementById('times');
    if (!dayTarget || !timeTarget) return;
    dayTarget.textContent = '本站已安全运行 ' + days + ' 天 ';
    timeTarget.textContent = String(hours).padStart(2, '0') + ' 小时 ' + String(minutes).padStart(2, '0') + ' 分 ' + String(seconds).padStart(2, '0') + ' 秒';
  }

  updateDuration();
  setInterval(updateDuration, 1000);
})();
