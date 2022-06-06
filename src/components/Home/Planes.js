import { useState } from "react";
import { Marker } from "react-leaflet";

function Planes({data}) {
    const [planelist, setPlaneList] = useState([])
    return {planelist}
}

export default Planes;