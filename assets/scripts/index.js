function initSearch() {
  var field = document.getElementById("search-field");

  if (!field) return;

  field.focus();

  var debouncedSearch = debounce(function () {
    getJSON(
      "https://search.ochrance.cz/?q=" + encodeURIComponent(field.value),
      displayResults
    );
  }, 350);

  var q = document.createElement("SPAN");
  q.setAttribute("id", "searched-for");
  document.querySelector("h1").appendChild(q);

  field.addEventListener("input", debouncedSearch);
}

function displayResults(err, results) {
  if (results) {
    if (results.hits.hits.length > 0) {
      var f = document.createDocumentFragment();
      var els = results.hits.hits.map(displayResult);
      for (var i = 0; i < els.length; i++) {
        var div = document.createElement("DIV");
        div.classList.add("search-result");
        div.appendChild(els[i]);
        f.appendChild(div);
      }

      document.getElementById("searched-for").innerHTML =
        ": " + document.getElementById("search-field").value;
      document.getElementById("search-results").innerHTML = "";
      document.getElementById("search-results").appendChild(f);
    } else {
      var searchedFor = document.getElementById("search-field").value;
      if (searchedFor) {
        document.getElementById("searched-for").innerHTML =
          ": " + document.getElementById("search-field").value;
        document.getElementById("search-results").innerHTML =
          "Nebyly nalezeny žádné výsledky.";
      } else {
        document.getElementById("searched-for").innerHTML = "";
        document.getElementById("search-results").innerHTML =
          "Zadejte výraz k vyhledání.";
      }
    }
  }
}

function displayResult(hit) {
  var f = document.createDocumentFragment();
  var a = document.createElement("A");
  a.setAttribute(
    "href",
    hit._source.url.replace("https://www.ochrance.cz", "")
  );
  a.innerHTML = hit._source.title;

  var h = document.createElement("H2");
  h.appendChild(a);

  var p = document.createElement("P");
  p.innerHTML = hit._source.summary;

  f.appendChild(h);
  f.appendChild(p);
  return f;
}

function getJSON(url, callback) {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", url, true);
  xhr.responseType = "json";
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

document.addEventListener("DOMContentLoaded", function () {
  initSearch();
});
