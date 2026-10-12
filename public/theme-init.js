// Tema e lingua applicati prima del primo paint: senza questo, chi ha
// salvato il tema scuro vedrebbe un lampo bianco a ogni ricaricamento
// mentre React monta. Deve restare allineato a src/lib/prefsStore.js.
(function () {
  try {
    var theme = localStorage.getItem('envireader.theme.v1');
    if (theme !== 'light' && theme !== 'dark') {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.dataset.theme = theme;
    var lang = localStorage.getItem('envireader.lang.v1');
    if (lang) document.documentElement.lang = lang;
  } catch (e) {
    document.documentElement.dataset.theme = 'light';
  }
})();
