import {useState, useRef, useMemo} from 'react';
import {Marker} from 'react-leaflet';
function DraggableMarker(props) {
    const [position, setPosition] = useState(props.center)
    const markerRef = useRef(null)
    const eventHandlers = useMemo(
        () => ({
            dragend() {
                const marker = markerRef.current
                if (marker != null) {
                    setPosition(marker.getLatLng())
                    props.setMarkerCoordinate(marker.getLatLng());
                }
            },
        }),
        [],
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