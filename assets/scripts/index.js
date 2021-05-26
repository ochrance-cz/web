var lang = document.querySelector('html').getAttribute('lang') == 'en' ? 'en' : 'cs';

var i18n = {
  cs: {
    noResults: 'Nebyly nalezeny žádné výsledky.',
    typeSomething: 'Zadejte výraz k vyhledání.',
  },
  en: {
    noResults: 'No results found.',
    typeSomething: 'Please, enter some keywords into the search field.',
  },
};

function initSearch() {
  var field = document.getElementById('search-field');

  if (!field) return;

  var debouncedSearch = debounce(function () {
    getJSON(
      'https://search.ochrance.cz/' + lang + '?q=' + encodeURIComponent(field.value),
      displayResults
    );
  }, 350);

  var q = document.createElement('SPAN');
  q.setAttribute('id', 'searched-for');
  document.querySelector('h1').appendChild(q);

  field.addEventListener('input', debouncedSearch);

  document.querySelector('.search-form').addEventListener('submit', function (e) {
    e.preventDefault();
  });
  document.getElementById('search-button').addEventListener('click', function (e) {
    e.preventDefault();
  });

  field.focus();
}

function displayInfo(text, className) {
  var f = document.createDocumentFragment(f);
  var p = document.createElement('P');
  if (className) p.classList.add('search-' + className);
  p.innerHTML = text;
  f.appendChild(p);
  return f;
}

function displayResults(err, results) {
  if (results) {
    if (results.hits.hits.length > 0) {
      var f = document.createDocumentFragment();
      var els = results.hits.hits.map(displayResult);
      for (var i = 0; i < els.length; i++) {
        var div = document.createElement('DIV');
        div.classList.add('search-result');
        div.appendChild(els[i]);
        f.appendChild(div);
      }

      document.getElementById('searched-for').innerHTML =
        ': ' + document.getElementById('search-field').value;
      document.getElementById('search-results').innerHTML = '';
      document.getElementById('search-results').appendChild(f);
    } else {
      var searchedFor = document.getElementById('search-field').value;
      if (searchedFor) {
        document.getElementById('searched-for').innerHTML =
          ': ' + document.getElementById('search-field').value;
        document.getElementById('search-results').innerHTML = '';
        document.getElementById('search-results').appendChild(displayInfo(i18n[lang].noResults));
      } else {
        document.getElementById('searched-for').innerHTML = '';
        document.getElementById('search-results').innerHTML = '';
        document
          .getElementById('search-results')
          .appendChild(displayInfo(i18n[lang].typeSomething));
      }
    }
  }
}

function displayResult(hit) {
  var f = document.createDocumentFragment();
  var a = document.createElement('A');
  a.setAttribute('href', hit._source.url.replace('https://www.ochrance.cz', ''));
  a.innerHTML = hit._source.title;

  var h = document.createElement('H2');
  h.appendChild(a);

  var p = document.createElement('P');
  var shorter = hit._source.summary.split(' ').slice(0, 20).join(' ');
  p.innerHTML = shorter === hit._source.summary ? hit._source.summary : `${shorter}…`;

  f.appendChild(h);
  f.appendChild(p);
  return f;
}

function getJSON(url, callback) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  xhr.responseType = 'json';
  xhr.onload = function () {
    var status = xhr.status;
    if (status === 200) {
      callback(null, xhr.response);
    } else {
      callback(status, xhr.response);
    }
  };
  xhr.send();
}

function debounce(func, wait) {
  var timeout;

  return function executedFunction() {
    const later = () => {
      clearTimeout(timeout);
      func();
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

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

document.addEventListener('DOMContentLoaded', function () {
  initSearch();
  setupTargetBlanks();
});
