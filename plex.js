//universal plexer: plex callbacks, promise returns
// plex events by config (membername + eventnames)

var hash = require('object-hash');
var asynk = require('async');

var arrayRotate = function(arr){ //2D flip
    return arr[0].map((_, colIndex) => arr.map(row => row[colIndex]));
}
var arrLikeToArr = function(a){ return Array.prototype.slice.call(a) };

var GroupResponder = function(setSize){
    this.responses = [];
    this.isDone = function(){
        return this.responses.filter(function(a){return a}).length === setSize;
    }
}
GroupResponder.prototype.addResponse = function(res, index){
    if(index) this.responses[index] = res;
    if(this.isDone()){
        if(this.callback) return callback(this.responses);
    }
}

var Plex = function(opts){
    this.options = opts || {};
    this.plexed = [];
    this.index = {};
    this.emitter = this.options.emitter;
    //this.highwater = 0; //only needed going bottom up... memory risk for index
    return this;
}

Plex.prototype.plex = function(obj){
    var emitter
    var ob = this;
    //process.exit();
    this.plexed.push(obj);
    if(this.options.bubbleup){
        this.options.bubbleup.forEach(function(arr, i){
            var member = arr[0];
            var events = arr[1];
            if(!obj[member]) throw new Error(
                'could not find emitter:'+member
            );
            events.forEach(function(eventName){
                if(!ob.index[eventName]) ob.index[eventName] = {};
                obj[member].on(eventName, function(){
                    var args = Array.prototype.slice.call(arguments);
                    var argHash = hash(args);
                    if(!ob.index[eventName][argHash]){
                        args.occuranceCount = 1;
                        ob.index[eventName][argHash] = args;
                    }else{
                        ob.index[eventName][argHash].occuranceCount++;
                    }
                    if(ob.index[eventName][argHash].occuranceCount === ob.plexed.length){
                        delete ob.index[eventName][argHash];
                        try{
                            if(ob.emitter){
                                ob.emitter.emit.apply(
                                    ob.emitter,
                                    [eventName].concat(args)
                                );
                            }
                        }catch(ex){ console.log('ERROR', ex) }
                    }
                });
            });
        });
    }
}

PlexProxyWrapper = function(obj){
    this.plexer = obj;
}

PlexProxyWrapper.wrap = function(obj) {
    return new Proxy(
        Object.getPrototypeOf(obj),
        new PlexProxyWrapper(obj)
    );
};

var reserved = ['plex', 'plexed', 'options', 'emitter', 'index'];
var isReserved = function(s){ return reserved.indexOf(s) !== -1 };

PlexProxyWrapper.prototype = {
    get: function(rcvr, n){
        var name = n;

        if(name==='plex'){
            var plexer = this.plexer;
            return function(obj){
                return plexer.plex(obj);
            };
        }
        //if all submembers are fns, go to fn mode
        var isFunctionReturn = this.plexer.plexed.filter(function(obj){
            return typeof obj[name] === 'function';
        }).length === this.plexer.plexed.length;
        if(isReserved(name)) return this.plexer[name];
        var returns = [];
        var plexed = this.plexer.plexed;
        var fnReturn;
        if(isFunctionReturn){
            fnReturn = function(){
                var calledargs = arrLikeToArr(arguments);
                var lastArgisFn = typeof calledargs[calledargs.length-1] === 'function';
                var callback;
                var callbackReturns = [];
                if(lastArgisFn) callback = calledargs.pop();
                var promisesFound = 0;
                plexed.forEach(function(ob, index){
                    returns[index] = ob[name].apply(
                        ob,
                        (callback?calledargs.concat([function(){
                            callbackReturns[index] = arrLikeToArr(arguments);
                            if(
                                callbackReturns.filter(function(a){return a}).length ===
                                plexed.length
                            ){
                                callback(null, callbackReturns);
                            }
                        }]):calledargs)
                    );
                    if(returns[index] && returns[index].then && returns[index].catch){
                        promisesFound++;
                    }
                });
                if(promisesFound === plexed.length){
                    return Promise.all(returns);
                }else{
                    return returns;
                }
            }
        }else{
            plexed.forEach(function(ob, index){
                returns[index] = ob[name];
            });
        }
        return fnReturn || returns;
    },
    set: function(rcvr, name, val){
        if(isReserved(name)) throw new Error("Can't set reserved field: "+name);
        //todo: iterate
        return this.plexer.plexed[0][name] = val;
        /*var ob = this;
        var errors = [];
        this.plexer.plexed.forEach(function(obj){
            if(typeof obj[name] === 'function'){
                //todo: dynamic function set handler
                errors.push(new Error(name+ 'is a function, cannot be set'));
            }else{
                obj[name] = value;
            }
        });
        return errors.length?false:true;
        */
    }
};

module.exports = function(opts){
    var ob = new Plex(opts);
    return PlexProxyWrapper.wrap(ob);
};
