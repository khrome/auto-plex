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
    var calls = 0;
    dummy.prototype.spun = function(){
        counts.spun++;
        return calls++;
    };
    dummy.prototype.stun = function(){
        counts.stun++;
        return new Promise(function(resolve){
            setTimeout(function(){
                resolve();
            }, 0)
        });
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
    functions : function(number, done){
        var counts = {
            cons : 0,
            fun : 0,
            run : 0,
            stun : 0,
            events: 0,
            subevents: 0,
        }
        var dummy = makeDummy(new Emitter(), counts);
        var multi = Plex();
        for(var lcv=0; lcv<number; lcv++){
            multi.plex(new dummy());
        }
        var results = multi.spun();
        should.exist(results);
        results.length.should.equal(number);
        done();
    },
    asyncFunctions : function(number, done){
        var counts = {
            cons : 0,
            fun : 0,
            run : 0,
            stun : 0,
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
    asyncPromises : function(number, done){
        var counts = {
            cons : 0,
            fun : 0,
            run : 0,
            stun : 0,
            events: 0,
            subevents: 0,
        }
        var dummy = makeDummy(new Emitter(), counts);
        var multi = Plex();
        for(var lcv=0; lcv<number; lcv++){
            multi.plex(new dummy());
        }
        var promise = multi.stun();
        should.exist(promise);
        promise.then(function(){
            counts.stun.should.equal(number);
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
    describe('can Plex simple objects', function(){
        describe('with function calls', function(){
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

        describe('with events', function(){
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

        describe('with multiple events', function(){
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

        describe('with promises', function(){
            it('with a single object', function(done){
                test.asyncPromises(1, done);
            });

            it('with two objects', function(done){
                test.asyncPromises(2, done);
            });

            it('ten objects at a time', function(done){
                test.asyncPromises(10, done);
            });

            it('one hundred objects at a time', function(done){
                test.asyncPromises(100, done);
            });

            it('one thousand objects at a time', function(done){
                test.asyncPromises(1000, done);
            });
        });

        describe('with synchronous functions', function(){
            it('with a single object', function(done){
                test.functions(1, done);
            });

            it('with two objects', function(done){
                test.functions(2, done);
            });

            it('ten objects at a time', function(done){
                test.functions(10, done);
            });

            it('one hundred objects at a time', function(done){
                test.functions(100, done);
            });

            it('one thousand objects at a time', function(done){
                test.functions(1000, done);
            });
        });
    });
});
