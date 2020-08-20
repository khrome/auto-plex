auto-plex
=========
Generic Multiplexing for Objects in JS
( with some expected indirection inefficiencies )

Installation
------------

    npm install auto-plex


Usage
-----
An Explicit Events Example:

```js
    // given:
    // myEmitter (an instance of the Emitter interface)
    // an object anObject, which has an Emitter at .someEmitter
    // an object anotherObject, which has an Emitter at .someEmitter
    // an object aThirdObject, which has an Emitter at .someEmitter
    var multi = new Plex({
        bubbleup : [
            ['someEmitter', [ //the member name
                'my-event', //the event name
            ]]
        ],
        emitter : myEmitter
    });
    multi.plex(anObject);
    multi.plex(anotherObject);
    multi.plex(aThirdObject);
    myEmitter.on('my-event', function(event){

    });
    anObject.someEmitter.emit('my-event', {something:'consistent'});
    anotherObject.someEmitter.emit('my-event', {something:'consistent'});
    aThirdObject.someEmitter.emit('my-event', {something:'consistent'});
    //'my-event' is now triggered on myEmitter
```

An Asynchronous Callback Functions Example:

```js
    // given:
    // a Function .someMember which takes some args and a callback function
    // an object anObject, which has a Function .someMember
    // an object anotherObject, which has a Function .someMember
    // an object aThirdObject, which has a Function .someMember
    var multi = new Plex();
    multi.plex(anObject);
    multi.plex(anotherObject);
    multi.plex(aThirdObject);
    multi.someMember(arg1, ... argN, function([anReturn, anotherReturn, aThirdReturn]){

    });
```

Legacy Support
--------------
If you're working with an older version of Node that doesn't include proxies, you need to recite the ancient words:

```js
    if(!global.Proxy) global.Proxy = require('node-proxy');
```

Testing
-------
Just run:

```bash
    npm run test
```


Roadmap
-------

- [x] Explicit Events
- [x] Asynchronous Callback Functions
- [ ] Asynchronous Promise Functions
- [x] Synchronous Functions (Untested)
- [ ] Generic Events (danger!)
