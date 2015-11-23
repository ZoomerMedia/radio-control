/*

2015-11-17
RV stands for RadioVideo
... I am attempting to modify this script, to create an additional socket endpoint, or possibly a different channel ...
... we need to, for each user(session), keep a list of all their clients (windows, tabs) and designate whichever client is focused, to be the master
and emit a message to all clients of that user, that a new master is present, whenever focus changes, which will result, in audio / video, being paused.
... what are the rules? video pauses audio. Can audio pause video?
... let's say for now, that it is a one way thing ... video can pause radio. And thats it for now.

are we even using express here?
it sort of appears as though the answer is no ... o wait ... there it is ... doh ...
... wait server is straight up http, and no express, by the looks of it.

... so ... we will want to use express here ... so bone up a bit on express, and how it works, with socket.io


*/
var	fs = require( 'fs' );
var data = fs.readFileSync('./config.json');
var configObj;
try {
  configObj = JSON.parse(data);
  console.dir(configObj);
}
catch (err) {
  console.log('There has been an error parsing your JSON.')
  console.log(err);
  //exit
  process.exit();
}
//
var db_host = configObj.db_host;
var db_user = configObj.db_user;
var db_password = configObj.db_password;
var db_port = configObj.db_port;
var db_database = configObj.db_database;
var server_port = configObj.server_port;//
var session_secret = configObj.session_secret;

console.log('aloha');

var express = require('express');
var app = express();
var server = require('http').Server(app);

var io = require('socket.io')(server);


var	request = require( 'request' );
var	xmlFile = '/home/zwebnode/nodejs/radio-server/cfmzmsg.xml';

var	os = require("os");

var session = require('express-session');
//socket.io-express-session ?? https://github.com/xpepermint/socket.io-express-session

var MongoStore = require('connect-mongo')(session);
var sessionMiddleware = session({
    secret: 'ch0c0latef0ndu',
    genid: function(req) {
      return genuuid() // use UUIDs for session IDs 
    },
    store: new MongoStore(
      { url: 'mongodb://sessionmanager:f0ndub3lly@localhost:27017/nodesessions',
        ttl: 1 * 24 * 60 * 60,
        autoRemove: 'native',
      }),
    saveUninitialized: true,
    resave: true
});	
	
console.log('sessionMiddleware declared');
io.use(function(socket, next) {
    sessionMiddleware(socket.request, socket.request.res, next);
});

app.use(sessionMiddleware);

app.set('trust proxy', 1) // trust first proxy 

app.all( '*', function( req, res, next ){
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "X-Requested-With"); 
	res.header("Content-Type", "text/html,application/xhtml+xml,application/xml;q=0.9");
	next();
});
console.log('permissive CORS declared');

app.listen( port );
console.log('listening on port:' + server_port);
var homeDir = '/home/zwebnode/nodejs/radio-server/';

var stations = [];
stations['www.classical963fm.com'] = {
										'nowplayingfile':'/home/zwebnode/nodejs/radio-server/cfmzmsg.xml', 
										'serviceURL': 'http://www.classical963fm.com/wp-content/plugins/zm_radio/radioService.php',
										'fileName': 'cfmzmsg.xml'
									};
stations['www.zoomerradio.ca'] = {
											'nowplayingfile':'/home/zwebnode/nodejs/radio-server/cfzmmsg.xml',
											'serviceURL': 'http://www.zoomerradio.ca/wp-content/plugins/zm_radio/radioService.php',
											'fileName': 'cfzmmsg.xml'
									};									
stations['www.classical1029fm.com'] = {
										'nowplayingfile':'/home/zwebnode/nodejs/radio-server/cfmzmsg.xml', 
										'serviceURL': 'http://www.classical1029fm.com/wp-content/plugins/zm_radio/radioService.php',
										'fileName': 'cfmzmsg.xml'
									};
stations['www.classical1031fm.com'] = {
										'nowplayingfile':'/home/zwebnode/nodejs/radio-server/cfmzmsg.xml', 
										'serviceURL': 'http://www.classical1031fm.com/wp-content/plugins/zm_radio/radioService.php',
										'fileName': 'cfmzmsg.xml'
									};




