var socket = io.connect(window.location.host);
var canvas, context;
var positions = new Array();
var imageUser = new Image();
imageUser.src = "images/man.png";
var imageRouter = new Image();
imageRouter.src = "images/router.png";

socket.on('connect', function () {
	socket.emit('hi!');
	socket.on('info', function(msg) {
		info(JSON.parse(msg));
	});
});

$('#scenes').on('click', '.edit_scene', function(event) {

});

$('#scenes').on('click', '.clickable_row', function(event) {
	if($(this).hasClass('active')){
		$(this).removeClass('active'); 
	} else {
		$(this).addClass('active').siblings().removeClass('active');
		selectScene(1);
	}
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
		    socket.emit('config', params);
		    runVisual();
		});
	});
}

function runVisual(){
	$.get('/visualSim', function (data) {
		$('#container').remove();
		$('body').append(data);
		$('#start').on('click', function(e){
			startSimulation();
			e.preventDefault();
		});
		$('#next').on('click', function(e){
			nextStep();
			e.preventDefault();
		});
		$('#stop').on('click', function(e){
			endSimulation();
			e.preventDefault();
		});
		canvas = document.getElementById('canvas'),
	    context = canvas.getContext('2d');
		window.addEventListener('resize', resizeCanvas, false);
		window.addEventListener('keypress', nextStep, false);
		resizeCanvas();
	});
}

function startSimulation(){
	socket.emit('sim', "START");
}

function nextStep(){
	socket.emit('sim', "NEXT");
}

function endSimulation(){
	socket.emit('sim', "END");
	context.clearRect(0,0,canvas.width, canvas.height);
}

function info(msg){//Message INFO from engine
	positions = msg.data;
	redraw();
}

/*
	----VISUAL----
*/
const delta = 5;
function redraw() {
	context.clearRect(0,0,canvas.width, canvas.height);
	for (var i = positions.length - 1; i >= 0; i--) {
		image;
		if(positions[i].type == "PERSON")
			image=imageUser
		else if(positions[i].type == "ROUTER")
			image=imageRouter
		context.drawImage(image,delta*positions[i].x,delta*positions[i].y,20,20);
	}
}

function resizeCanvas() {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	redraw(); 
}
