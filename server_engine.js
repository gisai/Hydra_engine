const name = "HYDRA";
const version = "0.0.3.2017.05.13";
const configurationFile = "config.json";
const mason = "MASON";
const ns3 = "NS3";
const cmdStart = "START";
const cmdNext = "NEXT";
const cmdEnd = "END";
const isMason = true;
const isNS3 = true;
const origin = {mason:"Mason", ns3:"ns3"};
const scenes = [{id:0, name:"Scene 0", description:"Several users with mobile phones move around a router, connecting and disconnecting from the WiFi."},
	{id:1, name:"Scene 1", description:"Sensing environment"},
	{id:2, name:"Scene 2", description:"Building B at the ETSIT"},
	{id:3, name:"Scene 3", description:"People moving in a classroom building"}];

var express = require('express');
var bodyParser = require("body-parser");
var fs = require('fs');
var app = express();
var http = require('http');
//app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', './views')
const config = JSON.parse(fs.readFileSync(configurationFile));
const port = process.env.PORT || config.engine.port;

var params = {};
var lag, state, simData;

app.get('/', function(req, res) {
	res.render('index', {scenes:scenes, name:name});
});

app.post('/mason', function(req, res){
	res.send('{}');
	controller(origin.mason, req.body);
});

app.post('/ns3', function(req, res){
	res.send('{}');
	controller(origin.ns3, req.body);
});

app.get('/scene/:id', function(req, res){
	res.render('config', {config: config});
});

app.get('/visualSim', function(req, res){
	res.render('visualSim');
});

app.get('/batchSim', function(req, res){
});

app.get('/analysis', function(req, res){
	res.render('analysis', {name:name});
});

const server = app.listen(port, function () {
	console.log('----Engine listening on port '+port+'!----\n');
});

const io = require('socket.io')(server);

io.on('connection', (socket) => {
	console.log('User connected');
	socket.on('disconnect', () => {
		console.log('User disconnected');
		//endSimulation();
	});
	socket.on('config', function (data) {
		params = data;
		console.log(data);
	});
	socket.on('sim', function (data) {
		if(data == "START"){
			startSimulation();
		} else if (data == "NEXT"){
			nextStep();
		} else if (data == "END"){
			endSimulation();
		}
	});
});

function generateInitialPositions(){
	var nodes =[];
	nodes.push({id:0, type:"ROUTER", x:params.dimension/2, y:params.dimension/2});
	for (var i = 1; i <= params.numUsers; i++) {
		nodes.push({id:i, type:"PERSON", x:rand(0,params.dimension), y:rand(0,params.dimension)});
	}
	return nodes;
}

function startSimulation(){
	lag = Date.now();
	state = "START";
	simData = {nodes:generateInitialPositions(), numUsers:params.numUsers, 
		randMult: params.randMult, dimension:params.dimension};
	post(config.mason, state, simData);
	post(config.ns3, state, simData);
	io.sockets.emit('info', simData);
}

function nextStep(){
	lag = Date.now();
	state = "NEXT";
	post(config.ns3, state, {nodes:simData.nodes, tstep: 1000});
}

function endSimulation(){
	lag = Date.now();
	state = "END";
	post(config.mason, state, "");
	post(config.ns3, state, "");
}

function controller(orig, msg){
	console.log("Lag "+orig+": ",Date.now()-lag);
	console.log("/"+orig+": ",msg);
	if (orig == origin.mason){
		if(state == "NEXT"){
			for (var i = msg.data.length - 1; i >= 0; i--) {
				var node = msg.data[i];
				simData.nodes[node.id].x = node.x;
				simData.nodes[node.id].y = node.y;
			}
			io.sockets.emit('info', simData);
		}
	} else if (orig == origin.ns3){
		if(state == "NEXT"){
			data = {nodes: msg.data, tstep: 1000}
			post(config.mason, "NEXT", data);
		}
	}
}

function post(dest, cmd, data){
	var msg = {cmd:cmd, data:data};
	console.log("Sending message: ", msg.cmd, " to ", dest.name);
	var data = JSON.stringify(msg);
	var options = {
		host: dest.host,
		port: dest.port,
		path: dest.path,
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Content-Length': Buffer.byteLength(data)
		}
	};
	var req = http.request(options, function(res) {
		res.setEncoding('utf8');
		res.on('data', function (chunk) {
			console.log("body: " + chunk);
		});
	});
	req.write(data);
	req.end();
}

function rand(init, end){
	return Math.round((end-init)*Math.random()*100)/100+init;
}
