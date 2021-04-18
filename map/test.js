var truckLocation = [-83.093, 42.376];
var warehouseLocation = [-83.083, 42.363];
var lastQueryTime = 0;
var lastAtRestaurant = 0;
var keepTrack = [];
var currentSchedule = [];
var currentRoute = null;
var pointHopper = {};
var pause = true;
var speedFactor = 50;

mapboxgl.accessToken = 'pk.eyJ1IjoiYWJkb2ciLCJhIjoiY2tuOWNtcjRiMTZpZTJvbnhob3hncDh1MyJ9.RgydBoT8SbLZbZexcf2Clg';

var map = new mapboxgl.Map({
container: 'map',
style: 'mapbox://styles/mapbox/light-v10',
center: truckLocation,
zoom: 12
});

var warehouse = turf.featureCollection([turf.point(warehouseLocation)]);

// Create an empty GeoJSON feature collection for drop off locations
var dropoffs = turf.featureCollection([]);

// Create an empty GeoJSON feature collection, which will be used as the data source for the route before users add any new data
var nothing = turf.featureCollection([]);

map.on('load', function () {
var marker = document.createElement('div');
marker.classList = 'truck';

// Create a new marker
truckMarker = new mapboxgl.Marker(marker)
    .setLngLat(truckLocation)
    .addTo(map);

map.addLayer({
    id: 'warehouse',
    type: 'circle',
    source: {
        data: warehouse,
        type: 'geojson'
    },
    paint: {
        'circle-radius': 20,
        'circle-color': 'white',
        'circle-stroke-color': '#3887be',
        'circle-stroke-width': 3
    }
});

map.addSource('route', {
    type: 'geojson',
    data: nothing
});

map.addLayer(
    {
    id: 'routeline-active',
    type: 'line',
    source: 'route',
    layout: {
        'line-join': 'round',
        'line-cap': 'round'
    },
    paint: {
        'line-color': '#3887be',
        'line-width': ['interpolate', ['linear'], ['zoom'], 12, 3, 22, 12]
    }
    },
    'waterway-label'
);

map.addLayer(
    {
    id: 'routearrows',
    type: 'symbol',
    source: 'route',
    layout: {
        'symbol-placement': 'line',
        'text-field': '▶',
        'text-size': [
        'interpolate',
        ['linear'],
        ['zoom'],
        12,
        24,
        22,
        60
        ],
        'symbol-spacing': [
        'interpolate',
        ['linear'],
        ['zoom'],
        12,
        30,
        22,
        160
        ],
        'text-keep-upright': false
    },
    paint: {
        'text-color': '#3887be',
        'text-halo-color': 'hsl(55, 11%, 96%)',
        'text-halo-width': 3
    }
    },
    'waterway-label'
);

map.on('click', function (e) {
        newDropoff(map.unproject(e.point));
    });
});

function newDropoff(coords)
{
    var pt = turf.point([coords.lng, coords.lat], {
        orderTime: Date.now(),
        key: Math.random()
    });
    dropoffs.features.push(pt);
    pointHopper[pt.properties.key] = pt;

    $.ajax({
        method: 'GET',
        url: assembleQueryURL()
    }).done(function (data) {
    
        var routeGeoJSON = turf.featureCollection([
            turf.feature(data.trips[0].geometry)
        ]);

        if (!data.trips[0])
        {
            routeGeoJSON = nothing;
        }
        else
        {
            map.getSource('route').setData(routeGeoJSON);
        }
        if (data.waypoints.length === 12)
        {
            window.alert('Maximum number of points reached.');
        }
    });
}

function assembleQueryURL() {
    var coordinates = [truckLocation];
    var distributions = [];
    keepTrack = [truckLocation];

    var restJobs = objectToArray(pointHopper);

    if (restJobs.length > 0)
    {
        var needToPickUp =
        restJobs.filter(function (d, i) {
            return d.properties.orderTime > lastAtRestaurant;
        }).length > 0;

        if (needToPickUp) {
            var restaurantIndex = coordinates.length;
            coordinates.push(warehouseLocation);
            keepTrack.push(pointHopper.warehouse);
        }

        restJobs.forEach(function (d, i)
        {    
            keepTrack.push(d);
            coordinates.push(d.geometry.coordinates);           
            if (needToPickUp && d.properties.orderTime > lastAtRestaurant) {
                distributions.push(
                restaurantIndex + ',' + (coordinates.length - 1)
                );
            }
        });
    }

    return ('https://api.mapbox.com/optimized-trips/v1/mapbox/driving/' +
        coordinates.join(';') +
        '?distributions=' +
        distributions.join(';') +
        '&overview=full&steps=true&geometries=geojson&source=first&access_token=' +
        mapboxgl.accessToken);
}

function objectToArray(obj) {
var keys = Object.keys(obj);
var routeGeoJSON = keys.map(function (key) {
    return obj[key];
});
return routeGeoJSON;
}