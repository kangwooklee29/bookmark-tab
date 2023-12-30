import CP from "./color-picker.js";

let calendarWrapperElement, currentTimeElement;
const picker = new CP(document.querySelector('#colorPicker'));
picker.on('change', function (r, g, b, a) {
    if (r === 0 && g === 0 && b === 0) return;
    this.source.value = 'rgb(' + r + ', ' + g + ', ' + b + ')';
    updateBackgroundColor(this.source.value);
});

let cur_hover_elem = null;

let debounceTimer = null;

let use_calendar = null;

function renderCalendarEvents(events) {
    document.querySelector("div.calendar-events-wrapper").innerHTML = "";
    if (!events) return;

    const eventObj = {};
    for (const event of events) {
        const start_date = event.start.dateTime ? new Date(event.start.dateTime) : new Date(event.start.date);
        const start_date_mm_dd = `${String(start_date.getMonth() + 1).padStart(2, '0')}/${String(start_date.getDate()).padStart(2, '0')}`;
        const start_time = event.start.dateTime ? event.start.dateTime.split("T")[1].substring(0, 5) : "00:00";
        const end_time = event.end.dateTime ? event.end.dateTime.split("T")[1].substring(0, 5) : "00:00";
        const new_elem = {start_time: start_time, end_time: end_time, summary: event.summary, htmlLink: event.htmlLink};
        if (eventObj[start_date_mm_dd])
            eventObj[start_date_mm_dd].push(new_elem);
        else
            eventObj[start_date_mm_dd] = [new_elem];
    }
    Object.keys(eventObj).forEach(key => eventObj[key].sort((a, b) => {
        if (a.start_time < b.start_time) return -1;
        return 1;
    }));

    let today = new Date();
    let today_str = `${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}`;
    let cur_date = new Date();
    cur_date.setDate(cur_date.getDate() - cur_date.getDay());
    let cur_month = cur_date.getMonth() + 1;
    for (let i = 0; i < 14; i++) {
        const itemElement = document.createElement("div");
        itemElement.classList.add("calendar-day");

        let cur_day_str = cur_date.getDate();
        if (cur_month < cur_date.getMonth() + 1) {
            cur_month++;
            cur_day_str = `${cur_month}/${cur_day_str}`;
        }
        const cur_day_key = `${String(cur_date.getMonth() + 1).padStart(2, '0')}/${String(cur_date.getDate()).padStart(2, '0')}`;
        if (cur_day_key === today_str)
            cur_day_str = `<b>${cur_day_str}</b>`;
        if (cur_day_key < today_str && !(cur_day_key.substring(0, 2) === "01" && today_str.substring(0, 2) === "12"))
            itemElement.classList.add("past-day");
        itemElement.innerHTML = `<span class="calendar-day-title">${cur_day_str}</span>`;
        if (eventObj[cur_day_key])
            eventObj[cur_day_key].forEach(event => {
                const eventElement = document.createElement("a");
                if (event.start_time !== "00:00")
                    eventElement.innerHTML = `${event.start_time}-${event.end_time}<br>/${event.summary}`;
                else
                    eventElement.innerHTML = event.summary;
                eventElement.href = event.htmlLink;
                if (cur_day_key === today_str) { 
                    if (today.toTimeString().slice(0, 5) < event.end_time)
                        eventElement.innerHTML = `<b>${eventElement.outerHTML}</b>`;
                    else if (event.end_time !== "00:00")
                        eventElement.innerHTML = `<i>${eventElement.outerHTML}</i>`;
                }
                if (itemElement.classList.contains("past-day"))
                    eventElement.innerHTML = `<i>${eventElement.outerHTML}</i>`;
                itemElement.appendChild(eventElement);

                const start_datetime = new Date(today.toDateString() + ' ' + event.start_time);
                let end_datetime = new Date(today.toDateString() + ' ' + event.end_time);
                if (event.end_time < event.start_time) {
                    const next_day = new Date(today.getTime() + 1000 * 60 * 60 * 24);
                    end_datetime = new Date(next_day.toDateString() + ' ' + event.end_time);
                }
                if (today_str === cur_day_key && today >= start_datetime - 600000 && today <= end_datetime) {
                    document.querySelector(".exclamation-mark").style.display = 'block';
                    eventElement.style.fontWeight = 700;
                }
            });

        document.querySelector("div.calendar-events-wrapper").appendChild(itemElement);
        cur_date.setDate(cur_date.getDate() + 1);
    }
}

