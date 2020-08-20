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
    get: function(rcvr, name){

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
        if(isFunctionReturn){
            returns = function(){
                var calledargs = arrLikeToArr(arguments);
                var lastArgisFn = typeof calledargs[calledargs.length-1] === 'function';
                var callback;
                var callbackReturns = [];
                if(lastArgisFn) callback = calledargs.pop();
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
                    )
                });
            }
        }else{
            plexed.forEach(function(ob, index){
                returns[index] = ob[name];
            });
        }
        return returns;
    },
    set: function(rcvr, name, val){
        if(isReserved(name)) throw new Error("Can't set reserved field: "+name);
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

/*var index = {};

var arrLikeToArr = function(arrLike){ return Array.prototype.slice.call(arrLike) };

var arrayRotate = function(arr){ //2D flip
    return arr[0].map((_, colIndex) => arr.map(row => row[colIndex]));
}

SetForwardingHandler = function(obj){
    this.plexer = obj;
}
var reserved = ['plex', 'plexed', 'options', 'emitter'];
SetForwardingHandler.prototype = {
    get: function(rcvr, name){
        //todo: detect simple
        var actions = this.plexer.plexed.filter(function(obj){
            return typeof obj[name] === 'function';
        });
        if(reserved.indexOf(name) !== -1) return function(){
            console.log('$$$', rcvr, name, this);
            return rcvr.plex.apply(rcvr, arguments);
        };
        var plexer = this.plexer;
        var count = function(a){
            return a.filter(function(a){ return !!a }).length;
        }
        if(actions.length === plexer.plexed.length){
            var calledargs = Array.prototype.slice.call(arguments);
            var returnArgs = [];
            var returned = [];
            var allReturned = function(){
                returned.filter(function(o){ return o }).length === plexer.plexed.length;
            }
            var err;
            var callback  = function(){ }
            if(typeof calledargs[calledargs.length-1] === 'function'){
                callback = calledargs.pop();
            }
            return function(){
                var args = Array.prototype.slice.call(arguments);
                if(typeof args[args.length-1] === 'function'){
                    plexer.plexed.forEach(function(obj, index){
                        var cb = function(){
                            var theseRtnArgs = Array.prototype.slice.call(arguments);
                            returnArgs[index] = theseRtnArgs;
                            returned[index] = true;
                            if(allReturned()){
                                callback.apply(callback, arrayRotate(returnArgs));
                            }
                        };
                        obj[name].apply(obj, args.concat([cb]));
                    })
                }
            }
        }else throw new Error('inexplicable!');
    },
    set: function(rcvr, name, val){
        var ob = this;
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
    }
};

SetForwardingHandler.wrap = function(obj) {
    return new Proxy(
        Object.getPrototypeOf(obj),
        new SetForwardingHandler(obj)
    );
};*/
/*
var doPlex = function(list, opts){
    var plexer = new (function(){
        this.options = opts || {};
        this.plexed = [];
        this.emitter = this.options.emitter;
        this.plex = function(){
            console.log('was plexed');
        }
    })();
    console.log('PLEXER', plexer);
    return SetForwardingHandler.wrap(plexer);
    return plexer;
}

module.exports = doPlex;
*/

/* var Plex = function(opts){
    this.options = opts || {};
    this.plexed = [];
    this.emitter = opts.emitter;
    //var result = SetForwardingHandler.wrap(this); //substitute the proxy for the obj
    //return result;
    return this;
}

Plex.prototype.conduit = function(){
    return SetForwardingHandler.wrap(this);
}

Plex.prototype.plex = function(obj, ctx){
    var plexOptions = ctx || {};
    var emitter
    var ob = this;
    //process.exit();
    this.plexed.push(obj);
    this.options.bubbleup.forEach(function(arr, i){
        var member = arr[0];
        var events = arr[1];
        if(!obj[member]) throw new Error(
            'could not find emitter:'+member
        );
        events.forEach(function(eventName){
            if(!index[eventName]) index[eventName] = {};
            obj[member].on(eventName, function(){
                var args = Array.prototype.slice.call(arguments);
                var argHash = hash(args);
                if(!index[eventName][argHash]){
                    args.occuranceCount = 1;
                    index[eventName][argHash] = args;
                }else{
                    index[eventName][argHash].occuranceCount++;
                }
                if(index[eventName][argHash].occuranceCount === ob.plexed.length){
                    delete index[eventName][argHash];
                    try{
                        ob.emitter.emit.apply(
                            ob.emitter,
                            [eventName].concat(args)
                        );
                    }catch(ex){ }
                }
            });
        });
    });

}


//if(!global.Proxy) global.Proxy = require('node-proxy');
SetForwardingHandler = function(obj) {
    this.plexer = obj;
}
var reserved = ['plex', 'plexed', 'options', 'emitter'];
SetForwardingHandler.prototype = {
    get: function(rcvr, name){
        //todo: detect simple
        var actions = this.plexer.plexed.filter(function(obj){
            return typeof obj[name] === 'function';
        });
        if(reserved.indexOf(name) !== -1) return function(ob){
            return rcvr.plex(ob);
        };
        var plexer = this.plexer;
        var count = function(a){
            return a.filter(function(a){ return !!a }).length;
        }
        if(actions.length === plexer.plexed.length){
            var calledargs = Array.prototype.slice.call(arguments);
            var returnArgs = [];
            var returned = [];
            var allReturned = function(){
                returned.filter(function(o){ return o }).length === plexer.plexed.length;
            }
            var err;
            var fix = function(arr){ //2D flip
                return arr[0].map((_, colIndex) => arr.map(row => row[colIndex]));
            }
            var callback  = function(){ }
            if(typeof calledargs[calledargs.length-1] === 'function'){
                callback = calledargs.pop();
            }
            return function(){
                var args = Array.prototype.slice.call(arguments);
                if(typeof args[args.length-1] === 'function'){
                    plexer.plexed.forEach(function(obj, index){
                        var cb = function(){
                            var theseRtnArgs = Array.prototype.slice.call(arguments);
                            returnArgs[index] = theseRtnArgs;
                            returned[index] = true;
                            if(allReturned()){
                                callback.apply(callback, fix(returnArgs));
                            }
                        };
                        obj[name].apply(obj, args.concat([cb]));
                    })
                }
            }
        }else throw new Error('inexplicable!');
    },
    set: function(rcvr, name, val){
        var ob = this;
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
    }
};
SetForwardingHandler.wrap = function(obj) {
    return new Proxy(Object.getPrototypeOf(obj), new SetForwardingHandler(obj));
};

module.exports = Plex;*/
