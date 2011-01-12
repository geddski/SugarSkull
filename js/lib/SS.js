
var SS = (typeof SS != 'undefined') ? SS : { // SugarSkull

  version: '0.2.0',
  mode: 'compatibility',

  router: function() {
    var self = this, 
        first = false, 
        hasFirstRoute = false, 
        state = {},
        hostObject, 
        routes,
        onleave;

    if(arguments.length > 1) { // a hostObject is not required.
      hostObject = arguments[0];
      routes = arguments[1];
    }
    else {
      routes = arguments[0];
    }

    this.retired = [];
    this.routes = routes;

    function explodeURL() {
      var v = SS.mode == 'modern' ? document.location.pathname : document.location.hash;
      return v.slice(1, v.length).split("/");
    }

    function execMethods(methods, route) {

      for (var i=0; i < methods.length; i++) {

        if(!self.retired[methods[i]]) {
          if(hostObject && typeof methods[i] == "string") {
            hostObject[methods[i]].call(hostObject);
          }
          else if(typeof methods[i] != "string"){
            methods[i]();
          }
          else {
            throw new Error("exec: method not found on route '" + route + "'.");
          }          
        }
      }
    }

    function execRoute(routes, route) {
      
      var h = document.location.hash;
      h = h.slice(1, h.length);
      
      if(new RegExp(route).test(h) && !self.retired[route]) {

        if(routes[route].state) {
          self.state = routes[route].state;
        }

        if(routes[route].once === true) {
          self.retired[route] = true;
        }
        else if(routes[route].once) {

          delete self.retired[route].once;
          execMethods(routes[route].once, route);
        }

        if(routes[route].on) {
          execMethods(routes[route].on, route);
        }

        onleave = routes[route].onleave || null;

      }
    }

    function verifyCurrentRoute() { // verify that there is a matching route.

      var h = document.location.hash;
      h.slice(1, h.length);
      
      for(var route in routes) {
        if (routes.hasOwnProperty && new RegExp(route).test(h)) {
          return true;
        }
      }
      return false;
    }

    function eventRoute(event) {
      
      if(event) {
        state = event.state;
      }
      
      var routes = self.routes;
  
      if(!verifyCurrentRoute() && routes.notfound) {
        execMethods(routes.notfound.on);
        return;
      }

      if(routes.beforeall) {
        execMethods(routes.beforeall.on); // methods to be fired before every route.
      }

      if(routes.leaveall && !first) {
        execMethods(routes.leaveall.on); // methods to be fired when leaving every route.
      }

      if(self.onleave) {
        execMethods(self.onleave); // fire the current 'onleave-route' method.
        self.onleave = null; // only fire it once.
      }

      for(var route in routes) {
        if (routes.hasOwnProperty) {
          execRoute(routes, route);
        }
      }
      
      if(routes.afterall) {
        execMethods(routes.afterall.on); // methods to be fired after every route.
      }      

    } 

    SS.listener.Init(eventRoute); // support for older browsers

    for(var route in routes) {
      if (routes.hasOwnProperty) {
        if(routes[route].start) {
          SS.listener.setStateOrHash(state, route, routes[route].start);
          SS.listener.fire();
          hasFirstRoute = true;
          break;
        }
      }
    }

    if(!verifyCurrentRoute() && routes.notfound) {
      execMethods(routes.notfound.on);
    }
    else if(!hasFirstRoute && window.location.hash.length > 0) {
      SS.listener.fire();
    }

    first = false;    

    return {
      
      getState: function() {
        return self.state;
      },
      
      getRetired: function() {
        return self.retired;
      },
      
      getRoute: function(v) {

        // if v == number, returns the value at that index of the hash.
        // if v == string, returns the index at which it was found.
        // else returns an array which represents the current hash.

        if(typeof v == "number") {
          return explodeURL()[v];
        }
        else if(typeof v == "string"){
          var h = explodeURL();
          return h.indexOf(v);
        }
        else {
          return explodeURL();
        }
      },

      setRoute: function(v, qty, val) {
          
        var url = explodeURL();
        
        if(typeof v == "string") {
          url = [v];
        }
        else if(v !== false && qty !== false && val !== false) {
          url.splice(v, qty, val);
        }
        else if(v !== false && qty !== false) {
          url.splice(v, qty);
        }
        else {
          throw new Error("setRoute: not enough args.")
        }
        
        SS.listener.setStateOrHash(self.state, v || val, url.join("/"));
        return hash;
                      
      },

      createRoute: function() {

      },

      removeRoute: function() {

      }
      
    };
    
  },

  listener: { 

    hash: document.location.hash,

    check:  function () { // only used for 'compatibility' or 'legacy'.
      var h = document.location.hash;
      if (h != this.hash) {
        this.hash = h;
        this.onHashChanged();
      }
    },
    
    fire: function() {
      if(SS.mode = 'modern') {
        window.onpopstate();
      }
      else if(SS.mode = 'compatibility') {
        window.onhashchange();
      }
      else {
        this.onHashChanged();
      }
    },

    Init: function (fn) {

      var self = this;

      if(window.history && window.history.pushState) {

        SS.mode = 'modern';
        window.onpopstate = fn
      } 
      else if('onhashchange' in window && 
          (document.documentMode === undefined || document.documentMode > 7)) { 

        window.onhashchange = fn;
      }
      else { // IE support, based on a concept by Erik Arvidson ...

        SS.mode = 'legacy';

        var frame = document.createElement('iframe');
        frame.id = 'state-frame';
        frame.style.display = 'none';
        document.body.appendChild(frame);
        this.writeFrame('');

        if ('onpropertychange' in document && 'attachEvent' in document) {
          document.attachEvent('onpropertychange', function () {
            if (event.propertyName == 'location') {
              self.check();
            }
          });
        }

        this.onHashChanged = fn;
      }

      if(SS.mode != 'modern') {
        // poll for changes of the hash
        window.setInterval(function () { self.check(); }, 50);        
      }
    },

    setStateOrHash: function (o, t, s) {

      if(SS.mode == 'modern') {
        window.history.pushState(o, t, s);
        return this;
      }

      // Mozilla always adds an entry to the history
      if (SS.mode == 'legacy') {
        this.writeFrame(s);
      }

      document.location.hash = s;
      return this;
    },

    writeFrame: function (s) { // IE support...
      var f = document.getElementById('state-frame');
      var d = f.contentDocument || f.contentWindow.document;
      d.open();
      d.write("<"+"script>window._hash = '" + s + "'; window.onload = parent.listener.syncHash;<\/"+"script>");
      d.close();
    },

    syncHash: function () { // IE support...
      var s = this._hash;
      if (s != document.location.hash) {
        document.location.hash = s;
      }
      return this;
    },

    onHashChanged:  function () {}
  }

};