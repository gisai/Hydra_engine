const SIZE = 60;
const state_start = "START";//Sim initializing
const state_next = "NEXT";//Sim running a step
const state_end = "END";//Sim running a step
const state_pause = "PAUSE";//Sim paused
const state_stop = "STOP";//Sim not started
const command_play = "PLAY";
const command_step = "STEP";
const command_pause = "PAUSE";
const command_stop = "STOP";

var socket = io.connect(window.location.host);
var canvas, context;
var simData = {};
var config = {};
var delta = 1;
var state = state_stop;
var showRegions = false;
var isDragging = false;
var dragX;
var dragY;
var offsetX = 50;
var offsetY = -120;
var imageUser = new Image();
imageUser.src = "images/man.png";
var imageUser_connected = new Image();
imageUser_connected.src = "images/man_green.png";
var imageRouter = new Image();
imageRouter.src = "images/router.png";


socket.on('connect', function () {
	socket.emit('hi!');
	socket.on('info', function(msg) {
		info(msg);
	});
});

$('#scenes').on('click', '.edit_scene', function(event) {

});

$('#scenes').on('click', '.clickable_row', function(event) {
	if($(this).hasClass('active')){
		$(this).removeClass('active'); 
	} else {
		$(this).addClass('active').siblings().removeClass('active');
		selectScene($(this).attr("id"));
	}
});

$('#loadFile').on('click', function(event) {
	socket.emit('config', {}, setupSim);
});

function selectScene(id){
	$.get('/scene/'+id, function (data) {
		$('#container').html(data);
		$('#runVisual').on('click', function(e){
			e.preventDefault();
			var $inputs = $('#scene input');
			var params = {};
		    $inputs.each(function() {
		    	if ($('#scene input').attr('type') == "number"){
		    		params[this.name] = $(this).val()*1;
		    	} else {
		    		params[this.name] = $(this).val();
		    	}
		    });
		    socket.emit('config', params, setupSim);
		});
	});
}

function setupSim(data){
	config.regions = data.regions;
	config.map = {"loc": data.image_file};
	console.log(data);
	config.map.image = new Image();
	config.map.image.src = config.map.loc;
	if (config.map.image.complete) {
	  runVisual()
	} else {//Wait until image loads to print it
	  config.map.image.addEventListener('load', runVisual)
	  config.map.image.addEventListener('error', function() {
	      alert('error')
	  })
	}
}

function runVisual(){
	$.get('/visualSim', function (data) {
		$('#container').remove();
		$('body').append(data);
		$('#play').on('click', function(e){
			sendCommand(command_play);
			e.preventDefault();
		});
		$('#step').on('click', function(e){
			sendCommand(command_step);
			e.preventDefault();
		});
		$('#pause').on('click', function(e){
			sendCommand(command_pause);
			e.preventDefault();
		});
		$('#stop').on('click', function(e){
			sendCommand(command_stop);
			e.preventDefault();
		});
		$('#toggle_regions').on('click', function(e){
			toggleRegions();
			e.preventDefault();
		});
		$('#canvas').on('click', function(e){
			if(showRegions){
				var pos = getMousePosCanvas(canvas,e);
				$('#log').text(Math.round(pos.x) + ', ' + Math.round(pos.y));
			}
			e.preventDefault();
		});
		$('#canvas').on('mousedown', function(e){
			isDragging = true;
			dragX = e.offsetX;
			dragY = e.offsetY;
			console.log('Drag: ' + dragX + ','+ dragY);
		});
		$('#canvas').on('mousemove', function(e){
			if(isDragging){
				offsetX += e.offsetX - dragX;
				offsetY += e.offsetY - dragY;
				dragX = e.offsetX;
				dragY = e.offsetY;
				console.log('Offset: ' + offsetX + ','+ offsetY);
				redraw();
			}
		});
		$('#canvas').on('mouseup', function(e){
			isDragging = false;
		});
		$('#canvas').on('mousewheel', function(e){
			tmp_delta = e.originalEvent.deltaY;
			if (tmp_delta > 0){
				delta = delta / 1.1;
			} else {
				delta = delta * 1.1;
			}
			console.log('Zoom: ' + delta);
			redraw();
		});
		$('#pause').hide();
		$('#stop').hide();
		canvas = document.getElementById('canvas'),
		context = canvas.getContext('2d');
		window.addEventListener('resize', resizeCanvas, false);
		//window.addEventListener('keypress', nextStep, false);
		canvas.width = window.innerWidth - 60;
		canvas.height = window.innerHeight - 60;//Navbar height + margin
		setDelta();
		redraw();
	});
}

