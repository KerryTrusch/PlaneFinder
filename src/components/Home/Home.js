import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Circle } from 'react-leaflet';
import "leaflet-rotatedmarker";
import DraggableMarker from './DraggableMarker';
import Plane from './Plane';

function Home() {
    const [sliderVal, setSliderVal] = useState(200);
    const [markerCoordinate, setMarkerCoordinate] = useState({ lat: 40, lng: -100 })
    const [planeData, setPlaneData] = useState([])
    const [planeList, setPlaneList] = useState([]);
    function handleSliderChange(e) {
        setSliderVal(parseInt(e.target.value));
    }

    function withinCircle(point) {
        let x = (point.lat - markerCoordinate.lat) * (point.lat - markerCoordinate.lat)
        let y = (point.lng - markerCoordinate.lng) * (point.lng - markerCoordinate.lng)
        let radius = (sliderVal / 111) * (sliderVal / 111)
        return ((x + y) <= radius)
    }

    useEffect(() => {
        function getData() {
            const tempSlideVal = document.getElementById("rangeSlider").value;
            getData.sliderVal = parseInt(tempSlideVal);
            getData.markerCoordinate = markerCoordinate;
            setTimeout(() => {
                if (document.getElementById("rangeSlider").value === tempSlideVal && getData.sliderVal === sliderVal && getData.markerCoordinate === markerCoordinate) {
                    let URL = "https://opensky-network.org/api/states/all?lamin=" + (markerCoordinate.lat - sliderVal / 111) + "&lomin=" + (markerCoordinate.lng - sliderVal / 111) + "&lamax=" + (markerCoordinate.lat + sliderVal / 111) + "&lomax=" + (markerCoordinate.lng + sliderVal / 111);
                    const response = fetch(URL, {
                        mode: 'cors',
                        headers: {
                            'Access-Control-Allow-Origin': '*'
                        }
                    });

                    let timeOutPromise = new Promise(function (resolve, reject) {
                        setTimeout(resolve, 4000, 'Timeout Done')
                    })

                    Promise.all([response, timeOutPromise]).then(function (values) {
                        let jsonPromise = new Promise(function (resolve, reject) {
                            resolve(values[0].json());
                        })
                        jsonPromise.then((val) => {
                            let planeDataList = val.states;
                            let planes = planeDataList.map((data) => {
                                let point = { lat: data[6], lng: data[5] }
                                if (withinCircle(point)) {
                                    let plane = <Plane position={point} rotation={data[10]} callsign={data[1]} velocity={data[9]} altitude={data[7]} key={data[1]} />
                                    return plane;
                                } else {
                                    return undefined;
                                }
                            })
                            planes = planes.filter((x) => {
                                return x !== undefined;
                            })
                            setPlaneList((prev) => planes)
                            setPlaneData((prev) => val.states);
                            getData()
                        })
                    })
                }
            }, 5000);
        }
        getData()
    }, [sliderVal, markerCoordinate])

    useEffect(() => {
        console.log(planeData)
    }, [planeData])

    return (
        <div>
            <div className="absolute top-20 right-0 flex flex-col bg-black height-1/2 z-[10000] px-6 pt-1 rounded">
                <div className="text-center text-white mb-4">
                    Set search radius
                </div>
                <input type="range" min="100" max="1000" className="" id="rangeSlider" defaultValue={200} onChange={handleSliderChange} />
                <div className="text-center text-white">
                    {sliderVal} KM
                </div>
            </div>
            <MapContainer center={[30, -80]} zoom={4} className="w-screen h-screen" preferCanvas={true} >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <DraggableMarker center={markerCoordinate} setMarkerCoordinate={setMarkerCoordinate} />
                <Circle center={markerCoordinate} radius={sliderVal * 1000} />
                {planeList}
            </MapContainer>
        </div>
    )
}

export default Home;