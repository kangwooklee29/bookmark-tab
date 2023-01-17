chrome.bookmarks.getTree((b)=>
{
    var bookmark = b[0].children[0].children;
    for (var e of bookmark)
    {
        var div = document.createElement("div");
        div.classList.add("item");
        div.innerHTML = `<div><a href="${e.url}"><img src="https://${(new URL(e.url)).hostname + '/favicon.ico'}"></a><a href="${e.url}">${e.title}</a></div>`;
        document.querySelector("main").appendChild(div);
    }
});