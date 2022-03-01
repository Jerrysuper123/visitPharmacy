function initMap() {
  let singapore = [1.29, 103.85];

  let map = L.map("singaporeMap").setView(singapore, 13);

  L.tileLayer(
    "https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}",
    {
      attribution:
        'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery (c) <a href="https://www.mapbox.com/">Mapbox</a>',
      maxZoom: 18,
      id: "mapbox/streets-v11",
      tileSize: 512,
      zoomOffset: -1,
      accessToken:
        "pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw", //demo access token
    }
  ).addTo(map);

  return map;
}


async function main() {
  async function init() {
    let map = initMap();

    //customized pharmacy location marker
    let icon = L.Icon.extend({
      options: {
        //iconsize - width and height
        iconSize: [37, 40],
        iconAnchor: [22, 94],
        popupAnchor: [-3, -76]
      }
    });

    let pharmacyIcon = new icon({
      iconUrl: './images/pharmacy.png',
    })

    let startingWalkingIcon = new icon({
      iconUrl: "./images/walking.gif"
    })

    window.addEventListener("DOMContentLoaded", async function () {
      let searchDataArray = await extractAddressForSearch();
      let searchResultLayer = L.layerGroup();

      let routingControl = null;
      //find the nearby pharmacy
      document.querySelector("#searchNearByBtn")
        .addEventListener("click", function () {
          let options = {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
          };

          //get user location 
          function success(pos) {
            let crd = pos.coords;
            console.log("Your current position is:");
            console.log(`Latitude : ${crd.latitude}`);
            console.log(`Longitude: ${crd.longitude}`);

            let lat = crd.latitude;
            let lng = crd.longitude;

            let nearbyLatLng = [];
            let minDistance = Infinity;
            for (let el of searchDataArray) {
              let lat2 = Number(el[1]);
              let lng2 = Number(el[2]);

              //cal distance(km) between 2 coordinates
              let distance = calDistance(lat, lng, lat2, lng2);

              //get the coordinates of the min-distanced pharmacy
              if (distance < minDistance) {
                minDistance = distance;
                nearbyLatLng = [];
                nearbyLatLng.push(lat2, lng2);
              }
            }

            //if there is routing machine layer, remove it and add a new layer
            if(routingControl!==null){
              map.removeControl(routingControl);
              
              routingControl = null;
            };
    

            routingControl = L.Routing.control({
              waypoints: [
                L.latLng(lat, lng),
                L.latLng(nearbyLatLng[0], nearbyLatLng[1])
              ],
              createMarker: function (i, start, n){
                let marker_icon = null
                if (i == 0) {
                    // This is the first marker, indicating start
                    marker_icon = startingWalkingIcon
                } else if (i == n -1) {
                    //This is the last marker indicating destination
                    marker_icon =pharmacyIcon
                }
                let marker = L.marker (start.latLng, {
                            draggable: true,
                            bounceOnAdd: false,
                            bounceOnAddOptions: {
                                duration: 1000,
                                height: 800, 
                                function(){
                                    (bindPopup("myPopup").openOn(map))
                                }
                            },
                            icon: marker_icon
                })
                return marker},

              // routeWhileDragging: true
            });
            // console.log("Routing machine", routingControl);
            routingControl.addTo(map);

            map.flyTo([lat, lng], 13);
          }

          function error(err) {
            console.warn(`ERROR(${err.code}): ${err.message}`);
            alert("Please allow us to access your location to find the pharmacy near you!")
          }

          navigator.geolocation.getCurrentPosition(success, error, options);
        })

      // search for pharmacy through address
      document
        .querySelector("#searchBtn")
        .addEventListener("click", function (event) {
          event.preventDefault();

          searchResultLayer.clearLayers();
          let searchString = document.querySelector("#searchString").value;
          let filteredResult = searchDataArray.filter((el) =>
            el[0].toLowerCase().includes(searchString.toLowerCase())
          );

          let resultDiv = document.querySelector("#result");
          //this remove border radius, so that search resulted can come visually merge with search bar
          let searchByAddressBar = document.querySelector("#searchByAddressBar");
          searchByAddressBar.classList.add("borderRadiusNone");
          resultDiv.innerHTML = "";

          for (el of filteredResult) {
            //create marker based on filteredResult;
            let lat = Number(el[1]);
            let lng = Number(el[2]);
            let addressArray = el[0].split(",");
            let name = addressArray[0];
            let address = addressArray.slice(1);
            let pharmacistName = el[3];
            let marker = L.marker([lat, lng], { icon: pharmacyIcon });

            let popUpElement = document.createElement("div");
            popUpElement.classList.add("makerPopUp");
            popUpElement.innerHTML = `
            <h1 class="m-0">${name}</h1>
            <div class="d-flex align-items-center my-2">
              <i class="fa-solid fa-user-nurse markerAvatar me-3"></i>
              <section>
                <p class="fw-bold m-0">Registered Pharmacist</p>
                <p class="my-1">Name: <span class="keyInfo"> ${pharmacistName} </span> </p>
                <p class="m-0 p-0">Experience: <i class="fa-solid fa-ellipsis keyInfo"></i></p>
              </section/>
            </div>
            <p class="address subText"><i class="fa-solid fa-location-dot"></i> ${address}</p>
            `;

            let directionDivElement = document.createElement("div");
            // directionButton.classList.add("ms-auto");
            directionDivElement.innerHTML = `
            <button class="btn btn-info">
            direction <i class="fa-solid fa-diamond-turn-right"></i>
            </button>
            `;

            // popUpElement.appendChild(textElement);
            popUpElement.appendChild(directionDivElement);

            marker.bindPopup(
              popUpElement
            );
            marker.addTo(searchResultLayer);

            //create search result list and add event listener to each result
            let divElement = document.createElement("div");
            divElement.classList.add("m-3")
            divElement.innerHTML = `
            <i class="fa-solid fa-magnifying-glass me-1"></i>
            ${el[0].split(",")[0]}
            `;
            divElement.addEventListener("click", function () {
              //give border radius to searchbar again when user chose the locaiton
              searchByAddressBar.classList.remove("borderRadiusNone");
              resultDiv.innerHTML = "";
              map.flyTo([lat, lng], 13);
              marker.openPopup();
            });

            resultDiv.appendChild(divElement);
          }
        });
      searchResultLayer.addTo(map);
    });
  }
  init();
}

main();

