document.body.addEventListener("click", (e)=>
{
    if (e.target.nodeName === "SPAN" && e.target.parentNode.classList.contains("weather_info"))
    {
        var target = document.querySelector("iframe");
        if (target.classList.contains("widen") === false)
            target.classList.add("widen");
        else
            target.classList.remove("widen");
    }

    if (e.target.nodeName === "DIV" && e.target.id !== "")
    {
        if (e.target.querySelector("a"))
            window.location.href = e.target.querySelector("a").href;
        else
            main.move_folder(e.target.id);
    }

    if (e.target.nodeName === "P" && e.target.classList.contains("arrow_box"))
    {
        if (e.target.parentNode.querySelector("a"))
            window.location.href = e.target.parentNode.querySelector("a").href;
        else
            main.move_folder(e.target.parentNode.id);
    }

    if ((e.target.nodeName === "DIV" && e.target.childNodes.length > 0 && e.target.childNodes[0].nodeName === "FONT") || e.target.nodeName === "FONT")
        mod_box.new_mod_box();

    if (e.target.id === "overlay" || (e.target.nodeName === "BUTTON" && e.target.classList.contains("cancel")))
        mod_box.close_mod_box();

    if (e.target === document.querySelector("button.confirm"))
        mod_box.save_and_close();

    if (e.target.nodeName === "P" && e.target.classList.contains("mod_button"))
        chrome.bookmarks.get(e.target.parentNode.id, (e) => { mod_box.mod_box(e[0]); });

    if (e.target.nodeName === "BUTTON" && e.target.classList.contains("delete"))
        mod_box.delete();

    if (e.target.nodeName === "SPAN" && e.target.classList.contains("new_bookmark"))
        mod_box.show_new_bookmark();
    
    if (e.target.nodeName === "SPAN" && e.target.classList.contains("new_folder"))
        mod_box.show_new_folder();

    if (e.target.nodeName === "BUTTON" && e.target.classList.contains("folder"))
        main.move_folder(e.target.parentNode.id);

    if (e.target.nodeName === "SPAN" && e.target.parentNode.classList.contains("folder_list"))
        main.move_folder(e.target.id);
});

async function get_folder(id)
{
    return new Promise((resolve, reject) => {
        chrome.bookmarks.get(id, (b) => {
            resolve(b[0]);
        })
    });    
}

class Main{
    constructor($target)
    {
        this.plus_obj = new Cell();
        this.plus_obj.put_innerHTML("<div><font style='font-size:40pt;font-weight:100;'>+</font><br></div>")
        this.$target = $target;
        this.folder_list_obj = document.querySelector("div.folder_list");
        this.weather_info_obj = document.querySelector("div.weather_info");
        this.cells = {};
        this.img_dict = {};
        this.folder_stack = [];
        this.folder_id = "";
        this.memos = {};
        chrome.storage.sync.get(null, (items) => {
            if ("memos" in items)
                this.memos = JSON.parse(items.memos);
            this.move_folder("1");
        });
    }

    put(cell, id)
    {
        this.cells[id] = cell;
        this.$target.appendChild(cell.obj);
    }

    insertBefore(obj1, obj2)
    {
        this.$target.insertBefore(obj1, obj2);
    }

    clear_main()
    {
        this.cells = {};
        this.img_dict = {};
        this.$target.innerHTML = "";
        if (this.folder_id !== "1")
        {
            if (this.weather_info_obj.classList.contains("hide") === false)
                this.weather_info_obj.classList.add("hide");
            this.folder_list_obj.classList.remove("hide");
        }
        else
        {
            if (this.folder_list_obj.classList.contains("hide") === false)
                this.folder_list_obj.classList.add("hide");
            this.weather_info_obj.classList.remove("hide");
            var now = new Date();
            this.weather_info_obj.querySelector("span").innerText = `${now.getHours()}:${("0" + now.getMinutes()).slice(-2)}`;
        }
    }