function colorFolderList() {
    const color = document.body.style.backgroundColor;
    let rgbValues = color ? color.match(/[\d.]+/g).map(Number) : [255, 255, 255];
    let fontColor = 0.299 * rgbValues[0] + 0.587 * rgbValues[1] + 0.114 * rgbValues[2] < 128 ? "white" : "rgb(32, 33, 36)";
    let blendedColor = blendColors(color, "rgba(32, 33, 36, 0.4)");
    let decidedColor = document.querySelector("div.folder_list").children.length === 1 ? blendedColor : fontColor;
    document.querySelector("div.folder_list").style.color = decidedColor;
    document.querySelectorAll("div.folder_list > span").forEach(el => { el.style.color = decidedColor; });
}

function calcIconWrapperColor(color) {
    if (!color) color = "rgb(255, 255, 255)";
    let ov = color.match(/[\d.]+/g).map(Number);
    const mod = ov.map(value => {
        let normalizedValue = value / 257;
        let angle = 0.5 - (1 / 5) * Math.log(1 / normalizedValue - 1); 
        let newAngle = angle * 0.8;
        return (1 / (1 + Math.exp(-5 * (newAngle - 0.5)))) * 255;
    });
    return `rgb(${mod[0]}, ${mod[1]}, ${mod[2]})`;
}

function updateBackgroundColor(color) {
    document.body.style.backgroundColor = color;
    document.body.style.backgroundImage = "";
    document.querySelector("#colorPicker").value = color;
    document.querySelector(".mod_box").style.backgroundColor = color;
    document.querySelector(".modify-theme-wrapper").style.backgroundColor = color;
    document.querySelector(".calendar-events-wrapper").style.backgroundColor = color;

    let rgbValues = color ? color.match(/[\d.]+/g).map(Number) : [255, 255, 255];
    let fontColor = 0.299 * rgbValues[0] + 0.587 * rgbValues[1] + 0.114 * rgbValues[2] < 128 ? "white" : "rgb(32, 33, 36)";
    document.querySelectorAll("div").forEach(elem=> {elem.style.color = fontColor;});
    document.querySelectorAll("span").forEach(elem=> {elem.style.color = fontColor; console.log(1)});
    document.querySelectorAll("a").forEach(elem=> {elem.style.color = fontColor;});
    document.querySelectorAll("div.mod_box input").forEach(elem=> {elem.style.color = fontColor;});
    document.querySelectorAll("div.mod_box button").forEach(elem=> {elem.style.color = fontColor;});
    
    let wrapperColor = calcIconWrapperColor(color);
    document.querySelectorAll("div.cell a").forEach(elem=> {elem.style.backgroundColor = wrapperColor;});
    document.querySelectorAll("div.mod_box input").forEach(elem=> {elem.style.backgroundColor = wrapperColor;});
    document.querySelectorAll("div.mod_box button").forEach(elem=> {elem.style.backgroundColor = wrapperColor;});
    document.querySelectorAll("div.calendar-events-wrapper span").forEach(elem=> {elem.style.backgroundColor = wrapperColor;});
    document.querySelectorAll("div.past-day").forEach(elem=> {elem.style.backgroundColor = wrapperColor;});
    if(document.querySelector(".header-container a svg")) {
        document.querySelector(".header-container a svg").style.fill = wrapperColor;
        if (rgbValues[0] >= 250 && rgbValues[1] >= 250 && rgbValues[2] >= 250) {
            document.querySelector(".header-container a svg").style.fill = "rgb(230, 230, 230)";
        }
    }
    document.querySelector(".modify-theme-box #fileViewer").style.backgroundColor = wrapperColor;

    document.querySelector("div.color-example").childNodes.forEach(elem => {
        if (elem.style && elem.style.backgroundColor === color) elem.classList.add("color-clicked");
        else if (elem.nodeName === "DIV") elem.classList.remove("color-clicked");
    });
    colorFolderList();

    if (debounceTimer)
        clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        API.storage.sync.set({backgroundColor: color});
        API.storage.local.set({ 'backgroundImage': "" });
        document.querySelectorAll("p").forEach(elem=> {elem.style.color = fontColor;});
        let weatherFrame = document.querySelector("iframe");
        var weatherBody = weatherFrame.contentDocument || weatherFrame.contentWindow.document;
        weatherBody.querySelectorAll("td").forEach(elem=> {elem.style.color = fontColor;});
        weatherBody.querySelectorAll("svg").forEach(elem=> {elem.style.fill = fontColor;});
        document.querySelectorAll("div.cell > div > font").forEach(elem=> {elem.style.color = fontColor;});
    }, 100);
}

