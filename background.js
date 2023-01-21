chrome.bookmarks.getTree(async (b)=>
{
    var bookmark = b[0].children[0].children;
    for (var e of bookmark)
    {
        var url = "";
        try
        {
            url = `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${ (new URL(e.url)).hostname}&size=64`;
            // 구글이 소셜앱에서 favicon 구해오는 히든 api를 사용. 근데 해당 호스트 네임에 대한 favicon을 구하지 못하면 이미지를 가져오긴 하는데 404를 띄우고 이미지 품질이 너무 후져서... 따로 폴백 이미지를 쓸까 고민 중.
        }
        catch(error) // 폴더 계층 구조 구현은 못할 건 없는데 워낙 귀찮기도 하고 별로 쓸 것 같지도 않고... 
        {
            continue;
        }
    
        var div = document.createElement("div");
        div.classList.add("cell");

        var title = e.title.length > 10 ? e.title.substring(0,7) + "..." : e.title;
        div.innerHTML = `<div><a href="${e.url}"><img src="${url}"></a><br>${title}<p class="arrow_box">${e.title}</p></div>`;
        div.querySelector("div").addEventListener("click", (e)=>{window.location.href = e.target.querySelector("a").href});
        document.querySelector("main").appendChild(div);
    }

    for (var i = 0; i < (5 - bookmark.length % 5) % 5; i++)
    {
        var div = document.createElement("div");
        div.classList.add("cell");
        document.querySelector("main").appendChild(div);
    }

});
