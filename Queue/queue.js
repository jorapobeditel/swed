var WebSocketServer = require('ws').Server,
    ws = new WebSocketServer({ port: 8001 });
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
var baseUrl = 'http://site/';
var queue = [[],[],[],[]];
var token = 'sometoken';
var expCounter = [0,0,0,0];
var expTime = 300;
var wsClients = {};

function sendDataWsUser(user, data){
    try{
        wsClients[user].send(JSON.stringify(data));
    }
    catch(e){
        console.log(e);
    }
}
function occupy(expId, username){
        GetRequest(baseUrl, 'experiment/occupy/'+ expId + '/' +username+ '/'+token);
        queue[expId-1][0].status = 1;
        queueListNotify();
        sendDataWsUser(username,{method: 'alert', expStatus: 1, time: expTime});
        setTimeout(function(){
            GetRequest(baseUrl, 'experiment/free/' + expId + '/' + token);
            console.log('Experiment '+ expId + 'was released' );
            popQueue(expId);
            queueListNotify();
            sendDataWsUser(username,{method: 'alert', expStatus: 0, time: 0});
        }, (expTime -2 ) * 1000);
}

function translateExpId(expId){
    var expIndex = 0;
    switch (expId){
        case 1:
            expIndex = 0;
            break;
        case 2:
            expIndex = 1;
            break;
        case 3:
            expIndex = 2;
            break;
        case 4:
            expIndex = 3;
            break;
    }
    return expIndex;
}

function calculateTime(expId, username){
    var index = -1;
    var time = 0;
    var expIndex = translateExpId(expId);

    for(var i in queue[expIndex]){
        if(queue[expIndex][i].name == username){
            index = i;
        }
    }
    if(index != -1){
        time = expCounter[expIndex];
        time+= (parseInt(index)) * expTime;
    }
    return time;
}
function timeToEnd(expId, username){
  //  wsClients[username]
    var id = expId -1;
    var endDate = 0;
    for(var item in queue[id])
        if(queue[id][item].name == username)
        endDate = queue[id][item].endDate;
    if(endDate != 0)
    {
        var differece = endDate - (new Date());
        return differece;
    }
    return endDate;
}

function queueListNotify(){
    ws.broadcast(JSON.stringify({method: 'getQueue', queue: queue}));
}
function pushQueue(expId,user) {
    var date = new Date();
    var endDate = new Date(date);
    endDate.setMinutes(date.getMinutes()+expTime/60);
    var obj = {name: user, startDate: date, endDate: endDate, status: 0};
    var exId = translateExpId(expId);
    if(!findEntry(exId,obj)){
        queue[exId].push(obj);
        var time = calculateTime(expId, user);
        setTimeout(function(){
            occupy(expId, user);
            console.log('Experiment '+ expId + 'was occupy by ' + user );
        }, time*1000);
        queueListNotify();
    }

}
function findEntry(expId,object){
    for(var i in queue[expId]){
        if(queue[expId][i].name == object.name){
            return true;
        }
    }
    return false;
}
function popQueue(expId){
    if(queue[expId-1].length>0){
        queue[expId-1].shift();
    }
}

ws.broadcast = function broadcast(data) {
    ws.clients.forEach(function each(client) {
        client.send(data);
    });
}


function getUserName(connect){

    for(var item in wsClients)
        if(wsClients[item] == connect)
            return item;
    return undefined;
}

ws.on('connection', function connection(connection) {

    connection.on("message", function (request) {

        try{
            var data = JSON.parse(request);
            switch(data.method){
                case 'initConnection':
                    //wsClients.push({ws: connection, user: data.user});
                   wsClients[data.user] = connection;
                    break;
                case 'push':
                    pushQueue(data.expId, getUserName(connection));
                    break;
                case 'pop':
                  //  popQueue();
                    break;
                case 'getQueue':
                    sendJson({method: 'getQueue', queue: queue});
                    break;
                case 'getTime':
                   var time = calculateTime(data.expId, getUserName(connection));
                    sendJson({method: 'getTime', time: time});
                    break;
                case 'time2end':
                    var time = timeToEnd(data.expId, getUserName(connection));
                    sendJson({method: 'time2end', time: time});
                    break;
            }
        }
        catch(e){
            connection.send('bad request');
            console.log(e);
        }
        function sendJson(string){
            connection.send(JSON.stringify(string));
        }
    })
});
function GetRequest(url, params){

    var xhr = new XMLHttpRequest();

    xhr.open('GET', url + params, true);

    xhr.send();

    if (xhr.status != 200) {
      //  console.log( xhr.status + ': ' + xhr.statusText );
    } else {
        if(xhr.responseText!=""){
            var json = "";
            try{
                json = JSON.parse(xhr.responseText);
            }
            catch(e){
            }
            return json;
        }

    }
}
/*
function checkExStatus(expId){
    var info = GetRequest(baseUrl, 'experiment/getExInfo/'+ expId);
    var status = info[0].status == '1'?true:false;
    return status;
}*/