const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
            mutation.addedNodes.forEach(node => {
                const aNode = node.querySelector("a");
                if (aNode) {
                    aNode.style.backgroundColor = calcIconWrapperColor(document.body.style.backgroundColor);
                }
            });
        }
    });
});

observer.observe(document.querySelector("main"), { childList: true, subtree: true });


function blendColors(background, overlay) {
    if (!background) background = "rgb(255, 255, 255)";
    let bg = background.match(/\d+/g).map(Number);
    let ov = overlay.match(/[\d.]+/g).map(Number);

    let newR = bg[0] * (1 - ov[3]) + ov[0] * ov[3];
    let newG = bg[1] * (1 - ov[3]) + ov[1] * ov[3];
    let newB = bg[2] * (1 - ov[3]) + ov[2] * ov[3];

    return `rgba(${Math.round(newR)}, ${Math.round(newG)}, ${Math.round(newB)}, 1)`;
}

document.querySelector("#colorPicker").addEventListener("input", e => { 
    const splitArr = e.target.value.match(/\d+/g);
    if (splitArr && splitArr.length >= 3) {
        var [r, g, b] = splitArr.map(Number);
        picker.set(r, g, b, 1);
    } else {
        let x = e.target.value.trim();
        var count = x.length;
        if ((4 === count || 7 === count) && '#' === x[0]) {
            if (/^#([a-f\d]{3}){1,2}$/i.test(x)) {
                if (4 === count) {
                    var [r, g, b] = [1, 2, 3].map(elem => parseInt(x[elem] + x[elem], 16));
                    picker.set(r, g, b, 1);
                } else
                    var [r, g, b] = [1, 2, 3].map(elem => parseInt(x[elem] + x[elem + 1], 16));
                    picker.set(r, g, b, 1);
                }
        }
    }
});

document.querySelector("div.bookmark-search input").addEventListener("input", e => { 
    if (debounceTimer)
        clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => { main.move_folder(main.folder_id); }, 300);
});

