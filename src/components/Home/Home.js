import { createRef, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { FeatureGroup, MapContainer, TileLayer, Marker, Tooltip } from 'react-leaflet';
import "leaflet-rotatedmarker";
import DraggableMarker from './DraggableMarker';
//Customization for plane icon

function createIcon(url) {
    return new L.Icon({
        iconUrl: url,
        iconSize: [16, 24],
    });
}

// Fetch request from opensky for data
async function getData(data) {
    let URL = "https://opensky-network.org/api/states/all?lamin=" + (data.lat - data.offset) + "&lomin=" + (data.lng - data.offset) + "&lamax=" + (data.lat + data.offset) + "&lomax=" + (data.lng + data.offset);
    const response = await fetch(URL, {
        mode: 'cors',
        headers: {
            'Access-Control-Allow-Origin': '*'
        }
    });
    const newdata = await response.json();
    return newdata.states;
}

function Plane(props) {
    return (
        <Marker position={props.position} icon={createIcon('plane.png')} rotationAngle={props.rotation} rotationOrigin={'center center'}>
            <Tooltip>
                <p style={{ textAlign: 'center' }}> {props.callsign} <br /><br />Altitude:
                    {props.altitude}  Meters<br />Velocity: {props.velocity} kmph</p>
            </Tooltip>
        </Marker>
    )
}

function Home() {
    const [sliderVal, setSliderVal] = useState(200);
    const [markerCoordinate, setMarkerCoordinate] = useState({ lat: 40, lng: -100 })
    const [planeData, setPlaneData] = useState([])
    const [planeList, setPlaneList] = useState([]);
    const [resetTimer, setResetTimer] = useState(0)
    useEffect(() => {
        const fetchData = async (data) => {
            const planeInfo = await getData(data);
            setPlaneData(planeInfo);
        }
        setInterval(() => fetchData({ lat: markerCoordinate.lat, lng: markerCoordinate.lng, offset: sliderVal / 111 }), 7000);
    }, [])

    useEffect(() => {
        if (resetTimer > 10) {
            setPlaneList([])
            setResetTimer(0)
        }
        if (planeData) {
            let planes = planeData.map((data) => {
                return <Plane position={{ lat: data[6], lng: data[5] }} rotation={data[10]} callsign={data[1]} velocity={data[9]} altitude={data[7]} />
            })
            setPlaneList(planes)
        }
        console.log(resetTimer)
        setResetTimer((prev) => prev + 1)
    }, [planeData])

    return (
        <MapContainer center={[30, -80]} zoom={4} className="w-screen h-screen" preferCanvas={true} >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <DraggableMarker center={markerCoordinate} setMarkerCoordinate={setMarkerCoordinate} />
            {planeList}
        </MapContainer>
    )
}

export default Home;