const links = [...document.querySelectorAll(".jump a")];

function mark() {
  for (const link of links) {
    if (link.getAttribute("href") === location.hash) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  }
}

addEventListener("hashchange", mark);
mark();
