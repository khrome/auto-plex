var chai = require('chai');
var should = chai.should();
var Emitter = require('extended-emitter');
var Plex = require('../plex');
var fs = require('fs');

var storyTellerPlexEvents = [
    'story-start',
    'story-stop',
    'chapter-start',
    'chapter-stop',
    'paragraph-start',
    'paragraph-stop',
    'word-start',
    'word-stop',
];


var makeDummy = function(emitter, counts){
    var dummy = function(){
        counts.cons++;
        this.someEmitter = emitter;
    }
    dummy.prototype.fun = function(cb){
        counts.fun++;
        setTimeout(function(){
            cb();
        }, 0)
    };
    dummy.prototype.run = function(a, b, c, cb){
        counts.run++;
        setTimeout(function(){
            cb();
        }, 0)
    };
    return dummy;
}

//NEW TESTS

var test = {
    asyncFunctions : function(number, done){
        var counts = {
            cons : 0,
            fun : 0,
            run : 0,
            events: 0,
            subevents: 0,
        }
        var parentEmitter = new Emitter();
        var childEmitter = new Emitter();
        var dummy = makeDummy(childEmitter, counts);
        var multi = Plex();
        for(var lcv=0; lcv<number; lcv++){
            multi.plex(new dummy());
        }
        multi.fun(function(){
            counts.cons.should.equal(number);
            counts.fun.should.equal(number);
            done();
        });
    },
    events : function(number, events, done){
        var counts = {
            cons : 0,
            fun : 0,
            run : 0,
            events: 0,
            subevents: 0,
        }
        var parentEmitter = new Emitter();
        var multi = Plex({
            bubbleup : [[
                'someEmitter', storyTellerPlexEvents
            ]],
            emitter: parentEmitter
        });
        var childEmitters = [];
        var dummies = [];

        for(var lcv=0; lcv< number; lcv++){
            (function(){ //async context
                var childEmitter = new Emitter();
                childEmitters.push(childEmitter);
                events.forEach(function(name){
                    childEmitter.on(name, function(){
                        counts.subevents++;
                    });
                });
                var dummy = makeDummy(childEmitter, counts);
                var instance = new dummy();
                dummies.push(instance);
                multi.plex(instance);
            })();
        }
        events.forEach(function(name){
            parentEmitter.on(name, function(){
                counts.events++;
            });
        });
        events.forEach(function(name){
            var ev = {}
            //todo: use uuid
            ev['field'+Math.floor(Math.random()*200000)] = true;
            dummies.forEach(function(dummy){
                dummy.someEmitter.emit(name, ev);
            });
        });
        setTimeout(function(){
            counts.events.should.equal(events.length);
            counts.subevents.should.equal(number*events.length);
            done()
        }, 0);
    }
}

describe('auto-plex', function(){
    describe('can Plex simple objects with function calls', function(){
        it('with a single object', function(done){
            test.asyncFunctions(1, done);
        });

        it('with two objects', function(done){
            test.asyncFunctions(2, done);
        });

        it('ten objects at a time', function(done){
            test.asyncFunctions(10, done);
        });

        it('one hundred objects at a time', function(done){
            test.asyncFunctions(100, done);
        });

        it('one thousand objects at a time', function(done){
            test.asyncFunctions(1000, done);
        });
    });

    describe('can Plex simple objects with events', function(){
        it('with a single object', function(done){
            test.events(1, ['word-start'], done);
        });

        it('with two objects', function(done){
            test.events(2, ['word-start'], done);
        });

        it('ten objects at a time', function(done){
            test.events(10, ['word-start'], done);
        });

        it('one hundred objects at a time', function(done){
            test.events(100, ['word-start'], done);
        });

        it('one thousand objects at a time', function(done){
            test.events(1000, ['word-start'], done);
        });
    });

    describe('can Plex simple objects with multiple events', function(){
        it('with a single object', function(done){
            test.events(1, ['word-start', 'word-stop'], done);
        });

        it('with two objects', function(done){
            test.events(2, ['word-start', 'word-stop'], done);
        });

        it('ten objects at a time', function(done){
            test.events(10, ['word-start', 'word-stop'], done);
        });

        it('one hundred objects at a time', function(done){
            test.events(100, ['word-start', 'word-stop'], done);
        });

        it('one thousand objects at a time', function(done){
            test.events(1000, ['word-start', 'word-stop'], done);
        });
    });
});
