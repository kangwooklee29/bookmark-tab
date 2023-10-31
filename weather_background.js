// Fetch weather data when the service worker starts
fetchWeatherData();

// Fetch weather data every hour
setInterval(fetchWeatherData, 1000 * 60 * 60);

async function fetchWeatherData() {
    const response = await fetch('http://apis.data.go.kr/your-api-endpoint');
    const data = await response.json();

    // Send the weather data to newtab.js
    chrome.runtime.sendMessage({ type: 'weatherData', data: JSON.stringify(data) });
}
