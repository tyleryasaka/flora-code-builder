var html = require('choo/html')
var devtools = require('choo-devtools')
var choo = require('choo')

var app = choo()
app.use(devtools())
app.use(globalStore)
app.route('/', mainView)
app.mount('body')

function renderInsert (indexArr, emit) {
  return html`
    <button onclick=${insert}>+</button>
  `

  function insert () {
    emit('insertCodeItem', indexArr)
  }
}

function option (item, prop, val) {
  return html`<option value="${val}" ${item[prop] === val ? 'selected' : ''}>${val}</option>`
}

function renderCodeItem (emit, item, indexArr) {
  return html`
    <div>
      <div class="codeItem">
        <select oninput="${setAction(indexArr)}">
          ${option(item, 'action', 'set color')}
          ${option(item, 'action', 'delay')}
          ${option(item, 'action', 'if')}
          ${option(item, 'action', 'else if')}
        </select>
        ${optionsFor(item, indexArr)}
      </div>
      ${renderInsert(indexArr, emit)}
    </div>
  `

  function remove () {
    emit('removeCodeItem', indexArr)
  }

  function setAction (indexArr) {
    return (e) => {
      emit('updateAction', indexArr, e.target.value)
    }
  }

  function setValue (indexArr) {
    return (e) => {
      emit('updateValue', indexArr, e.target.value)
    }
  }

  function optionsFor (item, indexArr) {
    if (item.action === 'set color') {
      return html`
      <select oninput="${setValue(indexArr)}">
        ${option(item, 'value', 'red')}
        ${option(item, 'value', 'green')}
        ${option(item, 'value', 'blue')}
      </select>
      <button onclick=${remove}>-</button>
      `
    } else if (item.action === 'delay') {
      return html`
        <input type="number" oninput="${setValue(indexArr)}" value=${item.value}>
        <button onclick=${remove}>-</button>
      `
    } else if (item.action === 'if' || item.action === 'else if') {
      return html`
        <select oninput="${setValue(indexArr)}">
          ${option(item, 'value', 'touch')}
          ${option(item, 'value', 'color is red')}
          ${option(item, 'value', 'color is green')}
          ${option(item, 'value', 'color is blue')}
          ${option(item, 'value', 'color is none')}
        </select>
        <button onclick=${remove}>-</button>
        <div class="block if">
          ${renderInsert([].concat(indexArr, -1), emit)}
          ${item.items.map((subItem, j) => {
            return renderCodeItem(emit, subItem, [].concat(indexArr, j))
          })}
        </div>
      `
    }
  }
}

function mainView (state, emit) {
  return html`
    <body>
      Brightness: <input type="number" id="brightness" value="${state.brightness}" />
      <br>
      <div id="editor">
        ${renderInsert([-1], emit)}
        ${state.code.map((item, i) => {
          return renderCodeItem(emit, item, [i], 0)
        })}
      </div>
      <button onclick="${run}">Generate</button>
      <button onclick="${clear}">Clear</button>
    </body>
  `

  function run (e) {
    const code = genCode(state.code)
    console.log(code)
  }

  function clear () {
    emit('clear')
  }
}

function globalStore (state, emitter) {
  const stateCode = localStorage.getItem('state-code')
  const stateBright = localStorage.getItem('state-brightness')
  state.brightness = stateBright ? Number(stateBright) : 10
  state.code = stateCode ? JSON.parse(stateCode) : [
    { action: 'set color', value: 'red' }
  ]
  emitter.on('updateValue', function (indexArr, value) {
    const { items, index } = getItem(indexArr)
    items[index].value = value
    emitter.emit('render')
  })

  emitter.on('clear', function () {
    state.brightness = 10
    state.code = [
      { action: 'set color', value: 'red' }
    ]
    emitter.emit('render')
  })

  function getItem (indexArr) {
    let items = state.code, remainingArr = indexArr
    while(remainingArr.length > 1) {
      items = items[remainingArr[0]].items
      remainingArr = remainingArr.slice(1)
    }
    const index = remainingArr[0]
    return { items, index }
  }

  emitter.on('updateAction', function (indexArr, action) {
    const { items, index } = getItem(indexArr)
    const item = items[index]
    item.action = action
    if (action === 'setColor') {
      item.value = 'red'
    } else if (action === 'delay') {
      item.value = '1'
    } else if (action === 'if' || action === 'else if') {
      item.value = 'touch'
      item.items = [ {action: 'set color', value: 'red' } ]
    }
    emitter.emit('render')
  })

  emitter.on('insertCodeItem', function (indexArr) {
    const { items, index } = getItem(indexArr)
    items.splice(index + 1, 0, { action: 'set color', value: 'red' })
    emitter.emit('render')
  })

  emitter.on('removeCodeItem', function (indexArr) {
    const { items, index } = getItem(indexArr)
    items.splice(index, 1)
    emitter.emit('render')
  })

  emitter.on('render', function () {
    const stateCode = JSON.stringify(state.code)
    const brightness = state.brightness
    localStorage.setItem('state-code', stateCode)
    localStorage.setItem('state-brightness', brightness)
  })
}

