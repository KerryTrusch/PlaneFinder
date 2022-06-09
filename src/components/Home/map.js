import * as maptalks from 'maptalks';
import { useEffect, useRef, useState } from 'react';

export default function Map() {
    const mapContainer = useRef(null);
    const map = useRef(null);
    const [lonlat, setLonlat] = useState([ -100, 40 ])
    const [currentLayer, setCurrentLayer] = useState(null);
    const [sliderVal, setSliderVal] = useState(200);
    function withinCircle(point) {
        let x = (point[1] - lonlat[1]) * (point[1] - lonlat[1])
        let y = (point[0] - lonlat[0]) * (point[0] - lonlat[0])
        let radius = (sliderVal / 111) * (sliderVal / 111)
        return ((x + y) <= radius)
    }

    useEffect(() => {
        if (map.current) return;
        map.current = new maptalks.Map('map', {
            center: lonlat,
            zoom: 4,
            baseLayer: new maptalks.TileLayer('base', {
                urlTemplate: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
                subdomains: ["a","b","c","d"],
                attribution: '&copy; <a href="http://osm.org">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/">CARTO</a>'
              })
        });
        var DraggableMarker = new maptalks.Marker(
            lonlat,
            {
              visible : true,
              cursor : 'pointer',
              shadowBlur : 0,
              shadowColor : 'black',
              draggable : true,
              dragShadow : false, // display a shadow during dragging
              drawOnAxis : null  // force dragging stick on a axis, can be: x, y
            }
          ).addTo(map.current)
            .on()
        // this is how to make a point with an altitude
        // var point = new maptalks.Marker( 
        //     lonlat,
        //     {
        //       properties : {
        //         altitude : 15000
        //       }
        //     }
        //   );

        let newLayer = new maptalks.VectorLayer('vector', [], {
            enableAltitude : true,        // enable altitude
            altitudeProperty : 'altitude' // altitude property in properties, default by 'altitude'
          }).addTo(map.current);
        setCurrentLayer(newLayer);
    })

    useEffect(() => {
        function getData() {
            setTimeout(() => {
                let URL = "https://opensky-network.org/api/states/all?lamin=" + (lonlat[1] - sliderVal / 111) + "&lomin=" + (lonlat[0] - sliderVal / 111) + "&lamax=" + (lonlat[1] + sliderVal / 111) + "&lomax=" + (lonlat[0] + sliderVal / 111);
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
                            let point = [ data[5], data[6] ]
                            if (withinCircle(point) && data[1]) {
                                // let plane = <Plane position={point} rotation={data[10]} callsign={data[1]} velocity={data[9]} altitude={data[7]} key={data[1] + " " + point.lat} />
                                let plane = new maptalks.Marker(lonlat, {
                                    properties: {
                                        altitude: parseInt(data[7])
                                    }
                                })
                                return plane;
                            } else {
                                return undefined;
                            }
                        })

                        planes = planes.filter((x) => {
                            return x !== undefined;
                        })
                        if (currentLayer) {
                            currentLayer.clear();
                        } else return;
                    })
                })
            }, 1000);
        }
        getData()
    })


    return (
        <div className="h-[calc(100vh_-_48px)] w-full">
            <div id='map' className='w-screen h-full' ref={mapContainer}>

            </div>
        </div>
    )
}