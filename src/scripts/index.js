function setupTargetBlanks() {
  var links = Array.prototype.slice.call(
    document.querySelectorAll(
      'a[href$=".pdf"], a[href*="//"]:not([href*="' + window.location.hostname + '"]'
    )
  );
  links.forEach(function (link) {
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener');
  });
}

// The hosted Nua bundle still exposes its retired black collection overlay.
// Collection editing for this project lives in the dashboard's left panel, so
// remove that action wherever the shared bundle inserts it.
function setupLegacyCollectionEditorGuard() {
  function isLegacyEditContentButton(element) {
    var button = element && element.closest && element.closest('button');
    return button && button.closest('[data-cms-ui]') && button.textContent.trim() === 'Edit Content'
      ? button
      : null;
  }

  function hideLegacyEditContentButtons() {
    document.querySelectorAll('[data-cms-ui] button').forEach(function (button) {
      if (button.textContent.trim() === 'Edit Content') button.hidden = true;
    });
  }

  document.addEventListener('click', function (event) {
    if (!isLegacyEditContentButton(event.target)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);

  hideLegacyEditContentButtons();
  new MutationObserver(hideLegacyEditContentButtons).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}

function setupActiveAriaRoles() {
  document.querySelectorAll('._collapsible-nav .dropdown-menu').forEach(function (el) {
    el.addEventListener('focusout', function (event) {
      var dropdown = event.target.closest('.dropdown');

      setTimeout(() => {
        if (!dropdown.querySelector('.dropdown-menu').contains(document.activeElement)) {
          dropdown.querySelector('label').setAttribute('aria-expanded', false);
          dropdown.previousElementSibling.checked = false;
        }
      }, 100);
    });
  });

  document.querySelectorAll('.opener').forEach(function (el) {
    el.addEventListener('click', function (event) {
      event.preventDefault();
      if (event.pointerType === 'mouse' && event.target.classList.contains('keyboard-only-opener'))
        return;

      openCollapsible(event);
    });

    el.addEventListener('keyup', function (event) {
      if (event.code == 'Enter') {
        openCollapsible(event);
      }
    });
  });
}

function openCollapsible(event) {
  var id = event.target.getAttribute('for');
  var input = document.getElementById(id);
  var newState = !input.checked;

  if (event.target.classList.contains('dropdown-title')) {
    if (id !== 'help-checkbox') document.getElementById('help-checkbox').checked = false;
    if (id !== 'work-checkbox') document.getElementById('work-checkbox').checked = false;
  }

  input.checked = newState;

  if (event.target.classList.contains('nav-opener')) setNavOpeners(newState);
  else event.target.setAttribute('aria-expanded', newState);
}

function setNavOpeners(state) {
  document.querySelectorAll('.nav-opener').forEach(function (navOpener) {
    navOpener.setAttribute('aria-expanded', state);
  });
}

document.addEventListener('DOMContentLoaded', function () {
  setupTargetBlanks();
  setupActiveAriaRoles();
  setupLegacyCollectionEditorGuard();
});