    async print_folder_list()
    {
        var folder_stack = [], id = this.folder_id, cnt = 10;
        while (cnt)
        {
            var b = await get_folder(id);
            folder_stack.push(b);
            if (b.id !== "1")
                id = b.parentId;
            else break;
            cnt--;
        }

        this.folder_list_obj.innerHTML = (folder_stack.length === 1)  ? "" : [...folder_stack].reverse().map((e)=>{return `<span id="${e.id}">${e.title}</span>`}).join("&nbsp;>&nbsp;") + "&nbsp;>";
    }

    move_folder(id)
    {
        this.folder_id = id;
        this.print_folder_list();
        this.clear_main();
        chrome.bookmarks.getChildren(id, async (b)=>
        {
            for (var e of b)
            {
                var cell = new Cell();
                var icon  = ('url' in e) ? new Icon(e) : new FolderIcon(e);
                cell.put_innerHTML(await icon.get_innerHTML());
                this.put(cell, icon.id);
            }
        
            this.put(this.plus_obj, "plus");
        
            for (var i = 0; i < 4; i++)
                this.put(new Cell(), "blank");
        });        
    }
}

class Cell{
    constructor()
    {        
        this.obj = document.createElement("div");
        this.obj.classList.add("cell");
    }

    put_innerHTML(innerHTML)
    {
        this.obj.innerHTML = innerHTML;
    }
}

function img_onload(e)
{
    var url = `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${(new URL(e.target.id)).hostname}&size=64`;
    var hostname_split = (new URL(e.target.id)).hostname.split(".");
    var new_hostname = "";
    if (hostname_split[hostname_split.length-2].length <= 3)
        new_hostname = hostname_split.slice(-3).join(".");
    else
        new_hostname = hostname_split.slice(-2).join(".");
    var new_url = `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${new_hostname}&size=64`; 

    if (e.target.width === 16)
    {
        if (e.target.src === url)
        {
            e.target.src = new_url;
            document.querySelector(`a[href='${e.target.id}']`).innerHTML = `<img src="${new_url}" draggable="false">`; 
        }
        else
            document.querySelector(`a[href='${e.target.id}']`).innerHTML = `<button class="icon">${e.target.alt}</button>`;
    }    
}

class Icon {
    constructor(e)
    {
        var url = `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${(new URL(e.url)).hostname}&size=64`;
        // 구글이 소셜앱에서 favicon 구해오는 히든 api를 사용. 
        main.img_dict[url] = new Image();
        main.img_dict[url].src = url;
        main.img_dict[url].id = e.url;
        main.img_dict[url].alt = e.title.substring(0,2);
        main.img_dict[url].onload = (e) => {img_onload(e);}

        this.id = e.id;
        var title = e.title.length > 10 ? e.title.substring(0,7) + "..." : e.title;
        e.title += e.id in main.memos ? "<br>" + main.memos[e.id] : "";
        this.innerHTML = `<div id="${e.id}" draggable="true"><p class="mod_button">=</p><a href="${e.url}" draggable="false"><img src="${url}" draggable="false"></a><br><p class="icon_title">${title}</p><p class="arrow_box">${e.title}</p></div>`;
    }

    async get_innerHTML()
    {
        return this.innerHTML;
    }
}


class FolderIcon {
    constructor(e)
    {
        this.id = e.id;
        this.title = e.title;
    }

    async get_innerHTML()
    {
        return new Promise((resolve, reject) => {
            console.log(this);
            chrome.bookmarks.getChildren(this.id, (b)=>{
                var numbers = `(${b.length})`;
                var title = (this.title + numbers).length > 10 ? this.title.substring(0,7 - numbers.length) + "...": this.title;
                this.title += this.id in main.memos ? "<br>" + main.memos[this.id] : "";
                resolve(`<div id="${this.id}" draggable="true"><p class="mod_button">=</p><button class="folder_deco"></button><button class="folder"></button><span style="padding:12px;">&nbsp;</span><br><p class="icon_title">${title} <font class="numbers">${numbers}</font></p><p class="arrow_box">${this.title}</p></div>`);
            });
        })
    }
}



var now_dragging = null, start_pos = null, folder_selected = null, dragleave = null, didnleave = null;

