const configurationFile = "config.json";
const sceneConfigurationFile = "scene_config.json"
const mason = "MASON";
const ns3 = "NS3";
const cmdStart = "START";
const cmdNext = "NEXT";
const cmdEnd = "END";
const isMason = true;
const isNS3 = true;
const origin = {mason:"Mason", ns3:"ns3"};
const state_start = "START";//Sim initializing
const state_next = "NEXT";//Sim running a step
const state_end = "END";//Sim running a step
const state_pause = "PAUSE";//Sim paused
const state_stop = "STOP";//Sim not started
const command_play = "PLAY";
const command_step = "STEP";
const command_pause = "PAUSE";
const command_stop = "STOP";
const use_ns3 = false;
const LEVEL_SEVERE = 0;
const LEVEL_WARNING = 1;
const LEVEL_INFO = 2;
const LEVEL_FINE = 3;
const LEVEL_FINER = 4;
const LOG_LEVEL = LEVEL_INFO;
const LAG_MIN = 100;

var express = require('express');
var bodyParser = require("body-parser");
var fs = require('fs');
var app = express();
var http = require('http');
var state = state_stop;
var command;
var step;
var scene_config;

//app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json({limit: '10mb', extended: true}));
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', './views')
const config = JSON.parse(fs.readFileSync(configurationFile));
const port = process.env.PORT || config.engine.port;

var regions = {};
var params = {loaded:false};
var lag, scene_id;
var index = 0;
var nodes;

app.get('/', function(req, res) {
	res.render('index', {scenes:config.scenes, name:config.about.name});
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
	scene_id = parseInt(req.params.id);
	res.render('config', {config: config, scene:config.scenes[scene_id]});
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
	log(LEVEL_INFO, '--------------------------------------')
	log(LEVEL_INFO, '-------RUNNING ' + config.about.name + '-------')
	log(LEVEL_INFO, '-------VERSION ' + config.about.version + '-------');
	log(LEVEL_INFO, '----Engine listening on port '+port+'!----');
	log(LEVEL_INFO, '--------------------------------------\n')
});

const io = require('socket.io')(server);

io.on('connection', (socket) => {
	log(LEVEL_INFO, 'User connected');
	socket.on('disconnect', () => {
		log(LEVEL_INFO, 'User disconnected');
		//endSimulation();
	});
	socket.on('config', function (data, fn) {
		if(Object.entries(data).length === 0 && data.constructor === Object){
			scene_config = JSON.parse(fs.readFileSync(sceneConfigurationFile));
			scene_id = scene_config.id;
			params.tstep = scene_config.tstep;
			params.initPeople = 10;
			params.loaded = true;
		}else{
			params = data;
		}
		log(LEVEL_FINE, data);
		fn({image_file:config.scenes[scene_id].map.image_file, regions:config.scenes[scene_id].map.regions});
	});
	socket.on('sim', function (com, fn) {
		command = com;
		if(state == state_stop){
			if(com == command_play || com == command_step){
				startSimulation();
			}
		} else if (state == state_pause){
			if (com == command_play || com == command_step){
				nextStep();
			} else if (com == command_stop){
				endSimulation();
			}
		}
	});
});

function startSimulation(){
	lag = Date.now();
	state = state_start;
	index = 0;
	nodes = {};
	step = 0;
	var simData = {};
	//Load regions
	for (var i = config.scenes[scene_id].map.regions.length - 1; i >= 0; i--) {
		var tmp_region = config.scenes[scene_id].map.regions[i];
		regions[tmp_region.id] = tmp_region;
	}
	switch (scene_id) {
		case 0: //Disconnection
			nodes[0] = {id: index++, type:"ROUTER", x:params.dimension/2, y:params.dimension/2};
			for (var i = 1; i <= params.numUsers; i++) {
				nodes[i] = {id: index++, type:"PERSON", x:rand(0,params.dimension), y:rand(0,params.dimension), connected: false};
			}
			simData = {id: 0, nodes: nodes, numUsers:params.numUsers, randMult: params.randMult,
				dimension:params.dimension, tstep: params.tstep};
			break;
		case 1: //Lift
			nodes[0] = {id: index++, type:"ROUTER", x:400, y:400};
			for (var i = 1; i <= params.initPeople; i++) {
				tmp_point = getPointInRegion(2);
				nodes[i] = {id: index++, type:"PERSON", x:tmp_point.x, y:tmp_point.y, connected:false}; 
			}
			simData = {id: 1, nodes: nodes, initPeople:params.initPeople, pPerMin: params.pPerMin, 
				pLift: params.pLift, tstep: params.tstep, randMult: 0.1, numUsers:10, dimension: 200};
			break;
		case 2: //Classroom
			nodes[index] = {id: index++, type:"ROUTER", x:2217, y:943};
			nodes[index] = {id: index++, type:"ROUTER", x:4286, y:1081};
			nodes[index] = {id: index++, type:"ROUTER", x:2210, y:2355};
			nodes[index] = {id: index++, type:"ROUTER", x:4334, y:2013};
			if(params.loaded){
				Object.keys(scene_config.population.location).forEach(function(reg) {
					for (var i = scene_config.population.location[reg] - 1; i >= 0; i--) {
						tmp_point = getPointInRegion(reg);
						nodes[index] = {id: index++, type:"PERSON", x:tmp_point.x, y:tmp_point.y, connected:false}; 
					}
				});
			} else {
				for (var i = 1; i <= params.initPeople; i++) {
					for (var j = 100; j <= 1100; j += 100) {
						tmp_point = getPointInRegion(j);
						nodes[index] = {id: index++, type:"PERSON", x:tmp_point.x, y:tmp_point.y, connected:false}; 
					}
				}
			}
			simData = {id: 2, nodes: nodes, initPeople:params.initPeople, randMult: 0.1,
				tstep: params.tstep, numUsers:10, dimension: 200};
			break;
		default:
			//Error
	}
	simData.map = config.scenes[scene_id].map;
	log(LEVEL_INFO, "Initial data generated");
	log(LEVEL_FINE, "Initial message:", simData);
	post(config.mason, state, simData);
	if (use_ns3) {
		post(config.ns3, state, simData);
	}
}

