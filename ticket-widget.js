const bindHoverStyle = (button) => {
  if (button.dataset.hoverStyleBound !== 'true') {
    button.dataset.hoverStyleBound = 'true';
    button.addEventListener('mouseenter', () => {
      button.style.setProperty('background-color', '#fff', 'important');
      button.style.setProperty('background-image', 'none', 'important');
      button.style.setProperty('color', '#2457ff', 'important');
      button.style.setProperty('border-color', '#fff', 'important');
    });
    button.addEventListener('mouseleave', () => {
      button.style.setProperty('background-color', 'transparent', 'important');
      button.style.setProperty('background-image', 'none', 'important');
      button.style.setProperty('color', '#fff', 'important');
      button.style.setProperty('border-color', 'rgba(255,255,255,.72)', 'important');
    });
  }
};

const ticketStyle = (button) => {
  button.classList.add('buy');
  button.classList.remove('tc-background-yellow');
  button.removeAttribute('style');
  bindHoverStyle(button);
};

const loadTicketcloud = (button) => {
  if (window.TicketcloudWidget) return;
  const script = document.createElement('script');
  script.src = 'https://ticketscloud.com/static/scripts/widget/tcwidget.js';
  script.onload = () => {
    ticketStyle(button);
    button.click();
  };
  document.head.appendChild(script);
};

const closeTicketWidget = () => {
  document.querySelector('#tc-widget-overlay')?.remove();
  document.querySelector('iframe')?.parentElement?.remove();
  document.querySelector('#clure-ticket-close')?.remove();
  document.body.style.overflow = '';
};

const syncTicketCloseButton = () => {
  const widgetOverlay = document.querySelector('#tc-widget-overlay');
  const existingCloseButton = document.querySelector('#clure-ticket-close');

  if (!widgetOverlay || existingCloseButton) return;

  const closeButton = document.createElement('button');
  closeButton.id = 'clure-ticket-close';
  closeButton.type = 'button';
  closeButton.setAttribute('aria-label', 'Закрыть окно покупки билета');
  closeButton.textContent = '×';
  closeButton.style.cssText = [
    'position:fixed',
    'top:18px',
    'right:18px',
    'z-index:2147483647',
    'width:44px',
    'height:44px',
    'padding:0',
    'border:1px solid rgba(255,255,255,.72)',
    'border-radius:50%',
    'background:#2457ff',
    'color:#fff',
    'font:32px/38px Arial,sans-serif',
    'cursor:pointer',
  ].join(';');
  closeButton.addEventListener('click', closeTicketWidget);
  document.body.appendChild(closeButton);
};

new MutationObserver(syncTicketCloseButton).observe(document.body, {
  childList: true,
  subtree: true,
});
syncTicketCloseButton();

document.querySelectorAll('[data-tc-event]').forEach((button) => {
  bindHoverStyle(button);
  button.addEventListener('click', (event) => {
    if (!window.TicketcloudWidget) {
      event.preventDefault();
      loadTicketcloud(button);
    }
  });
});

if (new URLSearchParams(window.location.search).has('open-ticket')) {
  const ticketButton = document.querySelector('[data-tc-event]');
  if (ticketButton) setTimeout(() => ticketButton.click(), 0);
}
