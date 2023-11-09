// Use feature detection for API compatibility
const API = (typeof browser === "undefined") ? chrome : browser;

// Restore options from storage
async function restoreOptions() {
    const items = await API.storage.sync.get(null);
    document.querySelector('#weather_visibility_checkbox').checked = !!items.weather_visibility;
    document.querySelector("#restore_backup textarea").value = JSON.stringify(items);
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
