'use strict';
(() => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
      .catch(error => console.warn('Não foi possível registrar o aplicativo:', error));
  }

  let installPrompt;
  const buttons = document.querySelectorAll('.install-app');
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
    buttons.forEach(button => { button.hidden = false; });
  });
  buttons.forEach(button => button.addEventListener('click', async () => {
    if (!installPrompt) return;
    const prompt = installPrompt;
    installPrompt = null;
    buttons.forEach(item => { item.hidden = true; });
    try {
      await prompt.prompt();
    } catch (error) {
      console.warn('Não foi possível abrir a instalação:', error);
      window.AppFeedback.show({
        type: 'error',
        title: 'Não foi possível instalar',
        message: 'Tente instalar o aplicativo pelo menu do navegador.'
      });
    }
  }));
  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    buttons.forEach(button => { button.hidden = true; });
  });
})();
