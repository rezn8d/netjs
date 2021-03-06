var _ = require('lodash');


exports.plugin = function($N) {
    return {
        name: 'IRC',
        description: 'Internet Relay Chat',
        options: {},
        version: '1.0',
        author: 'http://netention.org',
        start: function(options) {
            function tolower(s) {
                return s.toLowerCase();
            }
            options.readChannels = _.map(options.readChannels, tolower);
            options.writeChannels = _.map(options.writeChannels, tolower);
			options.allChannels = _.union(options.readChannels, options.writeChannels);

            this.options = options;


            var irc = require('irc');

            $N.addAll([
                {
                    id: 'IRCChannel', name: 'IRC Channel', extend: ['Internet'],
                    value: {
                        //http://www.w3.org/Addressing/draft-mirashi-url-irc-01.txt
                        // irc:[ //[ <host>[:<port>] ]/[<target>] [,needpass] ]
                        'channelURL': {name: 'URL', extend: 'text' /* url */, min: 1, default: 'irc://server/#channel'},
                    }
                },
                {
                    id: 'SendToIRC', name: 'Send to IRC', extend: ['Internet'],
                    value: {
                        //http://www.w3.org/Addressing/draft-mirashi-url-irc-01.txt
                        // irc:[ //[ <host>[:<port>] ]/[<target>] [,needpass] ]
                        'SendToWhichIRCChannel': {name: 'Channel', extend: 'object', min: 1},
                    }
                }

            ]);

            var ch = _.union(options.readChannels, options.writeChannels);

            var maxusernamelength = 9;

            var username = options.nick || $N.server.name.replace('/ /g', '_').substring(0, maxusernamelength);

            this.channels = ch;
            this.irc = new irc.Client(options.server, username, {
                channels: ch
            });
            var myorigin = 'irc://' + options.server + '/' + username;


            /*var RiveScript = require("rivescript");
             var bot = new RiveScript({debug: false});
             bot.loadDirectory("./plugin/rivescript/brain", function() {
             bot.sortReplies();
             bot.ready = true;
             }, function error_handler(loadcount, err) {
             console.log("Error loading batch #" + loadcount + ": " + err + "\n");
             });*/

            // Listen for any message, say to him/her in the room
            var that = this;
            that.prevMsg = '';
            var messageObject = {};
            var bufferedMessages = 0;
            this.irc.addListener("message", function(from, to, text, message) {
                var t = to.toLowerCase();
                if (!_.contains(options.readChannels, t))
                    return;

                var processed = false;
                try {
                    var m = JSON.parse(text);
                    if (m.id) {
                        m.author = 'irc://' + options.server + '/' + from;

                        if (m.author != myorigin) {
                            $N.getObjectByID(m.id, function(err, d) {
                                var newer = false; //if d.length == 1, newer = (m.lastModified > d.created)
                                if (err) {
                                    $N.pub(m);
                                    that.prevMsg = m.id;
                                }
                                else {
                                    //only replace if existing object's origin matches
                                    if (m.author == d[0].author) {

                                        if (m.removed) {
                                            //if (d[0].fromIRC) 
                                            $N.deleteObject(m.id, null, "irc://");
                                        }
                                        else {
                                            $N.pub(m);
                                        }
                                    }
                                }
                            });
                        }
                        processed = true;
                    }
                }
                catch (e) {
                }

                if (!processed) {
                    if (!messageObject[t]) {
                        var name = to + ', ' + from + ': ' + text;
                        var m = new $N.nobject();
						m.scope = 8; //advertise
                        messageObject[t] = m;
                        m.setName(to);
                        m.author = 'irc://' + options.server + '/' + to;
                    }
                    else {
                        messageObject[t].modifiedAt = Date.now();
                    }


                    var prevDesc = messageObject[t].getDescription() || '';
                    messageObject[t].removeTag('html');
                    messageObject[t].addDescription( (prevDesc.length > 0 ? prevDesc + '<br/>' : '') + from + ': ' + text);
                    messageObject[t].touch();


                    $N.pub(messageObject[t]);

                    bufferedMessages++;

                    if (bufferedMessages >= options.maxMessagesPerObject) {
                        bufferedMessages = 0;
                        delete messageObject[t];
                    }
                }


                /*if (text.indexOf(username) == 0) {
                 var firstSpace = text.indexOf(' ');
                 text = text.substring(firstSpace, text.length);
                 var reply = bot.reply(from, text);
                 //that.irc.say(to, reply + ' [netention]');
                 
                 //save response as a reply
                 var n = $N.objNew();
                 //m.fromIRC = true; //avoid rebroadcast
                 n.ircChannels = [from];
                 n.setName(reply);
                 n.replyTo = [m.id];
                 $N.pub(n);
                 }*/
            });

            var messageSendDelayMS = 1500;
            that.send = _.throttle(function(to, xjson) {
                that.irc.say(to, xjson);
            }, messageSendDelayMS);
			
			$N.on('object:pub', function(o) {
				if ((o.scope == 8) && (o.author.indexOf('irc://')!==0)) {
					 _.each(options.allChannels, function(to) {
						try {
							that.send(to, o);
						}
						catch (e) {
						}
                	});
				}
				
			});

        },
        onPub: function(x) {
            //avoid rebroadcast to origin
            if (x.author)
                if (x.author.indexOf('irc://') === 0)
                    return;

            x = $N.objCompact(x);

            var that = this;

            if (x.removed)
                if (x.content === 'irc://')
                    return;

            var toChannels = that.options.writeChannels;
            if (x.ircChannels)
                toChannels = x.ircChannels;

            if (that.irc) {
                var xjson = JSON.stringify(x);

                _.each(toChannels, function(to) {
                    try {
                        that.send(to, xjson);
                    }
                    catch (e) {
                    }
                });
            }
        },
        stop: function() {
        }

    };
};