document.body.addEventListener("click", (e)=>
{
    if (e.target === document.querySelector("#fileViewer"))
        document.getElementById('fileInput').click();

    if (document.querySelector("div.modify-theme-wrapper button").contains(e.target)) {
        document.querySelector("div.modify-theme-wrapper button").style.display = 'none';
        document.querySelector("div.modify-theme-wrapper").classList.add("open-box");
        document.querySelector("div.modify-theme-wrapper div").style.display = 'block';
        document.querySelector("div.modify-theme-wrapper #colorPicker").dispatchEvent(new MouseEvent('mousedown'));
    } 

    if (!document.querySelector("div.modify-theme-wrapper").contains(e.target) && (!document.querySelector("div.color-picker__dialog") || !document.querySelector("div.color-picker__dialog").contains(e.target))) {
        document.querySelector("div.modify-theme-wrapper").classList.remove("open-box");
        document.querySelector("div.modify-theme-wrapper div").style.display = 'none';
        document.querySelector("div.modify-theme-wrapper button").style.display = 'block';
    }

    if (document.querySelector("div.color-example").contains(e.target)) {
        if (e.target.style.backgroundColor)
            updateBackgroundColor(e.target.style.backgroundColor);
    }

    if (e.target.nodeName === "SPAN" && e.target.parentNode.classList.contains("weather_info"))
    {
        var target = document.querySelector("iframe");
        if (target.classList.contains("widen") === false)
            target.classList.add("widen");
        else
            target.classList.remove("widen");
    }

    if (e.target.nodeName === "DIV" && e.target.id !== "" && e.target.id !== "overlay" && e.target.id !== "colorViewer" && e.target.id !== "fileViewer")
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
        API.bookmarks.get(e.target.parentNode.id, (e) => { mod_box.mod_box(e[0]); });

    if (e.target.nodeName === "BUTTON" && e.target.classList.contains("delete"))
        mod_box.delete();

    if (e.target.nodeName === "SPAN" && e.target.classList.contains("new_folder"))
        mod_box.show_new_folder();

    if (e.target.nodeName === "BUTTON" && e.target.classList.contains("folder"))
        main.move_folder(e.target.parentNode.id);

    if (e.target.nodeName === "SPAN" && e.target.parentNode.classList.contains("folder_list"))
        main.move_folder(e.target.id);
});

document.body.addEventListener("mouseover", e => {
    if (e.target.parentNode.classList.contains("cell")) {
        const arrow_box = e.target.querySelector("p.arrow_box");
        if (arrow_box) {
            arrow_box.style.display = 'block';
            let calcHeight = 70 + arrow_box.getBoundingClientRect().height;
            if (calcHeight < 120) calcHeight = 120;
            e.target.style.height = `${calcHeight}px`;
            e.target.querySelector("p.icon_title").style.display = 'none';
        }
        cur_hover_elem = e.target;
        e.target.classList.add("now_hovering");
        e.target.style.backgroundColor = blendColors(document.body.style.backgroundColor, "rgba(32, 33, 36, 0.1)");
    }

    if ((e.target === currentTimeElement || calendarWrapperElement.contains(e.target)) && calendarWrapperElement.style.display !== 'flex' && use_calendar) {
        calendarWrapperElement.style.display = 'flex';
        if (debounceTimer)
            clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            API.storage.sync.get(["calendarUpdateTime", "calendarEvents", "backgroundColor", "calendarAccessToken", "now_fetching_calendar_info"], items => {
                if (items.now_fetching_calendar_info) return;
                API.runtime.sendMessage( {greeting: "fetchCalendarEvents", calendarUpdateTime: items.calendarUpdateTime, calendarEvents: items.calendarEvents, calendarAccessToken: items.calendarAccessToken, session_id: items.session_id}, function(response) {
                    console.log("Response:", response);
                    renderCalendarEvents(response.calendarEvents);
                    updateBackgroundColor(items.backgroundColor);
                });
            });
        }, 3000);
    }
});

document.body.addEventListener("mouseout", e => {
    // 이제 막 마우스 커서가 떠난 엘리먼트가 cur_hover_elem 또는 그 자식인 경우 & 마우스 커서가 **도착**한 엘리먼트가 cur_hover_elem의 자식이 아닌 경우
    if (cur_hover_elem && cur_hover_elem.contains(e.target) && !cur_hover_elem.contains(e.relatedTarget)) {
        cur_hover_elem.style.height = `120px`;
        if (cur_hover_elem.querySelector("p.arrow_box")) {
            cur_hover_elem.querySelector("p.arrow_box").style.display = 'none';
            cur_hover_elem.querySelector("p.icon_title").style.display = 'block';
        }
        cur_hover_elem.classList.remove("now_hovering");
        cur_hover_elem.style.backgroundColor = "";
        cur_hover_elem = null;
    }

    if ((calendarWrapperElement.contains(e.target) || currentTimeElement.contains(e.target)) && !calendarWrapperElement.contains(e.relatedTarget) && !currentTimeElement.contains(e.relatedTarget))
        calendarWrapperElement.style.display = '';
});

