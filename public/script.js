document.addEventListener('DOMContentLoaded', function() {
  const copyBtn = document.getElementById('copyBtn');
  const mirrorUrl = document.querySelector('.mirror-url code').textContent;

  // Copy the main mirror URL to the clipboard
  copyBtn.addEventListener('click', function() {
    navigator.clipboard.writeText(mirrorUrl).then(() => {
      alert('Mirror URL copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
  });

  // Add copy functionality for code snippets in usage cards
  const copyCodeButtons = document.querySelectorAll('.copy-code-btn');
  copyCodeButtons.forEach((button) => {
    button.addEventListener('click', function() {
      // Find the target pre element to copy
      const targetIndex = button.getAttribute('data-target');
      const codeToCopy = document.querySelectorAll('.usage-card pre code')[targetIndex].textContent;

      navigator.clipboard.writeText(codeToCopy).then(() => {
        alert('Code snippet copied to clipboard!');
      }).catch(err => {
        console.error('Failed to copy: ', err);
      });
    });
  });
});