document.body.addEventListener("dragstart", (e) =>{
    if (e.target.nodeName === "DIV" && "id" in e.target && e.target.id !== "")
    {
        main.$target.childNodes.forEach((elem, i) => {
            if (elem === e.target.parentNode)
            {
                start_pos = i;
                now_dragging = i;
            }
        })
        e.target.style.opacity = 0.01;
        e.target.classList.add("not_hover");
    }
});

document.body.addEventListener("dragover", (e)=> {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
});


document.body.addEventListener("dragenter", (e) => {

    var node = e.target;
    while (node && node.nodeName !== "DIV")
        node = node.parentNode;
    if (node && node === folder_selected)
        didnleave = folder_selected;

    if (e.target.nodeName === "DIV" && e.target.id !== "")
    {
        if (folder_selected) folder_selected.classList.remove("folder_selected");
        if (e.target.querySelector("a"))
        {
            var temp = null;
            main.$target.childNodes.forEach((elem, i) => {
                if (elem === e.target.parentNode)
                    temp = i;
            });
            if (now_dragging === temp) return;
            else
            {
                var temp2 = null;
                if (now_dragging < temp)
                    temp2 = main.$target.replaceChild(main.$target.childNodes[now_dragging], main.$target.childNodes[temp+1]);
                else
                    temp2 = main.$target.replaceChild(main.$target.childNodes[now_dragging], main.$target.childNodes[temp]);
                main.$target.insertBefore(temp2, main.$target.childNodes[temp+1]);
                now_dragging = temp;
            }
            folder_selected = null;
        }
        else
        {
            folder_selected = e.target;
            dragleave = null;
            if (e.target.classList.contains("folder_selected") === false) e.target.classList.add("folder_selected");
        }
    }

    if (e.target.nodeName === "SPAN" && e.target.parentNode.classList.contains("folder_list"))
    {
        if (folder_selected) folder_selected.classList.remove("folder_selected");        
        folder_selected = e.target;
        if (e.target.classList.contains("folder_selected") === false) e.target.classList.add("folder_selected");
    }
});

document.body.addEventListener("dragleave", (e) => {
    if (e.target.classList.contains("folder_selected") && didnleave !== e.target) dragleave = e.target;
});

document.body.addEventListener("dragend", async (e) => {
    e.target.style.opacity = 1;
    if (folder_selected && now_dragging !== null)
    {
        folder_selected.classList.remove("folder_selected");
        if (main.folder_id !== folder_selected.id && e.target.id !== folder_selected.id && folder_selected !== dragleave)
        {
            chrome.bookmarks.move(e.target.id, {parentId: folder_selected.id});
            main.$target.removeChild(e.target.parentNode);

            console.log(folder_selected);
            if (folder_selected.querySelector("span"))
            {
                var icon = new FolderIcon({id:folder_selected.id, title:folder_selected.querySelectorAll("span")[1].innerText.split(" (")[0]});
                if (folder_selected.id in main.cells)
                    main.cells[folder_selected.id].put_innerHTML(await icon.get_innerHTML());
            }
        }
        else
        {
            now_dragging = start_pos < now_dragging ? now_dragging +1 : now_dragging;
            chrome.bookmarks.move(e.target.id, {parentId: main.folder_id, index:now_dragging});
        }
        folder_selected = null;
        dragleave = null;
    }
    else if (now_dragging !== null)
    {
        now_dragging = start_pos < now_dragging ? now_dragging +1 : now_dragging;
        chrome.bookmarks.move(e.target.id, {parentId: main.folder_id, index:now_dragging});
    }
    now_dragging = null;
    start_pos = null;
});

document.body.addEventListener("keydown", (e) => {
    if (e.target.nodeName === "INPUT" && e.key === "Enter")
        mod_box.save_and_close();
});


class ModBox
{
    constructor($target)
    {
        this.$target = $target;
        this.overlay_obj = document.getElementById("overlay");
        this.name_obj = $target.querySelector("input.name");
        this.url_obj = $target.querySelector("input.url");
        this.del_obj = $target.querySelector("button.delete");
        this.new_head_obj = $target.querySelector("h2.new");
        this.mod_head_obj = $target.querySelector("h2.mod");
        this.url_div_obj = $target.querySelector("div.url");
        this.new_bookmark_obj = $target.querySelector("span.new_bookmark");
        this.new_folder_obj = $target.querySelector("span.new_folder");
        this.memo_obj = $target.querySelector("input.memo");
        this.close_mod_box();
        this.elem = null;
    }

