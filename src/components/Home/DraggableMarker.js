import {useState, useRef, useMemo} from 'react';
import {Marker} from 'react-leaflet';
function DraggableMarker({center, setMarkerCoordinate, setPlaneList}) {
    const [position, setPosition] = useState(center)
    const markerRef = useRef(null)
    const eventHandlers = useMemo(
        () => ({
            dragend() {
                const marker = markerRef.current
                if (marker != null) {
                    setPosition(marker.getLatLng())
                    setMarkerCoordinate(marker.getLatLng());
                    setPlaneList([])
                }
            },
        }),
        [setMarkerCoordinate, setPlaneList],
    )

    return (
        <Marker
            draggable={true}
            eventHandlers={eventHandlers}
            position={position}
            ref={markerRef}>
        </Marker>
    )
}

export default DraggableMarker;