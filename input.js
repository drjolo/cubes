// Copyright 2011 Kevin Reid, under the terms of the MIT License as detailed in
// the accompanying file README.md or <http://opensource.org/licenses/MIT>.

// TODO: explicitly connect global vars

function Input(eventReceiver, playerInput) {
  "use strict";

  var keymap = {};
  var mousePos = [0,0];
  
  function evalVel(pos, neg) {
    return pos ? neg ? 0 : 1 : neg ? -1 : 0;
  }
  function interestingInMap(code) {
    switch (code) {
      case 'A'.charCodeAt(0): case 37:
      case 'W'.charCodeAt(0): case 38:
      case 'D'.charCodeAt(0): case 39:
      case 'S'.charCodeAt(0): case 40:
      case 'E'.charCodeAt(0):
      case 'C'.charCodeAt(0):
        return true;
      default:
        return false;
    }
  }
  function evalKeys() {
    var l = keymap['A'.charCodeAt(0)] || keymap[37];
    var r = keymap['D'.charCodeAt(0)] || keymap[39];
    var f = keymap['W'.charCodeAt(0)] || keymap[38];
    var b = keymap['S'.charCodeAt(0)] || keymap[40];
    var u = keymap['E'.charCodeAt(0)];
    var d = keymap['C'.charCodeAt(0)];
    
    playerInput.movement = [
      evalVel(r, l),
      evalVel(u, d),
      evalVel(b, f)
    ];
  }
  
  eventReceiver.addEventListener("keydown", function (event) {
    // avoid disturbing browser shortcuts
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    
    var code = event.keyCode || event.which;

    // handlers for 'action' keys (immediate effects)
    switch (String.fromCharCode(code)) {
      case "R": hideMenu(); playerInput.changeWorld(1); return false;
      case "F": hideMenu(); playerInput.changeWorld(-1); return false;
    }

    // 'mode' keys such as movement directions go into the keymap
    if (interestingInMap(code)) {
      keymap[code] = true;
      evalKeys();
      return false;
    } else {
      return true;
    }
  }, false);
  document.addEventListener("keyup", function (event) {
    // on document to catch key-ups after focus changes etc.
    var code = event.keyCode || event.which;
    if (interestingInMap(code)) {
      var wasSetInMap = keymap[code];
      keymap[code] = false;
      evalKeys();
      return !wasSetInMap;
    } else {
      return true;
    }
  }, true);
  
  
  var dx = 0;
  var prevx = 0;
  
  eventReceiver.addEventListener("mousemove", function (event) {
    mousePos = [event.clientX, event.clientY];

    var cs = window.getComputedStyle(eventReceiver, null);
    var w = parseInt(cs.width);
    var h = parseInt(cs.height);

    var swingY = event.clientY / (h*0.5) - 1;
    var swingX = event.clientX / (w*0.5) - 1;
    
    // y effect
    playerInput.pitch = -Math.PI/2 * swingY;
    
    // x effect
    var direct = -Math.PI/2 * swingX;
    playerInput.yaw += (direct - prevx);
    prevx = direct;
    dx = -0.5 * deadzone(swingX, 0.4);
  }, false);
  eventReceiver.addEventListener("mouseout", function (event) {
    mousePos = [event.clientX, event.clientY];
    dx = 0;
  }, false);
  eventReceiver.onblur = function (event) {
    keymap = {};
    dx = 0;
  };

  eventReceiver.addEventListener("click", function (event) {
    mousePos = [event.clientX, event.clientY];
    if (menuVisible()) {
      hideMenu();
    } else {
      eventReceiver.focus();
      playerInput.click(0);
    }
    return false;
  }, false);
  eventReceiver.oncontextmenu = function (event) { // On Firefox 5.0.1 (most recent tested 2011-09-10), addEventListener does not suppress the builtin context menu, so this is an attribute rather than a listener.
    mousePos = [event.clientX, event.clientY];
    
    if (menuVisible())
      hideMenu();
    else
      showMenu();

    return false;
  };
  
  // inhibit incidental text selection
  eventReceiver.onmousedown/* Chrome/Firefox */ = eventReceiver.onselectstart/* for IE */ = function (event) { return false; };
  
  function step() {
    if (dx != 0) {
      playerInput.yaw += dx;
    }
  }
  
  function menuVisible() {
    return document.getElementById("menu").style.visibility !== "hidden";
  }

  var blockSetInMenu = null;
  var menuCanvases = [];
  function showMenu() {
    var menu = document.getElementById("menu"); // TODO global id

    // TODO: Need to rebuild menu if blocks in the set have changed appearance
    if (playerInput.blockSet !== blockSetInMenu) {
      while (menu.firstChild) menu.removeChild(menu.firstChild);

      blockSetInMenu = playerInput.blockSet;
      var blockRenderer = new BlockRenderer(blockSetInMenu);
    
      var sidecount = Math.ceil(Math.sqrt(blockSetInMenu.length));
      var size = Math.min(64, 300 / sidecount);
    
      for (var i = 0; i < blockSetInMenu.length; i++) {
        var canvas = document.createElement('canvas');
        canvas.width = canvas.height = 64; // TODO magic number
        canvas.style.width = canvas.style.height = size + "px";
        menuCanvases[i] = canvas;
        menu.appendChild(canvas);
        var cctx = canvas.getContext('2d');
        cctx.putImageData(blockRenderer.blockToImageData(i, cctx), 0, 0);
        (function (canvas,i) {
          canvas.onclick = function () {
            hideMenu();
            playerInput.tool = i;
            return false;
          };
          canvas.onmousedown = canvas.onselectstart = function () {
            canvas.className = "selectedTool";
            return false; // inhibit selection
          };
          canvas.onmouseout = function () {
            canvas.className = i == playerInput.tool ? "selectedTool" : "";
            return true;
          };
        })(canvas,i);
        if ((i+1) % sidecount == 0) {
          menu.appendChild(document.createElement('br'));
        }
      }
      
      blockRenderer.delete();
    }

    for (var i = 0; i < blockSetInMenu.length; i++) {
      menuCanvases[i].className = i == playerInput.tool ? "selectedTool" : "";
    }
    
    var cs = window.getComputedStyle(menu, null);
    var menuW = parseInt(cs.width);
    var menuH = parseInt(cs.height);
    
    menu.style.left = (mousePos[0] - menuW/2) + "px";
    menu.style.top  = (mousePos[1] - menuH/2) + "px";
    menu.style.visibility = 'visible';
  }
  function hideMenu() {
    document.getElementById("menu").style.visibility = 'hidden';
    eventReceiver.focus();
  }
  
  this.step = step;
  this.getMousePos = function () { return mousePos; };
}