function getServiceURL(whichStationIdentifier) {
	if (undefined != stations[whichStationIdentifier]) {
		return stations[whichStationIdentifier].serviceURL;
	} else {
		return false;
	}
}
function getNowPlayingFile (whichStationIdentifier) {
	if (undefined != stations[whichStationIdentifier]) {
		return stations[whichStationIdentifier].nowplayingfile;
	} else {
		return false;
	}
}

// http://zweb-nodejs-dev1.dc.zml.ca:3000
/*server.listen( port, function () {
	console.log( 'Server is running on port '+port+', watching ... some files' );
});*/

app.all( '*', function( req, res, next ){
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "X-Requested-With"); 
	res.header("Content-Type", "text/html,application/xhtml+xml,application/xml;q=0.9");
	next();
});

//Watch xmlFile for updates
//watch every xml file, not just the
var stationXMLs = [];
var filesToBeWatched = [];
//make a keyed array, of filespaths, and the stations keys as values
//so that a single listener, can be used to emit to multiple channels

/*for (var i in stations) {
	if (undefined == filesToBeWatched[ stations[i].nowplayingfile] ) {
		filesToBeWatched[stations[i].nowplayingfile] = [];//a new empty array
	}
	filesToBeWatched[stations[i].nowplayingfile]].push(i);//add the station identifier to the key for the file
}*/


for (var i in stations) {
	var someStationKey = i;
	var someServiceURL = stations[i].serviceURL;
	var someNowplayingXMLFile = stations[i].nowplayingfile;
	stationXMLs[someStationKey] = acquireXMLForChannel(someStationKey);
	//console.log("setting up watchFiler for:"+someStationKey+", someServiceURL=="+someServiceURL+", someNowplayingXMLFile=="+someNowplayingXMLFile);
	//ok ... so ... there is a problem here that neccesitates some refactoring ... it appears that the last watchFile for a particlar file, replaces all previous
	if (undefined == filesToBeWatched[ stations[i].nowplayingfile] ) {
		filesToBeWatched[stations[i].nowplayingfile] = [];//a new empty array
	}
	filesToBeWatched[stations[i].nowplayingfile].push(i);//add the station identifier to the key for the file
	/*fs.watchFile( someNowplayingXMLFile, function ( event, filename ) {
		console.log( someNowplayingXMLFile + ' Changed' );	
		
		var xmlString = acquireXMLForChannel(someStationKey);	
		console.log("wtf?!");
		stationXMLs[someStationKey] = acquireXMLForChannel(someStationKey);
		console.log( "Emitting initial change for: " + someStationKey );
		io.to(someStationKey).emit( 'change' , xmlString );	//If file is changed, emit it to all
	});*/
}
//console.log("filesToBeWatched=="+filesToBeWatched.toString());
/*for (var j in filesToBeWatched) {
	someNowplayingXMLFile = j;
	fs.watchFile( someNowplayingXMLFile, function ( event, filename ) {
		//now emit to all the things at j
		console.log( filename + ' Changed' );
		var someStations = filesToBeWatched[filename];
		for (var k in someStations) {
			var someStationID = someStations[k];//is the key, and also the channel name
			
			acquireXMLForChannel(someStationID);
			//
		}
		//
	});
}*/

for (var j in filesToBeWatched) {
	someNowplayingXMLFile = j;
	fs.watch( someNowplayingXMLFile, function ( event, filename ) {
		//now emit to all the things at j
		/*
		console.log( filename + ' Changed' );
		fileKeysMSG = '';
		for (var l in filesToBeWatched) {
			fileKeysMSG += l + ", ";
		}
		console.log("fileKeysMSG=="+fileKeysMSG);
		*/
		var fullFileName = homeDir + filename;
		var someStations = filesToBeWatched[fullFileName];
		console.log("someStations=="+someStations);
		for (var k in someStations) {
			console.log("someStations["+k+"]=="+someStations[k]);
			var someStationID = someStations[k];//is the key, and also the channel name
			
			acquireXMLForChannel(someStationID);
			//
		}
		//
	});
}