function genCode (items) {
  const loopCode = genCodeHelp(items)
    return `
#include <Adafruit_NeoPixel.h>

// Which pin on the Arduino is connected to the NeoPixels?
// On a Trinket or Gemma we suggest changing this to 1:
#define LED_PIN    6

// How many NeoPixels are attached to the Arduino?
#define LED_COUNT 1

Adafruit_NeoPixel pixels(LED_COUNT, LED_PIN, NEO_GRB + NEO_KHZ800);
// Argument 1 = Number of pixels in NeoPixel strip
// Argument 2 = Arduino pin number (most are valid)
// Argument 3 = Pixel type flags, add together as needed:
//   NEO_KHZ800  800 KHz bitstream (most NeoPixel products w/WS2812 LEDs)
//   NEO_GRB     Pixels are wired for GRB bitstream (most NeoPixel products)

int analogPin = 9;
int val = 0;  // variable to store the value read
bool touchConsumed = false;
int currentR = 0;
int currentG = 0;
int currentB = 0;

//uint32_t colors[] = {pixels.Color(255,   0,   0), pixels.Color(  0, 255,   0), pixels.Color(  0,   0, 255)};

void setup() {
  Serial.begin(9600);

  pixels.begin();           // INITIALIZE NeoPixel strip object (REQUIRED)
  pixels.clear();            // Turn OFF all pixels ASAP
  pixels.setBrightness(10); // Set BRIGHTNESS to about 1/5 (max = 255)
}

void loop() {
  val = analogRead(analogPin);
  //  Serial.println(val);
  bool touched = (val > 100) && !touchConsumed;
  if (val < 80) {
    touchConsumed = false;
  }
  ${loopCode}
}

void setColor(int r, int g, int b) {
    currentR = r;
    currentG = g;
    currentB = b;
    pixels.setPixelColor(0, pixels.Color(r, g, b));         //  Set pixel's color (in RAM)
    pixels.show();                          //  Update strip to match
}

void clearPixel() {
    currentR = 0;
    currentG = 0;
    currentB = 0;
    pixels.clear();
}

bool checkColor(int r, int g, int b) {
    return currentR == r && currentG == g && currentB == b;
}
    `
}

function genCodeHelp (items) {
  return items.map(item => {
    if (item.action === 'if' || item.action === 'else if') {
      let condition
      if (item.value === 'touch') {
        condition = 'touched'
      } else if (item.value === 'color is red') {
        condition = 'checkColor(255, 0, 0)'
      } else if (item.value === 'color is green') {
        condition = 'checkColor(0, 255, 0)'
      } else if (item.value === 'color is blue') {
        condition = 'checkColor(0, 0, 255)'
      } else if (item.value === 'color is none') {
        condition = 'checkColor(0, 0, 0)'
      }
      return `
        ${item.action === 'if' ? 'if' : 'else if'} (${condition}) {
          ${item.value === 'touch' ? 'touchConsumed = true;' : ''}
          ${genCodeHelp(item.items)}
        }
      `
    } else if (item.action === 'delay') {
      const ms = item.value * 1000
      return `
        delay(${ms});
      `
    } else if (item.action === 'set color') {
      let color
      if (item.value === 'red') {
        color = '255, 0, 0'
      } else if (item.value === 'green') {
        color = '0, 255, 0'
      } else if (item.value === 'blue') {
        color = '0, 0, 255'
      }
      return `
        setColor(${color});
      `
    }
  }).join('')
}
