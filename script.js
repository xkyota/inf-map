const DEFAULT_SETTINGS = {
  fuelRate: 30, // Fuel consumption rate (liters per 100 km)
  fuelPrice: 1.6, // Fuel price per liter
  adBlueRate: 5, // AdBlue consumption rate (liters per 1000 km)
  adBluePrice: 0.9 // AdBlue price per liter
};

let map = L.map('map').setView([56.9496, 24.1052], 7); // Initialize the map centered on specific coordinates
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

let waypoints = []; // Array to store selected waypoints
let markers = []; // Array to store map markers
let routeControl = null; // Variable to store the route control

let settings = loadSettings(); // Load settings from localStorage or use default

map.on('click', function(e) {
  if (waypoints.length >= 2) {
    clearRoute(); // Clear the route if two waypoints are already selected
  }

  const marker = L.marker(e.latlng).addTo(map); // Add a marker to the map
  markers.push(marker); // Store the marker
  waypoints.push(e.latlng); // Store the waypoint

  reverseGeocode(e.latlng, waypoints.length); // Perform reverse geocoding for the clicked location

  if (waypoints.length === 2) {
    drawRoute(); // Draw the route if two waypoints are selected
  }
});

function reverseGeocode(latlng, index) {
  fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latlng.lat}&lon=${latlng.lng}&format=json`)
    .then(res => res.json())
    .then(data => {
      if (index === 1) document.getElementById("address1").value = data.display_name; // Set the first address
      if (index === 2) document.getElementById("address2").value = data.display_name; // Set the second address
    });
}

function searchAddress(index) {
  const query = document.getElementById(`address${index}`).value; // Get the address input
  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}`)
    .then(res => res.json())
    .then(data => {
      if (data && data[0]) {
        const latlng = L.latLng(data[0].lat, data[0].lon); // Get the coordinates of the address
        const marker = L.marker(latlng).addTo(map); // Add a marker to the map
        map.setView(latlng, 10); // Center the map on the address
        markers.push(marker); // Store the marker
        waypoints[index - 1] = latlng; // Store the waypoint

        if (waypoints.length === 2) {
          drawRoute(); // Draw the route if two waypoints are selected
        }
      }
    });
}

function drawRoute() {
  if (routeControl) map.removeControl(routeControl); // Remove the existing route control
  routeControl = L.Routing.control({
    waypoints: waypoints, // Use the selected waypoints
    routeWhileDragging: false,
    addWaypoints: false,
    createMarker: () => null // Do not create additional markers
  }).on('routesfound', function(e) {
    const route = e.routes[0]; // Get the first route
    const distance = route.summary.totalDistance / 1000; // Calculate the distance in kilometers

    const fuelUsed = (distance / 100) * settings.fuelRate; // Calculate fuel consumption
    const fuelCost = fuelUsed * settings.fuelPrice; // Calculate fuel cost

    const adBlueUsed = (distance / 1000) * settings.adBlueRate; // Calculate AdBlue consumption
    const adBlueCost = adBlueUsed * settings.adBluePrice; // Calculate AdBlue cost

    const total = fuelCost + adBlueCost; // Calculate the total cost

    document.getElementById("infoBox").innerHTML = 
      "<strong>Calculations:</strong><br>" +
      "Distance: " + distance.toFixed(2) + " km<br>" +
      "Fuel: " + fuelUsed.toFixed(2) + " L × €" + settings.fuelPrice + " = €" + fuelCost.toFixed(2) + "<br>" +
      "AdBlue: " + adBlueUsed.toFixed(2) + " L × €" + settings.adBluePrice + " = €" + adBlueCost.toFixed(2) + "<br>" +
      "<strong>Total: €" + total.toFixed(2) + "</strong>";
  }).addTo(map);
}

function clearRoute() {
  waypoints = []; // Clear waypoints
  markers.forEach(m => map.removeLayer(m)); // Remove all markers from the map
  markers = []; // Clear markers array
  if (routeControl) map.removeControl(routeControl); // Remove the route control

  document.getElementById("address1").value = ""; // Clear the first address input
  document.getElementById("address2").value = ""; // Clear the second address input

  document.getElementById("infoBox").innerText = "Select points or enter addresses"; // Reset the info box
}

function openSettings() {
  const modal = document.getElementById("settingsModal");
  modal.style.display = "block"; // Show the settings modal

  document.getElementById("fuelRate").value = settings.fuelRate; // Populate the modal with current settings
  document.getElementById("fuelPrice").value = settings.fuelPrice;
  document.getElementById("adBlueRate").value = settings.adBlueRate;
  document.getElementById("adBluePrice").value = settings.adBluePrice;
}

function closeSettings() {
  document.getElementById("settingsModal").style.display = "none"; // Hide the settings modal
}

function saveSettings() {
  settings.fuelRate = parseFloat(document.getElementById("fuelRate").value); // Save the updated settings
  settings.fuelPrice = parseFloat(document.getElementById("fuelPrice").value);
  settings.adBlueRate = parseFloat(document.getElementById("adBlueRate").value);
  settings.adBluePrice = parseFloat(document.getElementById("adBluePrice").value);

  localStorage.setItem("costSettings", JSON.stringify(settings)); // Save settings to localStorage
  closeSettings(); // Close the settings modal
}

function loadSettings() {
  const saved = localStorage.getItem("costSettings"); // Load settings from localStorage
  return saved ? JSON.parse(saved) : { ...DEFAULT_SETTINGS }; // Return saved settings or default
}

document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") {
    const modal = document.getElementById("settingsModal");
    if (modal.style.display === "block") {
      closeSettings(); // Close the settings modal on Escape key press
    }
  }
});

document.querySelectorAll('.modal, .control-panel, .info-box, .leaflet-top.leaflet-right').forEach(el => {
  el.addEventListener('mouseenter', () => map.scrollWheelZoom.disable()); // Disable scroll zoom when hovering over UI elements
  el.addEventListener('mouseleave', () => map.scrollWheelZoom.enable()); // Re-enable scroll zoom when leaving UI elements
});
