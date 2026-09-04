const ticketStyle = (button) => {
  button.classList.add('ticket');
  button.classList.remove('tc-background-yellow');
  button.removeAttribute('style');
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
  button.addEventListener('click', (event) => {
    if (!window.TicketcloudWidget) {
      event.preventDefault();
      loadTicketcloud(button);
    }
  });
});
