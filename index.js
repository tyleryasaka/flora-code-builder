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
          ${option(item, 'action', 'setColor')}
          ${option(item, 'action', 'delay')}
          ${option(item, 'action', 'if')}
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
    if (item.action === 'setColor') {
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
    } else if (item.action === 'if') {
      return html`
        <select oninput="${setValue(indexArr)}">
          ${option(item, 'value', 'touch')}
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
    </body>
  `

  function run (e) {
    const code = genCode(state)
    console.log(code)
  }
}

function globalStore (state, emitter) {
  const stateCode = localStorage.getItem('state-code')
  const stateBright = localStorage.getItem('state-brightness')
  state.brightness = stateBright ? Number(stateBright) : 10
  state.code = stateCode ? JSON.parse(stateCode) : [
    { action: 'setColor', value: 'red' }
  ]
  emitter.on('updateValue', function (indexArr, value) {
    const { items, index } = getItem(indexArr)
    items[index].value = value
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
    } else if (action === 'if') {
      item.value = 'touch'
      item.items = [ {action: 'setColor', value: 'red' } ]
    }
    emitter.emit('render')
  })

  emitter.on('insertCodeItem', function (indexArr) {
    const { items, index } = getItem(indexArr)
    items.splice(index + 1, 0, { action: 'setColor', value: 'red' })
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

function genCode (state) {
  return `
  // A basic everyday NeoPixel strip test program.

  // NEOPIXEL BEST PRACTICES for most reliable operation:
  // - Add 1000 uF CAPACITOR between NeoPixel strip's + and - connections.
  // - MINIMIZE WIRING LENGTH between microcontroller board and first pixel.
  // - NeoPixel strip's DATA-IN should pass through a 300-500 OHM RESISTOR.
  // - AVOID connecting NeoPixels on a LIVE CIRCUIT. If you must, ALWAYS
  //   connect GROUND (-) first, then +, then data.
  // - When using a 3.3V microcontroller with a 5V-powered NeoPixel strip,
  //   a LOGIC-LEVEL CONVERTER on the data line is STRONGLY RECOMMENDED.
  // (Skipping these may work OK on your workbench but can fail in the field)

  #include <Adafruit_NeoPixel.h>
  #ifdef __AVR__
   #include <avr/power.h> // Required for 16 MHz Adafruit Trinket
  #endif

  // Which pin on the Arduino is connected to the NeoPixels?
  // On a Trinket or Gemma we suggest changing this to 1:
  #define LED_PIN    6

  // How many NeoPixels are attached to the Arduino?
  #define LED_COUNT 60

  // Declare our NeoPixel strip object:
  Adafruit_NeoPixel strip(LED_COUNT, LED_PIN, NEO_GRB + NEO_KHZ800);
  // Argument 1 = Number of pixels in NeoPixel strip
  // Argument 2 = Arduino pin number (most are valid)
  // Argument 3 = Pixel type flags, add together as needed:
  //   NEO_KHZ800  800 KHz bitstream (most NeoPixel products w/WS2812 LEDs)
  //   NEO_KHZ400  400 KHz (classic 'v1' (not v2) FLORA pixels, WS2811 drivers)
  //   NEO_GRB     Pixels are wired for GRB bitstream (most NeoPixel products)
  //   NEO_RGB     Pixels are wired for RGB bitstream (v1 FLORA pixels, not v2)
  //   NEO_RGBW    Pixels are wired for RGBW bitstream (NeoPixel RGBW products)


  // setup() function -- runs once at startup --------------------------------

  void setup() {
    // These lines are specifically to support the Adafruit Trinket 5V 16 MHz.
    // Any other board, you can remove this part (but no harm leaving it):
  #if defined(__AVR_ATtiny85__) && (F_CPU == 16000000)
    clock_prescale_set(clock_div_1);
  #endif
    // END of Trinket-specific code.

    strip.begin();           // INITIALIZE NeoPixel strip object (REQUIRED)
    strip.show();            // Turn OFF all pixels ASAP
    strip.setBrightness(${state.brightness}); // Set BRIGHTNESS to about 1/5 (max = 255)
  }


  // loop() function -- runs repeatedly as long as board is on ---------------

  void loop() {
    // Fill along the length of the strip in various colors...
    setColor(strip.Color(255,   0,   0)); // Red
    delay(1000);
    setColor(strip.Color(  0, 255,   0)); // Green
    delay(1000);
    setColor(strip.Color(  0,   0, 255)); // Blue
    delay(1000);
  }

  void setColor(uint32_t color) {
      strip.setPixelColor(0, color);         //  Set pixel's color (in RAM)
      strip.show();                          //  Update strip to match
  }
  `
}
