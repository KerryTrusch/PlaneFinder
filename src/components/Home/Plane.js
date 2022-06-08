import "leaflet-rotatedmarker";
import { Marker, Tooltip } from "react-leaflet";
import L from 'leaflet';
import React, { useEffect, useRef, forwardRef } from "react";


function createIcon(url) {
    return new L.Icon({
        iconUrl: url,
        iconSize: [16, 24],
    });
}

const RotatedMarker = forwardRef(({ children, ...props }, forwardRef) => {
    const markerRef = useRef();
  
    const { rotationAngle, rotationOrigin } = props;
    useEffect(() => {
      const marker = markerRef.current;
      if (marker) {
        marker.setRotationAngle(rotationAngle);
        marker.setRotationOrigin(rotationOrigin);
      }
    }, [rotationAngle, rotationOrigin]);
  
    return (
      <Marker
        ref={(ref) => {
          markerRef.current = ref;
          if (forwardRef) {
            forwardRef.current = ref;
          }
        }}
        {...props}
      >
        {children}
      </Marker>
    );
  });

function Plane(props) {
        return (
            <RotatedMarker position={props.position} rotationAngle={props.rotation} rotationOrigin={'center'} icon={createIcon('plane2.png')}>
                <Tooltip>
                    <p style={{ textAlign: 'center' }}> {props.callsign} <br /><br />Altitude:
                        {props.altitude > 0 ? props.altitude : 0}  Meters<br />Velocity: {props.velocity} kmph</p>
                </Tooltip>
            </RotatedMarker>
        )
}

export default Plane;