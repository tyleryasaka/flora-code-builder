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

function option (item, prop, val, valLabel) {
  return html`<option value="${val}" ${item[prop] === val ? 'selected' : ''}>${valLabel || val}</option>`
}

function renderCodeItem (emit, item, indexArr, prevItem, colors) {
  return html`
    <div>
      <div class="codeItem">
        <select oninput="${setAction(indexArr)}">
          ${option(item, 'action', 'set color')}
          ${option(item, 'action', 'delay')}
          ${option(item, 'action', 'repeat')}
          ${/*
            ${option(item, 'action', 'if')}
            ${prevItem && ['if', 'else if'].includes(prevItem.action) ? option(item, 'action', 'else if') : ''}
          */''}
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

  function setValue2 (indexArr) {
    return (e) => {
      emit('updateValue2', indexArr, e.target.value)
    }
  }

  function renderColorSelect (item, indexArr, prop, cb) {
    return html`
      <select oninput="${cb(indexArr)}">
        ${colors.map(color => {
          return option(item, prop, color.id, color.name)
        })}
      </select>
    `
  }

  function optionsFor (item, indexArr) {
    if (item.action === 'set color') {
      return html`
        ${renderColorSelect(item, indexArr, 'value', setValue)}
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
          ${option(item, 'value', 'color is')}
          ${option(item, 'value', 'light is off')}
          ${option(item, 'value', 'light is on')}
        </select>
        ${item.value === 'color is' ? renderColorSelect(item, indexArr, 'value2', setValue2) : ''}
        <button onclick=${remove}>-</button>
        <div class="block if">
          ${renderInsert([].concat(indexArr, -1), emit)}
          ${item.items.map((subItem, j) => {
            return renderCodeItem(emit, subItem, [].concat(indexArr, j), (j > 0) ? item.items[j - 1] : null, colors)
          })}
        </div>
      `
    } else if (item.action === 'repeat') {
      return html`
        <input type="number" step="1" min="1" oninput="${setValue(indexArr)}" value=${item.value}>
        <button onclick=${remove}>-</button>
        <div class="block repeat">
          ${renderInsert([].concat(indexArr, -1), emit)}
          ${item.items.map((subItem, j) => {
            return renderCodeItem(emit, subItem, [].concat(indexArr, j), (j > 0) ? item.items[j - 1] : null, colors)
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
          return renderCodeItem(emit, item, [i], (i > 0) ? state.code[i - 1] : null, state.colors)
        })}
      </div>
      <button onclick="${run}">Generate</button>
      <button onclick="${clear}">Clear</button>
    </body>
  `

  function run (e) {
    const code = genCode(state.code, state.colors)
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
  state.colors = [
    { id: 'a', name: 'electric purple', value: '187, 0, 255' },
    { id: 'b', name: 'carmine red', value: '255, 0, 55' },
    { id: 'c', name: 'fluorescent orange', value: '255, 195, 0' },
    { id: 'd', name: 'turquoise blue', value: '0, 255, 195' },
    { id: 'e', name: 'spring green', value: '0, 255, 144' }
  ]
  state.code = stateCode ? JSON.parse(stateCode) : [
    { action: 'set color', value: 'a' }
  ]
  emitter.on('updateValue', function (indexArr, value) {
    const { items, index } = getItem(indexArr)
    items[index].value = value
    if (value === 'color is') {
      items[index].value2 = 'a'
    }
    emitter.emit('render')
  })

  emitter.on('updateValue2', function (indexArr, value2) {
    const { items, index } = getItem(indexArr)
    items[index].value2 = value2
    emitter.emit('render')
  })

  emitter.on('clear', function () {
    state.brightness = 10
    state.code = [
      { action: 'set color', value: 'a' }
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
    if (action === 'set color') {
      item.value = 'a'
    } else if (action === 'delay') {
      item.value = '1'
    } else if (action === 'if' || action === 'else if') {
      item.value = 'color is'
      item.value2 = 'a'
      item.items = [{ action: 'set color', value: 'a' }]
    } else if (action === 'repeat') {
      item.value = '1'
      item.items = [{ action: 'set color', value: 'a' }]
    }
    emitter.emit('render')
    setTimeout(() => { emitter.emit('render') }, 100)
  })

  emitter.on('insertCodeItem', function (indexArr) {
    const { items, index } = getItem(indexArr)
    items.splice(index + 1, 0, { action: 'set color', value: 'a' })
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

function genCode (items, colors) {
  const seed = { value: 0 }
  const loopCode = genCodeHelp(items, colors, seed)
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
int touchCapThresholdTop = 150;
int touchCapThresholdBottom = 50;
int touchTimeout = 500;
unsigned long lastTouched;

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
  bool touched = (val > touchCapThresholdTop) && !touchConsumed && (millis() - touchTimeout) > lastTouched;
  if (val < touchCapThresholdBottom) {
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

function genCodeHelp (items, colors, seed) {
  return items.map(item => {
    if (item.action === 'if' || item.action === 'else if') {
      let condition
      if (item.value === 'touch') {
        condition = 'touched'
      } else if (item.value === 'color is') {
        const color = colors.find(c => {
          return c.id === item.value2
        }).value
        condition = `checkColor(${color})`
      } else if (item.value === 'light is off') {
        condition = 'checkColor(0, 0, 0)'
      } else if (item.value === 'light is on') {
        condition = '!checkColor(0, 0, 0)'
      }
      return `
        ${item.action === 'if' ? 'if' : 'else if'} (${condition}) {
          ${item.value === 'touch' ? 'touchConsumed = true; lastTouched = millis();' : ''}
          ${genCodeHelp(item.items, colors, seed)}
        }
      `
    } else if (item.action === 'delay') {
      const ms = item.value * 1000
      return `
        delay(${ms});
      `
    } else if (item.action === 'set color') {
      const color = colors.filter(c => {
        console.log(c.id, item.value)
        return c.id === item.value
      })[0].value
      return `
        setColor(${color});
      `
    } else if (item.action === 'repeat') {
      const count = Number(item.value)
      let counter = 'i'
      for (let i = 0; i < seed.value; i++) {
        counter = `${counter}i`
      }
      seed.value++
      return `
        for (int ${counter} = 0; ${counter} < ${count}; ${counter}++) {
          ${genCodeHelp(item.items, colors, seed)}
        }
      `
    }
  }).join('')
}
