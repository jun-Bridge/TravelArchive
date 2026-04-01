/**
 * map.js
 * handles Kakao Map initialization and communication with the parent window.
 */

// 1. Get Kakao Map API Key from environment variables
const KAKAO_API_KEY = import.meta.env.VITE_KAKAO_MAP_KEY;

// 2. Dynamically load the Kakao Map SDK
const script = document.createElement('script');
script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_API_KEY}&autoload=false`;

script.onload = () => {
  // Initialize Kakao Map after the SDK is loaded
  kakao.maps.load(() => {
    const container = document.getElementById('map');
    const options = {
      center: new kakao.maps.LatLng(33.450701, 126.570667), // Default coordinates (Seoul/Jeju)
      level: 3
    };
    const map = new kakao.maps.Map(container, options);

    /**
     * Listen for messages from the parent window (index.html).
     * Used to update the map view based on chat interactions.
     */
    window.addEventListener('message', (e) => {
      const { type, lat, lng, title } = e.data;

      if (type === 'MOVE_TO') {
        const pos = new kakao.maps.LatLng(lat, lng);
        
        // Move the map center to the specified position
        map.setCenter(pos);

        // Add a marker and show an info window
        const marker = new kakao.maps.Marker({ position: pos, map });
        const infoWindow = new kakao.maps.InfoWindow({
          content: `<div style="padding:6px 10px;font-size:13px;color:#333;">${title}</div>`
        });
        infoWindow.open(map, marker);
      }
    });
  });
};

document.head.appendChild(script);
