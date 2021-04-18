const doc = document;
mapboxgl.accessToken = 'pk.eyJ1IjoiYWJkb2ciLCJhIjoiY2tuOWNtcjRiMTZpZTJvbnhob3hncDh1MyJ9.RgydBoT8SbLZbZexcf2Clg';
var basketId = 0, startId = 0, circleRad = 20;
let config = {
    apiKey: "hXBt2sTMhpV6Zq3OVZo4Il9zSlau2ByMHh5YDZCf",
    authDomain: "smartbin-4d89e-default-rtdb.firebaseapp.com",
    projectId: "smartbin-4d89e-default-rtdb",
    databaseURL: "https://smartbin-4d89e-default-rtdb.firebaseio.com",
};
firebase.initializeApp(config);
const database = firebase.database();
let userType = localStorage.getItem('user-type') ? localStorage['user-type'] : 'driver';
let today, driverHistory;

var map = new mapboxgl.Map({
	container: 'map',
	style: 'mapbox://styles/mapbox/light-v10',
	center: [13.46, 52.5],
	zoom: 12
});
var baskets = [], data, canvas, start, list = [], geo = new mapboxgl.GeolocateControl({
	positionOptions: {
		enableHighAccuracy: true,
	},
	trackUserLocation: true,
	showAccuracyCircle: false
});
map.addControl(geo);

function getContainersState(datas)
{
	list = datas.val();
	let res = [];
	for(let i = 0; i < list.length; ++i)
	{
		if(list[i].completeness >= 80 || userType != 'driver')
		{
			res.push({id: i, lng: list[i].lat, lat: list[i].lng});
		}
	}
	if(res.length >= 2)
	{
		for(const item of res)
		{
			addPoint(new mapboxgl.LngLat(item.lng, item.lat), item.id);
		}
		if(userType == 'driver')
		{
			getPath(start, baskets);
		}
	}
}

function addPoint(point, id)
{
	for(let i = 0; i < baskets.length; ++i)
	{
		if(baskets[i].realId === id)
		{
			if(list[id].completeness >= 80)
			{
				map.getLayer(baskets[i].id).paint._values['circle-color'].value.value.b = 0;
				map.getLayer(baskets[i].id).paint._values['circle-color'].value.value.r = 1;
			}
			else
			{
				map.getLayer(baskets[i].id).paint._values['circle-color'].value.value.r = 0;
				map.getLayer(baskets[i].id).paint._values['circle-color'].value.value.b = 1;
			}
			
			return;
		}
	}
	var el = document.createElement('div');
	el.className = 'marker';
	el.style.backgroundImage = 'url(../icons/trash.png)';
	el.style.backgroundSize = '100%';
	let marker = new mapboxgl.Marker(el).setLngLat(point).addTo(map);
    map.addLayer({
		id: 'basket' + basketId,
		type: 'circle',
		source: {
			type: 'geojson',
			data: {
			type: 'FeatureCollection',
			features: [{
				type: 'Feature',
				properties: {},
				geometry: {
				type: 'Point',
				coordinates: [point.lng, point.lat]
				}
			}]
			}
		},
		paint: {
			'circle-radius': circleRad,
			'circle-color': (list[id].completeness >= 80 ? '#f00' : '#00f')
		}
	});
	baskets.push({ id: 'basket' + basketId, realId: id, loc: point, mkr: marker});
	++basketId;
}

function getDrivers(data)
{
	console.log(data.val());
	driverHistory = data.val()[parseInt(localStorage['driver-index'])]['history'];
}

map.on('load', function(event)
{
	if(userType == 'driver')
	{
		let dat = new Date();
		today = dat.getFullYear() + '-' + (dat.getMonth() < 10 ? '0' + dat.getMonth() : dat.getMonth())  + '-' + dat.getDate()
		canvas = map.getCanvasContainer();
		geo.trigger();
		geo.on('geolocate', function(ev)
		{
			console.log(ev);
			start = new mapboxgl.LngLat(ev.coords.longitude, ev.coords.latitude);
			moveStart();
			map.setCenter(start);
			map.setZoom(12);
			getPath(start, baskets);
		});
		database.ref('drivers').on('value', getDrivers);
	}
	database.ref('baskets').on('value', getContainersState);
});

