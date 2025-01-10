// theme.js
export function initThemeManager() {
    // Recupera il tema salvato o usa quello di default
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.body.classList.add(`${savedTheme}-theme`);
  
    // Crea il pulsante di switch tema
    const themeToggle = document.createElement('button');
    themeToggle.className = 'theme-toggle';
    themeToggle.innerHTML = `
      <span class="material-icons">
        ${savedTheme === 'dark' ? 'light_mode' : 'dark_mode'}
      </span>
    `;
    
    // Aggiungi il gestore dell'evento click
    themeToggle.addEventListener('click', () => {
      const isDark = document.body.classList.contains('dark-theme');
      document.body.classList.remove(isDark ? 'dark-theme' : 'light-theme');
      document.body.classList.add(isDark ? 'light-theme' : 'dark-theme');
      
      // Aggiorna l'icona
      themeToggle.querySelector('.material-icons').textContent = 
        isDark ? 'dark_mode' : 'light_mode';
      
      // Salva la preferenza
      localStorage.setItem('theme', isDark ? 'light' : 'dark');
    });
  
    // Aggiungi il pulsante alla pagina
    document.body.appendChild(themeToggle);
  }