/*
let's start pinging. every minute, a blip to every receiver
there are a few questions that we need answers to:
do socket messages even work - thats what the timer blips will determine
next, does the file watching even work?
is nginx somehow caching stuff?
we could try restarting nginx periodically to see if it is.
Determine the Area of Concern that the bug is happening in first.
This could be a nodejs or nginx.
restarting nginx produces no different results.
restarting nodejs, however does seem to trigger a refresh of up to date data.
... so either it is somehow caching stuff, never refreshing / invalidating the cached stuff, or it isn't reading the files properly
...

.. maybe part of the problem is that we are trying to watch the same file (mz) multiple times, and possibly trying to read it multiple times
... solution ... refactor ... read each file only once
... don't try to read it multiple times?

*/

function acquireXMLForChannel(whichChannel) {
	//console.log("begin acquireXMLForChannel("+whichChannel+")");
	//the reason why weget all of the acquire traces, before we get the response traces, is because it is an asynchronous, non blocking process ... 
	var xmlFile = getNowPlayingFile(whichChannel);
	var serviceURL = getServiceURL(whichChannel);
	try {
		fs.readFile( xmlFile, "utf-8", function( err, data ) {
			//throw err;
			request( serviceURL, function ( error, response, body ) {	
				//console.log("response from "+serviceURL+": "+body);
				if( error )	throw error;
				var xmlString = jsonToXML( body , data );
				//console.log("acquireXMLForChannel("+whichChannel+"):"+xmlString);
				//return xmlString;//this ends up sort of going nowhere
				//instead we need to chain to another function, which will stick something into our little cache.
				stationXMLs[whichChannel] = xmlString;//store in associative array / mini-cache
				io.to(whichChannel).emit( 'change' , xmlString );
				
				/*
				how can we send a message / know?
				*/
			});
		
		});					
	} catch (err) {
		if (err.code === 'ENOENT') {
			console.log('file: ' + xmlFile + ' not found!');
		} else {
			throw err;
		}
	}
}



/*On Socket Connection*/
io.on( 'connection', function ( socket ) {
	console.log( "connection" );
	//console.log( "Emitting start" );
	socket.emit( 'start', {test:'hello there'} );
	socket.on('registerChannel', function (dataObj) {
		
		//this is the channel registration, for a particular radio player ... we can use this call to also make note of the fact that this socket, is a radioPlayer ... and add it to the session data
		var mySocketID = this.id;//i think this works
	  
		
		
		console.log('registerChannel('+dataObj.channel+')');
		var someChannel = dataObj.channel;
		//console.log("someChannel=="+someChannel);
		var xmlString = '';//is it being retreived from the cache? we need to use that cache ... we can't be pulling it up everytimd
		socket.join(someChannel);//this will be one of the radio station domains.
		//var xmlString = cache.get(someChannel);
		var xmlString = stationXMLs[someChannel];
		//console.log("emitting change ... xmlString=="+xmlString);
		socket.emit('change', xmlString);
		//now send the new socket, the specific thing for that channel
	});
});
 

function jsonToXML( body , data ){	
	if (undefined == body || undefined == data) return false;
	var bodyParts = body.split( '$' );
	
	var hostLength = ( bodyParts.length - 2 ) / 2;
	
	var slugString = '<HostCount>'+hostLength+'</HostCount>',
		hostString = '';
	for( var i = 0; i < hostLength; i++){
		slugString += '<HostSlug'+( i + 1)+'>'+bodyParts[ ( i + 3 ) ]+'</HostSlug'+( i + 1)+'>';
		hostString += '<Host'+( i + 1)+'>'+bodyParts[ i ]+'</Host'+( i + 1)+'>'
	}
	var payload = data.replace( /<\/Media>/g , "</Media>\n<Program>"+bodyParts[ bodyParts.length - 2 ]+"</Program>\n<ShowSlug>"+bodyParts[ bodyParts.length - 1 ]+"</ShowSlug>"+hostString+slugString );
	return payload;
}

var heatbeatInterval = setInterval(function() {
  //console.log(str1 + " " + str2);
  //var currentTime = new Date();
  //io.to('www.classical963fm.com').emit( 'heartbeat' , {msg:"Hello there. How are you?"} );
  console.log("heatbeatInterval");
}, 30000);

io.on('registerRadioClient', function(socket) {
  console.log("registerRadioClient socket.id" + socket.id);
});
/* 
  client opens a live video player client, and starts playing it
  ... so ... we emit to all of its radio player clients, passing along the message that a live video stream has begun
*/
io.on('registerLiveVideoClient', function(socket){
  console.log("registerLiveVideoClient socket.id" + socket.id);
});
