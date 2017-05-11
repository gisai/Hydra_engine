const name = "HYDRA";
const version = "0.0.3.2017.05.11";
const configurationFile = "config.json";
const mason = "MASON";
const ns3 = "NS3";
const cmdStart = "START";
const cmdNext = "NEXT";
const cmdEnd = "END";
const isMason = false;
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
app.use(bodyParser.json());//text()
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', './views')
const config = JSON.parse(fs.readFileSync(configurationFile));
const port = process.env.PORT || config.engine.port;
var params = {};
var lag;

app.get('/', function(req, res) {
	res.render('index', {scenes:scenes, name:name});
});

app.post('/mason', function(req, res){
	console.log("Lag: ",Date.now()-lag);
	res.send('');
	var msg = req.body;
	controller(0, msg);
	
});

app.post('/ns3', function(req, res){
	console.log("Lag: ",Date.now()-lag);
	res.send('{}');
	var msg = req.body;
	controller(3, msg);
});

app.get('/demo', function(req, res){//Comentar
	res.send('Ejecutando DEMO');
	demo();
});

app.get('/demo/msg', function(req, res){//Comentar
	res.send('Ejecutando DEMO msg');
	sendCmd(config.ns3, "DEMO", {numUsers: 25});
});

app.get('/demo/start', function(req, res){//Comentar
	res.send('Enviando start');
	sendCmd(config.ns3, "START", {numUsers: 25});
});

app.get('/demo/next', function(req, res){//Comentar
	res.send('Enviando next');
	sendCmd(config.ns3, "NEXT", {numUsers: 25});
});

app.get('/demo/end', function(req, res){//Comentar
	res.send('Enviando end');
	sendCmd(config.ns3, "END", {numUsers: 25});
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
	console.log('a user connected');
	socket.on('disconnect', () => {
		console.log('user disconnected');
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
		console.log(data);
	});
});

function generateInitialData(){
	var data =[];
	data.append({id:0, type:"ROUTER", posX:params.dimensions/2, posY:params.dimensions/2});
	for (var i = 1; i <= params.numUsers; i++) {
		data.append({id:i, type:"PERSON", posX:rand(0,params.dimensions), posY:rand(0,params.dimensions)});
	}
	return data;
}

function startSimulation(){
	lag = Date.now();
	initData = generateInitialData();
	if isMason
		post(config.mason, {cmd: "START", data:initData});
	post(config.ns3, {cmd: "START", data:initData});
}

function nextStep(){
	lag = Date.now();
	if isMason
		post(config.mason, {cmd: "NEXT"});
	post(config.ns3, {cmd: "NEXT"});
}

function endSimulation(){
	lag = Date.now();
	if isMason
		post(config.mason, {cmd: "END"});
	post(config.ns3, {cmd: "END"});
}

function controller(orig, msg){

	io.sockets.emit('info', msg);
}

function demo(){
	var i = 1;
	var lag = 0;
	var numUsers = 20;
	var numSteps = 2;
	var delay = 1000;
	scheduleMessage(config.ns3, {cmd: "START", data:{numUsers:numUsers}}, i*delay);
	for (i = 2; i < numSteps+2; i++) {
		scheduleMessage(config.ns3, {cmd: "NEXT", data:""}, i*delay);
	}
	scheduleMessage(config.ns3, {cmd: "END", data:""}, i*delay);
}

function scheduleMessage(dest, message, time){
	setTimeout(function() {
		lag = Date.now();
		post(dest, message);
	}, time);
}

function sendCmd(dest, order, data){
	post(dest, {cmd: order, data: data});
}

function post(dest, msg){
	console.log("Sending message: ", msg, " to ", dest.name);
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
	return (end-init)*Math.round(Math.random()/100)*100+init;
}