if(userType == 'driver')
{
	function getPath(initPoint, endPoints)
	{
		if(!initPoint)
		{
			return;
		}
		if(endPoints.length === 0)
		{
			if(map.getSource('route'))
			{
				var geojson = {
					type: 'Feature',
					properties: {},
					geometry:
					{
						type: 'LineString',
						coordinates: []
					}
				};
				map.getSource('route').setData(geojson);
			}
			return;
		}
		var xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function(params)
		{
			if(this.readyState == 4)
			{
				var json = JSON.parse(this.response);
				console.log(json);
				var data = json.routes[0];
				var route = data.geometry.coordinates;
				var geojson = {
					type: 'Feature',
					properties: {},
					geometry:
					{
						type: 'LineString',
						coordinates: route
					}
				};
				if (map.getSource('route'))
				{
					map.getSource('route').setData(geojson);
				}
				else
				{
					map.addLayer({
					id: 'route',
					type: 'line',
					source: {
					type: 'geojson',
					data: {
						type: 'Feature',
						properties: {},
						geometry: {
						type: 'LineString',
						coordinates: route
						}
					}
					},
					layout: {
					'line-join': 'round',
					'line-cap': 'round'
					},
					paint: {
					'line-color': '#80e',
					'line-width': 5,
					'line-opacity': 0.75
					}
				});
				}
			}
		}
		var pts = initPoint.lng + ',' + initPoint.lat;
		for (var i = 0; i < endPoints.length; ++i)
		{
			pts += ';';
			pts += endPoints[i].loc.lng + ',' + endPoints[i].loc.lat;
		}
		var url = "https://api.mapbox.com/directions/v5/mapbox/driving/" + pts + "?annotations=maxspeed&overview=full&geometries=geojson&access_token=pk.eyJ1IjoiYWJkb2ciLCJhIjoiY2tuOWNtcjRiMTZpZTJvbnhob3hncDh1MyJ9.RgydBoT8SbLZbZexcf2Clg";
		xhr.open('GET', url, true);
		xhr.send();
	}

	function moveStart()
	{
		if(map.getSource('start'))
		{
			var geojson = {
				type: 'Feature',
				properties: {},
				geometry: {
					type: 'Point',
					coordinates: [start.lng, start.lat]
				}
			};
			map.getSource('start').setData(geojson);
		}
		else
		{
			map.addLayer({
				id: 'start',
				type: 'circle',
				source: {
					type: 'geojson',
					data: {
					type: 'FeatureCollection',
					features: [{
						type: 'Feature',
						properties: {},
						geometry: {
						type: 'Point',
						coordinates: [start.lng, start.lat]
						}
					}
					]
					}
				},
				paint: {
					'circle-radius': circleRad,
					'circle-color': '#80f'
				}
			});
		}
	}
	
	function clearBasket(basket)
	{
		map.removeLayer(basket.id);
		basket.mkr.remove();
		for(let i = 0; i < baskets.length; ++i)
		{
			if(baskets[i].id === basket.id)
			{
				baskets.splice(i, 1);
				break;
			}
		}
		
		list[basket.realId]['history'].push(today);

		let updates = {};
		updates['baskets/' + basket.realId + '/completeness'] = 0;
		if(driverHistory[today])
		{
			driverHistory[today].push({lng: basket.loc.lng, lat: basket.loc.lat});
		}
		else
		{
			driverHistory[today] = [];
		}

		updates['baskets/' + basket.realId + '/history'] = list[basket.realId]['history'];
		updates['drivers/' + localStorage['driver-index'] + '/history'] = driverHistory;

		database.ref().update(updates);
		start = new mapboxgl.LngLat(basket.loc.lng, basket.loc.lat);
		moveStart();
		getPath(start, baskets);
	}
	
	function removePoint(point)
	{
		for(var i = 0; i < baskets.length; ++i)
		{
			if(baskets[i].loc.distanceTo(point) <= 0.25 * Math.pow(2, (map.getMaxZoom() - map.getZoom())))
			{
				clearBasket(baskets[i]);
				return true;
			}
			console.log(0.25 * Math.pow(2, (map.getMaxZoom() - map.getZoom())));
		}
		return false;
	}
	
	function closestPoint(point)
	{
		if(baskets.length === 0)
		{
			return null;
		}
		let ans = baskets[0];
		for(let i = 1; i < baskets.length; ++i)
		{
			if(ans.loc.distanceTo(point) > baskets[i].loc.distanceTo(point))
			{
				ans = baskets[i];
			}
		}
		return ans;
	}

	map.on('click', function(e)
	{
		canvas.style.cursor = '';
		removePoint(e.lngLat);
	});

	doc.getElementById('clear').addEventListener('click', function(event)
	{
		navigator.geolocation.getCurrentPosition(
			function(ev)
			{
				let pt = closestPoint([ev.coords.longitude, ev.coords.latitude]);
				if(start.distanceTo(pt.loc) <= 100)
				{
					clearBasket(pt);
					getPath(start, baskets);
				}
				else
				{
					alert("You are too far")
				}
			});
	});
}