function nextStep(){
	lag = Date.now();
	step++;
	state = state_next;
	switch (scene_id){
		case 0:
			break;
		case 1:
			removePeopleAtExits();			
			//Generate new people
			num_pers = params.pPerMin * params.tstep / 60000;
			while (num_pers > 0){
				if (num_pers >= 1 || Math.random() < num_pers){
					tmp_point = getPointInRegion(0);
					ind = index++;
					nodes[ind] = {id: ind, type:"PERSON", x:tmp_point.x, y:tmp_point.y, connected:false};
				}
				num_pers--;
			}
			break;
		case 2:
			removePeopleAtExits();
			break;
	}
	if (use_ns3) {
		post(config.ns3, state, {nodes:nodes, tstep: params.tstep});
	} else {
		post(config.mason, state, {nodes:nodes, tstep: params.tstep});
	}
}

function endSimulation(){
	lag = Date.now();
	state = state_end;
	post(config.mason, state, {});
	if (use_ns3) {
		post(config.ns3, state, {});
	}
	nodes = {};
}

function controller(orig, msg){
	total_lag = Date.now()-lag;
	log(LEVEL_INFO, "Lag "+orig+": "+total_lag);
	log(LEVEL_FINE, msg);
	if (orig == origin.mason){
		if(state == state_start){
			state = state_pause;
			io.sockets.emit('info', {nodes: nodes, tstep: params.tstep, state:state, command: command, step:step});
			if(command == command_play){
				setTimeout(nextStep, Math.max(1, 100 - total_lag));
			}
		} else if(state == state_next){
			for (var i = msg.data.nodes.length - 1; i >= 0; i--) {
				var node = msg.data.nodes[i];
				nodes[node.id].x = node.x;
				nodes[node.id].y = node.y;
			}
			state = state_pause;
			io.sockets.emit('info', {nodes: nodes, tstep: params.tstep, state:state, command: command, step:step});
			if(command == command_play){
				setTimeout(nextStep, Math.max(1, LAG_MIN - total_lag));//TODO
			}
		} else if (state == state_end){
			state = state_stop;
			io.sockets.emit('info', {state:state});
		}
	} else if (orig == origin.ns3){
		if(state == state_start){

		} else if(state == state_next){
			for (var i = msg.data.nodes.length - 1; i >= 0; i--) {
				var node = msg.data.nodes[i];
				nodes[node.id].connected = node.connected;
			}
			var data = {nodes: msg.data.nodes, tstep: params.tstep}
			post(config.mason, "NEXT", data);
		} else if (state == state_end){
			
		}
	}
}

function post(dest, cmd, data){
	var msg = {cmd:cmd, data:data};
	log(LEVEL_FINE, "Sending message: ", msg.cmd, " to ", dest.name);
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
			log(LEVEL_INFO, "body: " + chunk);
		});
	});
	req.write(data);
	req.end();
}

function removePeopleAtExits(){
	exits = config.scenes[scene_id].map.exits;
	for (var i in nodes){
		var node = nodes[i];
		if (node.type == 'PERSON'){
			for (var j = 0; j < exits.length; j++) {
				if (isIncluded(exits[j], node)){
					log(LEVEL_FINE, 'Node ' + node.id + ' at region ' + exits[j] + ' deleted.');
					delete nodes[node.id];
				}
			}
		}
	}
}

function getPointInRegion(reg_id){
	var reg = regions[reg_id];
	x = rand(reg.x1, reg.x2);
	y = rand(reg.y1, reg.y2);
	return {"x":x, "y":y};
}

function isIncluded(exit_id, node){
	region = regions[exit_id];
	if (node.x >= region.x1 && node.x <= region.x2 && node.y >= region.y1 && node.y <= region.y2)
		return true;
	return false;
}

function rand(init, end){
	return Math.floor((end-init)*Math.random())+init;
	//return Math.round((end-init)*Math.random()*100)/100+init;
}

function log(level, msg){
	if(level <= LOG_LEVEL){
		console.log(msg);
	}
}