    save_and_close()
    {
        if (this.$target.classList.contains("hide")) return;
        if (this.name_obj.value === "" || (this.url_obj.value !== null && this.url_obj.value === "https://"))
        {
            alert("Input Error!");
            return;
        }

        this.close_mod_box();
        if (this.elem === null)
        {
            if (this.url_obj.value === null)
                chrome.bookmarks.create({'parentId':  main.folder_id, 'title': this.name_obj.value, 'folder': true});
            else
                chrome.bookmarks.create({'parentId':  main.folder_id, 'title': this.name_obj.value, 'url': this.url_obj.value});
            chrome.bookmarks.getChildren(main.folder_id, async (bookmarks) => {
                var b = bookmarks[bookmarks.length-1];
                var cell = new Cell();
                var icon = ('url' in b) ? new Icon(b) : new FolderIcon(b);
                cell.put_innerHTML(await icon.get_innerHTML());
                main.cells[b.id] = cell;
                main.insertBefore(cell.obj, main.plus_obj.obj);
            });
        }
        else
        {
            chrome.bookmarks.update(this.elem.id, {'title': this.name_obj.value, 'url': this.url_obj.value});
            chrome.bookmarks.get(this.elem.id, async (e) => { 
                var icon = "url" in e[0] ? new Icon(e[0]) : new FolderIcon(e[0]);
                main.cells[e[0].id].put_innerHTML(await icon.get_innerHTML());
            });
        }
    }

    delete()
    {
        this.close_mod_box();
        chrome.bookmarks.remove(this.elem.id);
        main.$target.removeChild(main.cells[this.elem.id].obj);
    }

    close_mod_box()
    {
        this.$target.classList.add("hide");
        this.overlay_obj.classList.add("hide");
    }

    new_mod_box()
    {
        this.show_mod_box();
        this.show_new_bookmark();
        if (this.del_obj.classList.contains("hide") === false) this.del_obj.classList.add("hide");
        if (this.mod_head_obj.classList.contains("hide") === false) this.mod_head_obj.classList.add("hide");
        this.new_head_obj.classList.remove("hide");
        this.name_obj.value = "";
        this.url_obj.value = "https://";
        this.memo_obj.value = "";
        this.elem = null;
    }

    show_new_bookmark()
    {
        if (this.new_bookmark_obj.classList.contains("clicked") === false) this.new_bookmark_obj.classList.add("clicked");
        this.url_div_obj.classList.remove("visibility_hide");
        this.new_folder_obj.classList.remove("clicked");
        this.url_obj.value = "https://";
    }

    show_new_folder()
    {
        if (this.new_folder_obj.classList.contains("clicked") === false) this.new_folder_obj.classList.add("clicked");
        if (this.url_div_obj.classList.contains("visibility_hide") === false) this.url_div_obj.classList.add("visibility_hide");
        this.new_bookmark_obj.classList.remove("clicked");
        this.url_obj.value = null;
    }

    mod_box(elem)
    {
        this.show_mod_box();
        if (this.new_head_obj.classList.contains("hide") === false) this.new_head_obj.classList.add("hide");
        this.mod_head_obj.classList.remove("hide");
        this.del_obj.classList.remove("hide");
        this.name_obj.value = elem.title;
        if (elem.id in main.memos) this.memo_obj.value = main.memos[elem.id];
        if ("url" in elem)
        {
            this.url_div_obj.classList.remove("visibility_hide");
            this.url_obj.value = elem.url;
        }
        else
        {
            if (this.url_div_obj.classList.contains("visibility_hide") === false) this.url_div_obj.classList.add("visibility_hide");
            this.url_obj.value = null;
        }
        this.elem = elem;
    }

    show_mod_box()
    {
        this.$target.classList.remove("hide");
        this.overlay_obj.classList.remove("hide");
    }
}

var main = new Main(document.querySelector("main"));
var mod_box = new ModBox(document.querySelector("div.mod_box"));



