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


var express = require( 'express' );
var	app = module.exports = express();
var	http = require( 'http' );
var	server = http.Server( app );

var	io = require( 'socket.io' )( server );

//var	fs = require( 'fs' );
var session = require('express-session');
var uuid = require('node-uuid');

var MongoStore = require('connect-mongo')(session);
var sessionMiddleware = session({
    secret: 'ch0c0latef0ndu',
    genid: function(req) {
      return uuid.v4();//// Generate a v4 (random) id ... something like -> '110ec58a-a0f2-4ac4-8393-c866d813b8d1'
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



var	request = require( 'request' );
var	xmlFile = '/home/zwebnode/nodejs/radio-server/cfmzmsg.xml';
var	port = server_port;
var	os = require("os");


var stations = [];
stations['www.classical963fm.com'] = {
										'nowplayingfile':'/home/zwebnode/nodejs/radio-server/cfmzmsg.xml', 
										'serviceURL': 'http://www.classical963fm.com/wp-content/plugins/zm_radio/radioService.php'
									};
stations['www.zoomerradio.ca'] = {
											'nowplayingfile':'/home/zwebnode/nodejs/radio-server/cfzmmsg.xml',
											'serviceURL': 'http://www.zoomerradio.ca/wp-content/plugins/zm_radio/radioService.php'
									};									
stations['www.classical1029fm.com'] = {
										'nowplayingfile':'/home/zwebnode/nodejs/radio-server/cfmzmsg.xml', 
										'serviceURL': 'http://www.classical1029fm.com/wp-content/plugins/zm_radio/radioService.php'
									};
stations['www.classical1031fm.com'] = {
										'nowplayingfile':'/home/zwebnode/nodejs/radio-server/cfmzmsg.xml', 
										'serviceURL': 'http://www.classical1031fm.com/wp-content/plugins/zm_radio/radioService.php'
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


server.listen( port, function () {
	console.log( 'Server is running on port '+port+', watching ... some files' );
});

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
}
for (var j in filesToBeWatched) {
	someNowplayingXMLFile = j;
	fs.watchFile( someNowplayingXMLFile, function ( event, filename ) {
		//now emit to all the things at j
		//console.log( filename + ' Changed' );
		//var xmlString = acquireXMLForChannel(someStationKey);
		//var someStationKey = filesToBeWatched[i];
		//var xmlString = acquireXMLForChannel(filesToBeWatched[i]);
		//stationXMLs[filesToBeWatched[j]] = xmlString;
		var someStations = filesToBeWatched[filename];
		for (var k in someStations) {
			var someStationID = someStations[k];//is the key, and also the channel name
			
			/*
			var xmlString = acquireXMLForChannel(someStationID);//this doesn't work because it doesn't return the result we need because its asynchronous
			stationXMLs[someStationID] = xmlString;//so this doesn't work either
			//and it only make sense to emit, once we have finished reading in the files that we need to read in
			io.to(someStationID).emit( 'change' , xmlString );	//If file is changed, emit it to all
			*/
			acquireXMLForChannel(someStationID);
			//
		}
		//
	});
}

function acquireXMLForChannel(whichChannel) {
	console.log("begin acquireXMLForChannel("+whichChannel+")");
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

function saveSession(whichSession) {
  
 whichSession.save(function(err){
    if (err) { throw err;}
  });
}


//var radioSessions = {};
/*On Socket Connection*/

//can we get and set stuff in the store?
//sessionMiddleware.store?

io.on( 'connection', function ( socket ) {
	console.log( "connection" );
	var someSession = socket.request.session;
	console.log("someSession.id=="+someSession.id);
	//so how do we get and set session data?
	//typeof obj.foo != 'undefined'
	//NOT every socket is a radio socket ... we know its a radio socket when registerChannel is called.
	
	/*if (typeof(someSession.radioSockets) == 'undefined' ) {
	  console.log("someSession.radioSockets = []");
		someSession.radioSockets = [];
	}
	//someSession.radioSockets.push( socket.id );//don't just push it! ... only push it if it's not already in there
	if (someSession.radioSockets.indexOf(socket.id) > -1 ) {//check to see if the socket is already stored, if not, don't push it.
	  //then don't bother adding it! ... consider storing an object, that would knwo what time it was set at though.
	} else {
	  someSession.radioSockets.push( socket.id );
	}*/
	
	/*someSession.save(function(err){
    if (err) { throw err;}
  });*/
  saveSession(someSession);
  
	/*var someSocketIDs = "";
  for (var i=0; i<someSession.radioSockets.length; i++) {
    someSocketIDs += someSession.radioSockets[i];
    if (i+1 < someSession.radioSockets.length)  someSocketIDs += ',';
  }
  console.log("someSocketIDs=="+someSocketIDs);*/
  
  socket.emit( 'start', {test:'hello'} );
	socket.on('registerChannel', function (dataObj) {
	  var someChannel = dataObj.channel;
	  var displayOnly =  dataObj.displayOnly;
	  var someChannelType = '';
	  
	  if (typeof(dataObj.channelType) == 'undefined' ) {
	    someChannelType = 'radio';
	  } else {
	    someChannelType = dataObj.channelType;
	  }
		console.log('registerChannel('+someChannel+')');
		if (typeof(someSession.sockets) == 'undefined' ) {
      someSession.sockets = {};
    }
    //var timeRightNow = new Date().toISOString();
    var d = new Date();
    var timeRightNow = d.getTime();//unix epoch time == easy 
    if (typeof(someSession.sockets[socket.id]) == 'undefined' ) {
      someSession.sockets[socket.id] = {created:timeRightNow, channelType:someChannelType};
    }
    someSession.sockets[socket.id]['modified'] = timeRightNow;//already exists, so just add the new modified, even if it was just freshly instantiated
    /*someSession.save(function(err){
      if (err) { throw err;}
    });*/
    saveSession(someSession);
    //console.log("someChannel=="+someChannel);
		//this is radio-Specific ... 
	
		socket.join(someChannel);//this will be one of the radio station domains.
		
		if ( someChannelType == 'radio') {
		  var xmlString = '';//is it being retreived from the cache? we need to use that cache ... we can't be pulling it up everytimd
      var xmlString = stationXMLs[someChannel];
      //console.log("emitting change ... xmlString=="+xmlString);
      socket.emit('change', xmlString);//now send the new socket, the specific thing for that channel
      //but seriously ... why are we sending xml inside of json for, instead of just json?! its silly stupid
		}
		socket.emit('focusCheck', {});//
		
	});
	
	
	//design decision ... we are not worrying about multiple channels here ... all radio players, on all channels will pause ... no distinction by channel
	/*
	socket.on('registerVideoPlayer', function(dataObj){
	  console.log("registerVideoPlayer()");
	  if (typeof(someSession.sockets) == 'undefined' ) {
      someSession.sockets = {};
    }
    var timeRightNow = d.getTime();//unix epoch time == easy 
    if (typeof(someSession.sockets[socket.id]) == 'undefined' ) {
      someSession.sockets[socket.id] = {created:timeRightNow};
    }
    someSession.sockets[socket.id]['modified'] = timeRightNow;//already exists, so just add the new modified, even if it was just freshly instantiated
    saveSession(someSession);
	  //now, lets add the video player to the session as well
	});
	*/
	/*
	socket.on('startPlayingLiveVideoStream', function(dataObj){
	  console.log('startPlayingLiveVideoStream('+JSON.stringify(dataObj) + ')');
	  //find the socket's session, and then broadcast to all of its radioSockets a message, telling them to pause their video players
	  someSession.videoSockets[socket.id]['status'] = 'playing';
	  //should we tell all other video players that aren't this one,
	  saveSession(someSession);
	  tellAllOfAClientsRadioPlayersToPause(someSession);
	  
	  //maybe instead of radioSockets nad videoSockets, we should just have sockets, and then the object could have clientTyle: radio or video
	  //take the lead ... so ... go through all of the 
	  //which ever one is focused, is the one that is active ... and all others must pause
	  //use controls this by focusing windows
	});
	*/
	socket.on('focusCheckClientResponse', function(dataObj) {
	  //this gets 
	  console.log('focusCheckClientResponse('+JSON.stringify(dataObj) + ')');
	  //tellAllOfAClientsNonLeadsToDeactivate(someSession);
	  if (dataObj.hasFocus) {
	    //tell all of hte other sockets to
	    //set all other sockets focused value to false, and set this one to true
	    for (var i in someSession.sockets) {
	      var someSocketID = i;
	      if (someSocketID == socket.id) {
	        someSession.sockets[socket.id]['hasFocus'] == true;
	      } else {
	         someSession.sockets[socket.id]['hasFocus'] == false;
	      } 
	      
	    }
	    saveSession(someSession);
	    tellAllOfAClientsNonFocusedWindowsToDeactivate(someSession, socket.id);
	    //maybe the problem is that the session hasn't finished updating by the time we call this function? odd.
	  }
	  
	});
	
});

function tellAllOfAClientsNonFocusedWindowsToDeactivate(whichSession, whichSocketIdIsFocused) {
  console.log("tellAllOfAClientsNonFocusedWindowsToDeactivate("+whichSession.id+", "+whichSocketIdIsFocused+")");
  for (var i in whichSession.sockets) {
    
    var someSocket = io.sockets.connected[i];
    //someSocket might no longer exist!
    if (someSocket != undefined) {
      //console.log("io.sockets.connected["+i+"]=="+io.sockets.connected[i]);
      if (i != whichSocketIdIsFocused) {
        someSocket.emit('deactivate', {});
      } else if (whichSession.sockets[i]['hasFocus']) {
        someSocket.emit('itIsOKToReactivate', {});
      }
    } else {
      console.log("that socket: "+i+" appears to have disappeared ... now removing it from session.sockets");
      delete whichSession.sockets[i];
    }
   
  }
}


/*

*/

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
