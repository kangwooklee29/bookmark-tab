// Use feature detection for API compatibility
const API = (typeof browser === "undefined") ? chrome : browser;

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
    document.querySelector("#restore_backup textarea").value = JSON.stringify(items);

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
    document.addEventListener('click', (event) => {
        if (event.target.matches('#location_consent button')) {
            navigator.geolocation.getCurrentPosition(() => {});
        } else if (event.target.matches('#restore_backup button')) {
            try {
                API.storage.sync.set(JSON.parse(document.querySelector("#restore_backup textarea").value), () => {
                    window.location.href = window.location.href.split("?")[0];
                });
            } catch (e) {
                console.error(e);
            }
        }
    });

    document.addEventListener('change', (event) => {
        if (event.target.matches('#weather_visibility_checkbox')) {
            API.storage.sync.set({ weather_visibility: event.target.checked });
        }
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
