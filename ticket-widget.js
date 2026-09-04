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

document.querySelectorAll('[data-tc-event]').forEach((button) => {
  bindHoverStyle(button);
  button.addEventListener('click', (event) => {
    if (!window.TicketcloudWidget) {
      event.preventDefault();
      loadTicketcloud(button);
    }
  });
});
