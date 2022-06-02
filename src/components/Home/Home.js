import { useEffect, useState } from 'react';

const L = window.L;
let mymap = null;
let moveableMarker = null
let radiusRing = null

var proto_initIcon = L.Marker.prototype._initIcon;
var proto_setPos = L.Marker.prototype._setPos;
var oldIE = (L.DomUtil.TRANSFORM === 'msTransform');

L.Marker.addInitHook(function () {
    var iconOptions = this.options.icon && this.options.icon.options;
    var iconAnchor = iconOptions && this.options.icon.options.iconAnchor;
    if (iconAnchor) {
        iconAnchor = (iconAnchor[0] + 'px ' + iconAnchor[1] + 'px');
    }
    this.options.rotationOrigin = this.options.rotationOrigin || iconAnchor || 'center bottom';
    this.options.rotationAngle = this.options.rotationAngle || 0;

    // Ensure marker keeps rotated during dragging
    this.on('drag', function (e) { e.target._applyRotation(); });
});

L.Marker.include({
    _initIcon: function () {
        proto_initIcon.call(this);
    },

    _setPos: function (pos) {
        proto_setPos.call(this, pos);
        this._applyRotation();
    },

    _applyRotation: function () {
        if (this.options.rotationAngle) {
            this._icon.style[L.DomUtil.TRANSFORM + 'Origin'] = this.options.rotationOrigin;

            if (oldIE) {
                // for IE 9, use the 2D rotation
                this._icon.style[L.DomUtil.TRANSFORM] = 'rotate(' + this.options.rotationAngle + 'deg)';
            } else {
                // for modern browsers, prefer the 3D accelerated version
                this._icon.style[L.DomUtil.TRANSFORM] += ' rotateZ(' + this.options.rotationAngle + 'deg)';
            }
        }
    },

    setRotationAngle: function (angle) {
        this.options.rotationAngle = angle;
        this.update();
        return this;
    },

    setRotationOrigin: function (origin) {
        this.options.rotationOrigin = origin;
        this.update();
        return this;
    }
});

//Customization for plane and popup on click
const myIcon = L.icon({
    iconUrl: "plane.png",
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

// Initialize the first geoLayer. We use a layerGroup to flush the geoLayer when we call the updateLayer method
let myGeoJsonLayer = new L.geoJSON();
let layerGroup = new L.LayerGroup();

// set this equal to the slider oninput
function setNewRadius(val) {
    radiusRing.setRadius(val * 1000);
}
// First changes the raw JSON from the fetch request into geoJSON. geoJSON was the simplest way to add properties to multiple marker objects that need to dynamically update.
// Then removes the current layer and creates and adds a new layer with the updated API data
async function updateLayer(data) {
    const planes = await getData(data);
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
async function getData(data) {
    let URL = "https://opensky-network.org/api/states/all?lamin=" + (data.lat - data.offset) + "&lomin=" + (data.lng - data.offset) + "&lamax=" + (data.lat + data.offset) + "&lomax=" + (data.lng + data.offset);
    const response = await fetch(URL);
    const newdata = await response.json();
    return newdata.states;
}

// Change the laditude point to kilometers
function kmToCoordinate(value) {
    return value / 111;
}

function Home() {
    const [sliderVal, setSliderVal] = useState(0);
    const [coordinate, setCoordinate] = useState({lat: 40, lng: -100})
    //text underneath slider telling current range
    const [output, setOutput] = useState(sliderVal + " KM")
    useEffect(() => {
        // Create a leaflet map initialized at a point within the United States
        if (!mymap) {
            mymap = L.map('mapid', { tap: L.Browser.safari && L.Browser.mobile, renderer: L.canvas() }).setView([30, -80], 4);
        }
        moveableMarker = L.marker([40, -100], { draggable: true }, { autoPan: true }).addTo(mymap);
        radiusRing = L.circle([40, -100], { radius: 250 * 1000 }).addTo(mymap); 
        moveableMarker.on('movestart', function () {
            mymap.removeLayer(radiusRing);
        });
        moveableMarker.on('moveend', function () {
            let rad = radiusRing.getRadius();
            radiusRing = L.circle([coordinate.lat, coordinate.lng], { radius: rad }).addTo(mymap);
        });
        layerGroup.addTo(mymap);
        tiles.addTo(mymap);
        layerGroup.addLayer(myGeoJsonLayer);
        let layerdata = {'lat': coordinate.lat, 'lng': coordinate.lng, 'offset': (sliderVal / 111)};
        setInterval(updateLayer(layerdata), 3000);

    }, [])
    return (
        <div className="w-screen h-screen">
            <div>
                Live map of planes around the world
            </div>
            <div id="mapid" className="w-3/4 h-3/4"></div>
        </div>
    )
}

export default Home;