// Use feature detection for API compatibility
const API = (typeof browser === "undefined") ? chrome : browser;
const serverUrl = "https://asia-northeast3-project-for-bookmark-tab.cloudfunctions.net/get_access_token";

function calcButtonBgColor(color) {
    if (!color) return "rgba(0, 0, 0, 0.1)";
    let ov = color.match(/[\d.]+/g).map(Number);
    const mod = ov.map(value => {
        let normalizedValue = value / 257;
        let angle = 0.5 - (1 / 5) * Math.log(1 / normalizedValue - 1); 
        let newAngle = angle * 0.8;
        return (1 / (1 + Math.exp(-5 * (newAngle - 0.5)))) * 255;
    });
    return `rgb(${mod[0]}, ${mod[1]}, ${mod[2]})`;
}

// Restore options from storage
async function restoreOptions() {
    const items = await API.storage.sync.get(null);
    document.querySelector('#weather_visibility_checkbox').checked = !!items.weather_visibility;
    document.querySelector('#use_calendar_checkbox').checked = !!items.use_calendar;
    if (items.formatted_address)
        document.querySelector('#location').value = items.formatted_address;

    const color = items.backgroundColor ? items.backgroundColor : "rgb(255, 255, 255)";
    let rgbValues = color.match(/[\d.]+/g).map(Number);
    let fontColor = 0.299 * rgbValues[0] + 0.587 * rgbValues[1] + 0.114 * rgbValues[2] < 128 ? "white" : "rgb(32, 33, 36)";
    document.body.style.color = fontColor;
    document.body.style.backgroundColor = color;

    let buttonBgColor = calcButtonBgColor(color);
    document.querySelectorAll("button").forEach(elem => { elem.style.backgroundColor = buttonBgColor; elem.style.color = fontColor; });
}

// Initialize event listeners
function initializeEventListeners() {
    document.addEventListener('change', (event) => {
        if (event.target.matches('#weather_visibility_checkbox')) {
            API.storage.sync.set({ weather_visibility: event.target.checked });
        }

        if (event.target.matches('#use_calendar_checkbox')) {
            API.storage.sync.set({ use_calendar: event.target.checked, calendarAccessToken: "", calendarEvents: [], calendarUpdateTime: 0, now_fetching_calendar_info: false });
        }
    });

    document.addEventListener('click', async (event) => {
        if (event.target.matches('#location_search')) {
            const fullLanguageTag = navigator.language || navigator.userLanguage;
            const singleLanguageCode = fullLanguageTag.split('-')[0];
            const response = await fetch(`${serverUrl}?location=${encodeURIComponent(document.querySelector("#location").value)}&lang=${singleLanguageCode}`);
            const data = await response.json();
            console.log(data);
            if (data.status === "OK") {
                document.querySelector("#location").value = data.results[0].formatted_address;
                API.storage.sync.set({ formatted_address: data.results[0].formatted_address, weather_loc: {latitude: data.results[0].geometry.location.lat, longitude: data.results[0].geometry.location.lng} });
            }
        }
    });

    document.addEventListener('keyup', (event) => {
        if (event.target.matches('#location') && event.key === "Enter")
            document.querySelector("#location_search").click()
    });
}

// Set internationalization text content
function setI18nText() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        el.textContent = API.i18n.getMessage(el.getAttribute('data-i18n'));
    });
}

// Initialization on content loaded
document.addEventListener('DOMContentLoaded', () => {
    restoreOptions();
    setI18nText();
    initializeEventListeners();
});
