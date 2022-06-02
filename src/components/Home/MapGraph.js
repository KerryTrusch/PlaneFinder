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
let bttn = document.getElementById("planeButton");
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

let dpsAlt = []; // dataPoints for altitude
let dpsVel = [];// dataPoints for velocity
let chart = new CanvasJS.Chart("chartContainer", {
    title: {
        text: "No plane currently tracked"
    },
    axisX: {
        title: "Seconds",
        interval: 1
    },
    axisY: {
        title: "Altitude (m)",
        titleFontColor: "red",
        lineColor: "red"
    },
    axisY2: {
        title: "Velocity (km/h)",
        titleFontColor: "blue",
        lineColor: "blue"
    },
    data: [
        {
            type: "spline",
            dataPoints: dpsAlt
        },
        {
            type: "spline",
            axisYType: "secondary",
            axisYIndex: 1,
            dataPoints: dpsVel
        }
    ]
});
let xVal = 0;
let yVal = 30000;
let dataLength = 100; // number of dataPoints visible at any point
chart.render();

bttn.onclick = function () {
    if (clickedFeature) {
        chart.destroy();
        mymap.removeLayer(polylineLayer);
        polylineLayer = L.polyline([], { color: 'yellow' }).addTo(mymap);
        xVal = 0;
        dpsAlt = [];
        dpsVel = [];
        chart = new CanvasJS.Chart("chartContainer", {
            title: {
                text: "No plane currently tracked"
            },
            axisX: {
                title: "Seconds"
            },
            axisY: {
                title: "Altitude (m)",
                titleFontColor: "steelBlue",
                lineColor: "blue",
                lineThickness: 4
            },
            axisY2: {
                title: "Velocity (km/h)",
                lineColor: "red",
                labelAutoFit: true,
                titleFontColor: "red",
                lineThickness: 4
            },
            data: [
                {
                    type: "spline",
                    dataPoints: dpsAlt
                },
                {
                    type: "spline",
                    axisYType: "secondary",
                    axisYIndex: 1,
                    dataPoints: dpsVel
                }
            ]
        });
        savedMarker = clickedMarker;
        savedFeature = clickedFeature;
        let callSign = savedMarker.substr(30);
        let temp = callSign.substr(0, callSign.indexOf("<"));
        chart.options.title.text = "Plane: " + temp;
        dpsAlt.push({
            x: xVal,
            y: savedFeature.properties.altitude
        });
        dpsVel.push({
            x: xVal,
            y: savedFeature.properties.velocity
        });

        // Lat and Lng are added in reverse order for geoJS formatting, so we have to put them in opposite order for latlng objects
        let newLatLng = [];
        newLatLng.push(savedFeature.geometry.coordinates[1]);
        newLatLng.push(savedFeature.geometry.coordinates[0]);
        polylineLayer.addLatLng(newLatLng);
        chart.render();
    }
}

let updateChart = async function (count) {
    await updateLayer();
    count = count || 1;
    xVal += 10;
    if (savedFeature) {
        yValAlt = savedFeature.properties.altitude;
        if (yValAlt == null) {
            yValAlt = 0;
        }
        yValVel = savedFeature.properties.velocity;
        dpsAlt.push({
            x: xVal,
            y: yValAlt
        });
        dpsVel.push({
            x: xVal,
            y: yValVel
        });
    }
    if (dpsAlt.length > dataLength) {
        dpsAlt.shift();
        dpsVel.shift();
    }
    if (!polylineLayer.isEmpty()) {
        let newLatLng = [];
        newLatLng.push(savedFeature.geometry.coordinates[1]);
        newLatLng.push(savedFeature.geometry.coordinates[0]);
        polylineLayer.addLatLng(newLatLng);
    }
    chart.render();
};

updateChart(dataLength);
setInterval(function () { updateChart() }, 3000);