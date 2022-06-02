const L = window.L;
const mymap = L.map('mapid', { tap: L.Browser.safari && L.Browser.mobile }).setView([30, -80], 4); // Create a leaflet map initialized at a point within the United States
let moveableMarker = L.marker([40, -100], { draggable: true }, { autoPan: true }).addTo(mymap); // Add the draggable marker 

//Create the radius around the draggable marker. When it is picked up, remove the circle and add it back when it is dropped
let radiusRing = L.circle([40, -100], { radius: 250 * 1000 }).addTo(mymap);
moveableMarker.on('movestart', function () {
    mymap.removeLayer(radiusRing);
});
moveableMarker.on('moveend', function () {
    let rad = radiusRing.getRadius();
    let coordinate = moveableMarker.getLatLng();
    radiusRing = L.circle([coordinate.lat, coordinate.lng], { radius: rad }).addTo(mymap);
});

//Customization for plane and popup on click
const myIcon = L.icon({
    iconUrl: "img/plane.png",
    iconSize: [24, 32],
    iconAnchor: [12, 32],
    popupAnchor: [12, 16]
});
let popupCustomOptions =
{
    'maxWidth': '400',
    'width': '200',
    'className': 'popupCustom'
}

// Variables for the selected plane. We want a temp selection and a saved selection once button is clicked.
let clickedMarker = "";
let savedMarker = "";
let savedFeature = null;
let clickedFeature = null;

// Use variable to keep track of the first await of the OpenSky api call. 
// Once the call is finished, set to false so loading screen does not appear again
let firsttime = true;

// Setting up tiles for leaflet from openstreetmap
const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const tileURL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const tiles = L.tileLayer(tileURL, { attribution });
tiles.addTo(mymap);

// Initialize the first geoLayer. We use a layerGroup to flush the geoLayer when we call the updateLayer method
let myGeoJsonLayer = new L.geoJSON();
let polylineLayer = new L.polyline([])
let layerGroup = new L.LayerGroup();
layerGroup.addTo(mymap);
layerGroup.addLayer(myGeoJsonLayer);

// Slider variables
let slider = document.getElementById("rangeSlider");
let output = document.getElementById("slideValue");
output.innerHTML = slider.value + " KM";
slider.oninput = function () {
    output.innerHTML = this.value + " KM";
    radiusRing.setRadius(this.value * 1000);
}
// Updating sooner than every 3 seconds in unncessesary due to API response time
setInterval(updateLayer, 3000);

// First changes the raw JSON from the fetch request into geoJSON. geoJSON was the simplest way to add properties to multiple marker objects that need to dynamically update.
// Then removes the current layer and creates and adds a new layer with the updated API data
async function updateLayer() {
    const planes = await getData();
    
    if (firsttime) {
        document.getElementById("loading").remove();
    }
    firsttime = false;

    if (planes) {

        // geoData will be the collection of 'features' (the individual plane data) that is eventually pushed onto the geoLayer
        let geoData = {};
        geoData['type'] = "FeatureCollection";
        let features = [];
        for (let i = 0; i < planes.length; i++) {
            let outGeoJson = {};
            outGeoJson['type'] = 'Feature';
            outGeoJson['properties'] = {
                'callsign': planes[i][1],
                'rotation': planes[i][10],
                'altitude': planes[i][7],
                'velocity': planes[i][9]
            };
            outGeoJson['geometry'] = {
                'type': 'Point', 'coordinates':
                    [planes[i][5], planes[i][6]]
            };
            features.push(outGeoJson);
        }
        geoData['features'] = features;

        // Flush the current geoLayer
        layerGroup.removeLayer(myGeoJsonLayer);

        // Create a new layer. For each plane, we add a marker at the coordinates of the plane and bind a popup with the properties pulled from above
        myGeoJsonLayer = L.geoJSON(geoData, {
            pointToLayer: function (feature, latlng) {
                return L.marker(latlng, { icon: myIcon })
                .setRotationAngle(feature.properties.rotation - 90)
                .setRotationOrigin('center center');
            },
            onEachFeature: function (feature, layer) {
                let popupContent = '<p style="text-align:center;">' + feature.properties.callsign + "<br><br>Altitude: " +
                    feature.properties.altitude + " Meters<br>Velocity: " + feature.properties.velocity + " kmph</p>";
                if (savedFeature && savedFeature.properties.callsign === feature.properties.callsign) {
                    savedFeature = feature;
                }
                layer.bindPopup(popupContent, popupCustomOptions)
                    .on('click', function () {
                        clickedMarker = popupContent;
                        clickedFeature = feature;
                    });
            }
        });

    // If there are no planes within the radius, we simply create an empty layer
    } else {
        myGeoJsonLayer = new L.geoJSON();
    }
    mymap.removeLayer(layerGroup);
    layerGroup.addTo(mymap);
    layerGroup.addLayer(myGeoJsonLayer);
    return true;
}

// Fetch request from opensky for data
async function getData() {
    let location = moveableMarker.getLatLng();
    let offset = kmToCoordinate();
    let URL = "https://opensky-network.org/api/states/all?lamin=" + (location.lat - offset) + "&lomin=" + (location.lng - offset) + "&lamax=" + (location.lat + offset) + "&lomax=" + (location.lng + offset);
    const response = await fetch(URL);
    const data = await response.json();
    return data.states;
}

// Change the laditude point to kilometers
function kmToCoordinate() {
    let radius = document.getElementById("rangeSlider");
    return radius.value / 111;
}