async function get_folder(id)
{
    return new Promise((resolve, reject) => {
        API.bookmarks.get(id, (b) => {
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
        this.weather_visibility = false;
        API.storage.sync.get(null, async (items) => {
            use_calendar = items.use_calendar;
            initializeBackgroundColor(items.backgroundColor);
            updateBackgroundColor(items.backgroundColor);
            if (use_calendar)
                API.runtime.sendMessage( {greeting: "fetchCalendarEvents", calendarUpdateTime: items.calendarUpdateTime, calendarEvents: items.calendarEvents, calendarAccessToken: items.calendarAccessToken, session_id: items.session_id}, function(response) {
                    console.log("Response:", response);
                    use_calendar = response.use_calendar;
                    if (use_calendar)
                        calendarWrapperElement.style.display = 'flex';
                    renderCalendarEvents(response.calendarEvents);
                    updateBackgroundColor(items.backgroundColor);
                });
            if ("memos" in items)
                this.memos = JSON.parse(items.memos);
            if (!("weather_visibility" in items) || items.weather_visibility) {
                this.weather_visibility = true;
                API.storage.sync.set({weather_visibility: true});
            }
            if (this.weather_visibility) {
                this.weather_info_obj.querySelector("iframe").src = "../../components/weather.html";
            }
            initial_folder_id = items.initial_folder_id;
            if (!initial_folder_id) {
                const self = this;
                initial_folder_id = await API.bookmarks.getTree( bookmarkTreeNodes => {
                    let counts = bookmarkTreeNodes[0].children.map(node => node.children ? node.children.length : 0);
                    let maxCount = Math.max(...counts);
                    initial_folder_id = bookmarkTreeNodes[0].children[counts.indexOf(maxCount)].id;
                    API.storage.sync.set({initial_folder_id});
                    self.move_folder(initial_folder_id);
                });
            } else
                this.move_folder(initial_folder_id);
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
        if (this.folder_id !== initial_folder_id) { // 하위 디렉토리
            if (this.weather_info_obj.classList.contains("hide") === false)
                this.weather_info_obj.classList.add("hide");
            this.folder_list_obj.classList.remove("hide");
        } else {
            this.weather_info_obj.classList.remove("hide");
        }
    }

    async print_folder_list()
    {
        var folder_stack = [], id = this.folder_id, cnt = 10;
        while (cnt)
        {
            var b = await get_folder(id);
            folder_stack.push(b);
            if (b.id !== initial_folder_id)
                id = b.parentId;
            else break;
            cnt--;
        }

        this.folder_list_obj.innerHTML = [...folder_stack].reverse().map((e)=>{return `<span id="${e.id}">${e.title}</span>`}).join("&nbsp;>&nbsp;") + "&nbsp;>";
        colorFolderList();
    }

    async move_folder(id) {
        if (this.folder_id === id) {
            const arr = await API.bookmarks.getChildren((await API.bookmarks.get(id))[0].parentId);
            
            const id_list = [];
            let cur_id = null;
            for (const el of arr) {
                if (!(el.url)) {
                    id_list.push(el);
                    if (el.id === id)
                        cur_id = id_list.length - 1;
                }
            }
            let next_id = id_list[(cur_id + 1) % id_list.length].id;

            if (id === initial_folder_id) {
                initial_folder_id = next_id;
                API.storage.sync.set({initial_folder_id});
            }

            id = next_id;
        }
        this.folder_id = id;
        this.print_folder_list();
        this.clear_main();
        const keyword = document.querySelector("div.bookmark-search input").value;
        API.bookmarks.getChildren(id, async (b) => {
            for (var e of b) {
                if (!keyword || e.title.toLowerCase().includes(keyword.toLowerCase()) || (e.url && e.url.toLowerCase().includes(keyword.toLowerCase())) || !('url' in e) || !e.url) {
                    var cell = new Cell();
                    var icon  = ('url' in e && e.url) ? new Icon(e) : new FolderIcon(e);
                    cell.put_innerHTML(await icon.get_innerHTML());
                    this.put(cell, icon.id);
                }
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
            e.target.onload = null;
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
        const isKeyword = document.querySelector("div.bookmark-search input").value;
        return new Promise((resolve, reject) => {
            API.bookmarks.getChildren(this.id, (b)=>{
                var numbers = `(${isKeyword ? "≤" : ""}${b.length})`;
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
        if (cur_hover_elem)
            cur_hover_elem.classList.remove("now_hovering");
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
            if (now_dragging === temp) {
                folder_selected = null;
                return;
            }
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
    if (e.target.classList.contains("folder_selected") && didnleave !== e.target && e.target.nodeName !== "SPAN") dragleave = e.target;
});

document.body.addEventListener("dragend", async (e) => {
    e.target.style.opacity = 1;
    if (folder_selected && now_dragging !== null)
    {
        folder_selected.classList.remove("folder_selected");
        if (main.folder_id !== folder_selected.id && e.target.id !== folder_selected.id && folder_selected !== dragleave)
        {
            API.bookmarks.move(e.target.id, {parentId: folder_selected.id});
            main.$target.removeChild(e.target.parentNode);

            if (folder_selected.querySelector("button.folder"))
            {
                var icon = new FolderIcon({id:folder_selected.id, title:folder_selected.querySelectorAll("p")[1].innerText.split(" (")[0]});
                if (folder_selected.id in main.cells)
                    main.cells[folder_selected.id].put_innerHTML(await icon.get_innerHTML());
            }
        }
        else
        {
            now_dragging = start_pos < now_dragging ? now_dragging +1 : now_dragging;
            API.bookmarks.move(e.target.id, {parentId: main.folder_id, index:now_dragging});
        }
        folder_selected = null;
        dragleave = null;
    }
    else if (now_dragging !== null)
    {
        now_dragging = start_pos < now_dragging ? now_dragging +1 : now_dragging;
        API.bookmarks.move(e.target.id, {parentId: main.folder_id, index:now_dragging});
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
        this.new_folder_obj = $target.querySelector("span.new_folder");
        this.memo_obj = $target.querySelector("input.memo");
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
            var new_icon = {'parentId':  main.folder_id, 'title': this.name_obj.value};
            if (this.url_obj.value)
                new_icon['url'] = this.url_obj.value;
            API.bookmarks.create(new_icon, async (b) => {
                main.memos[b.id] = this.memo_obj.value;
                API.storage.sync.set({memos: JSON.stringify(main.memos)});
        
                var cell = new Cell();
                var icon = ('url' in b && b.url) ? new Icon(b) : new FolderIcon(b);
                cell.put_innerHTML(await icon.get_innerHTML());
                main.cells[b.id] = cell;
                main.insertBefore(cell.obj, main.plus_obj.obj);
            });
        }
        else
        {
            API.bookmarks.update(this.elem.id, {'title': this.name_obj.value, 'url': this.url_obj.value});
            main.memos[this.elem.id] = this.memo_obj.value;
            API.storage.sync.set({memos: JSON.stringify(main.memos)});
            API.bookmarks.get(this.elem.id, async (e) => { 
                var icon = ("url" in e[0]  && e[0].url ) ? new Icon(e[0]) : new FolderIcon(e[0]);
                main.cells[e[0].id].put_innerHTML(await icon.get_innerHTML());
            });
        }
    }

    delete()
    {
        this.close_mod_box();
        API.bookmarks.remove(this.elem.id);
        main.$target.removeChild(main.cells[this.elem.id].obj);
    }

    close_mod_box()
    {
        if (this.$target.classList.contains("hide") === false)
            this.$target.classList.add("hide");
        if (this.overlay_obj.classList.contains("hide") === false)
            this.overlay_obj.classList.add("hide");
    }

    new_mod_box()
    {
        this.show_mod_box();
        this.show_new_folder();
        if (this.del_obj.classList.contains("hide") === false) this.del_obj.classList.add("hide");
        if (this.mod_head_obj.classList.contains("hide") === false) this.mod_head_obj.classList.add("hide");
        this.new_head_obj.classList.remove("hide");
        this.name_obj.value = "";
        this.memo_obj.value = "";
        this.elem = null;
    }

    show_new_folder()
    {
        if (this.new_folder_obj.classList.contains("clicked") === false) this.new_folder_obj.classList.add("clicked");
        if (this.url_div_obj.classList.contains("hide") === false) this.url_div_obj.classList.add("hide");
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
            this.url_div_obj.classList.remove("hide");
            this.url_obj.value = elem.url;
        }
        else
        {
            if (this.url_div_obj.classList.contains("hide") === false) this.url_div_obj.classList.add("hide");
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

let API = (navigator.userAgent.indexOf("Firefox") != -1) ? browser : chrome;
var initial_folder_id;
var main = new Main(document.querySelector("main"));
var mod_box = new ModBox(document.querySelector("div.mod_box"));

function updateCurTime() {
    let cur_date = new Date();
    document.querySelector('span.current-time').textContent = cur_date.toLocaleString('en-US', {
        month: 'numeric',
        day: 'numeric',
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit'
    });
    if (cur_date.getMinutes() === 0)
        document.querySelector("iframe").src = document.querySelector("iframe").src;
}

updateCurTime();
setInterval(updateCurTime, 1000 * 60);

async function initializeBackgroundColor(backgroundColor) {
    const response = await fetch("../assets/img/logo.svg");
    document.querySelector(".header-container a").innerHTML =  await response.text();
    document.querySelector(".header-container a svg").classList.add("logo");
    document.querySelector("#colorPicker").value = backgroundColor;
    if (backgroundColor) {
        var [r, g, b] = backgroundColor.match(/\d+/g).map(Number);
        picker.set(r, g, b, 1);
    } else 
        picker.set(255, 255, 255, 1);
}

API.storage.local.get('backgroundImage', function(result) {
    if (result.backgroundImage) {
        document.body.style.backgroundImage = 'url(' + result.backgroundImage + ')';
    }
});

document.getElementById('fileInput').addEventListener('change', function(event) {
    var file = event.target.files[0];
    var reader = new FileReader();
    reader.onload = function(e) {
        chrome.storage.local.set({ 'backgroundImage': e.target.result }, function() {
            document.body.style.backgroundImage = 'url(' + e.target.result + ')';
        });
    };
    reader.readAsDataURL(file);
    document.getElementById('fileViewer').innerText = document.getElementById('fileInput').files[0].name;
});

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        el.textContent = API.i18n.getMessage(el.getAttribute('data-i18n'));
    });
    document.querySelector("div.bookmark-search input").placeholder =  API.i18n.getMessage("search_bookmarks");
    calendarWrapperElement = document.querySelector(".calendar-events-wrapper");
    currentTimeElement = document.querySelector("span.current-time");
    var hoverRect = currentTimeElement.getBoundingClientRect();
    calendarWrapperElement.style.top = hoverRect.bottom + 'px';
    calendarWrapperElement.style.left = hoverRect.left + 'px'; 
    document.querySelector(".exclamation-mark").style.top =  hoverRect.top + 'px';
    document.querySelector(".exclamation-mark").style.left =  (hoverRect.right) + 'px';
});