function toggleRegions(){
	showRegions = !showRegions;
	redraw();
}

function sendCommand(command){
	$('#play').hide();
	$('#step').hide();
	$('#pause').hide();
	$('#stop').hide();
	socket.emit('sim', command);
}

function info(msg){//Message INFO from engine
	simData = msg;
	console.log(msg);
	if (msg.state == state_stop){
		$('#play').show();
		$('#step').show();
		$('#pause').hide();
		$('#stop').hide();
	} else {
		if(msg.command == command_play){
			$('#play').hide();
			$('#step').hide();
			$('#pause').show();
			$('#stop').hide();
		} else {
			$('#play').show();
			$('#step').show();
			$('#pause').hide();
			$('#stop').show();
		}
	}
	$('#log').text('Ppl:'+ (Object.keys(msg.nodes).length - 4));
	if(msg.hasOwnProperty('step')){
		$('#log').append('\nT:'+msg.step+'s.');
	}
	redraw();
}

/*
	----VISUAL----
*/

function redraw() {
	context.setTransform(1, 0, 0, 1, 0, 0);
	context.clearRect(0,0,canvas.width, canvas.height);
	context.setTransform(delta, 0, 0, delta, offsetX, offsetY);
	//context.drawImage(config.map.image, 0, 0, config.map.image.width * delta, config.map.image.height * delta);
	context.drawImage(config.map.image, 0, 0, config.map.image.width, config.map.image.height);
	if(showRegions){
		for (var i in config.regions) {
			context.globalAlpha = 0.2;
			context.fillStyle = "blue";
			context.strokeStyle = "blue";
			var reg = config.regions[i];
			//context.strokeRect(delta*reg.x1, delta*reg.y1, delta*reg.x2 - delta*reg.x1, delta*reg.y2 - delta*reg.y1);
			context.fillRect(reg.x1, reg.y1, reg.x2 - reg.x1, reg.y2 - reg.y1);
			context.globalAlpha = 1;
			context.lineWidth = 6;
			context.strokeRect(reg.x1, reg.y1, reg.x2 - reg.x1, reg.y2 - reg.y1);
			context.font = "50px Georgia";
			context.fillStyle = "black";
			context.fillText(reg.id,reg.x1 + 10,reg.y1 + 30);
		}
	}
	if(!simData.hasOwnProperty('nodes')){
		return;
	}
	for (var i in simData.nodes) {
		var node = simData.nodes[i];
		var image;
		if(node.type == "PERSON"){
			if (node.connected){
				image = imageUser_connected;
			}
			else{
				image = imageUser;
			}
		} else if (node.type == "ROUTER"){
			image = imageRouter;
		}
		var h_factor = image.height * SIZE / image.width;
		//context.drawImage(image, delta*(node.x-SIZE/2),delta*(node.y-h_factor/2), SIZE, h_factor);
		context.drawImage(image, node.x-SIZE/2,node.y-h_factor/2, SIZE, h_factor);
	}
}

function  getMousePos(canvas, evt) {
  var rect = canvas.getBoundingClientRect(), // abs. size of element
      scaleX = canvas.width / rect.width,    // relationship bitmap vs. element for X
      scaleY = canvas.height / rect.height;  // relationship bitmap vs. element for Y

  return {
    x: (evt.clientX - rect.left) * scaleX,   // scale mouse coordinates after they have
    y: (evt.clientY - rect.top) * scaleY     // been adjusted to be relative to element
  }
}
function getMousePosCanvas(canvas, evt){
	var imatrix = context.getTransform().inverse();
	var pos = getMousePos(canvas, evt);
	pos.x = pos.x * imatrix.a + pos.y * imatrix.c + imatrix.e;
	pos.y = pos.x * imatrix.b + pos.y * imatrix.d + imatrix.f;
	return pos;
}

function resizeCanvas() {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight - 60;
	setDelta();
	redraw(); 
}

function setDelta(){
	delta = 0.32; //TODO
	//delta = Math.min(1, canvas.width / config.map.image.width, canvas.height / config.map.image.height)
}
