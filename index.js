var hljs = require('highlight.js/lib/highlight')
var cpp = require('highlight.js/lib/languages/cpp')
hljs.registerLanguage('cpp', cpp)

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
    <div class="insert" onclick=${insert}>+</div>
  `

  function insert () {
    emit('insertCodeItem', indexArr)
  }
}

function renderRemove (fn) {
  return html`<div class="remove" onclick=${fn}>x</div>`
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
          ${option(item, 'action', 'pause')}
          ${option(item, 'action', 'repeat')}
          ${option(item, 'action', 'light off')}
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
        ${renderRemove(remove)}
      `
    } else if (item.action === 'light off') {
      return renderRemove(remove)
    } else if (item.action === 'pause') {
      return html`
        <input type="number" oninput="${setValue(indexArr)}" value=${item.value}>
        ${renderRemove(remove)}
      `
    } else if (item.action === 'if' || item.action === 'else if') {
      return html`
        <select oninput="${setValue(indexArr)}">
          ${option(item, 'value', 'color is')}
          ${option(item, 'value', 'light is off')}
          ${option(item, 'value', 'light is on')}
        </select>
        ${item.value === 'color is' ? renderColorSelect(item, indexArr, 'value2', setValue2) : ''}
        ${renderRemove(remove)}
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
        ${renderRemove(remove)}
        <div class="block repeat level${indexArr.length % 2}">
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
      Your name: <input type="text" id="name" value="${state.name}" oninput="${setName}" />
      <br>
      Brightness: <input type="number" id="brightness" min="1" max="255" value="${state.brightness}" oninput="${setBrightness}" />
      <br>
      <div id="editor">
        ${renderInsert([-1], emit)}
        ${state.code.map((item, i) => {
          return renderCodeItem(emit, item, [i], (i > 0) ? state.code[i - 1] : null, state.colors)
        })}
      </div>
      <pre><code class="cpp">${state.prettyCode}</code></pre>
      <form action="https://formspree.io/contact@tyleryasaka.me" method="POST">
        <input type="hidden" name="code" value="${state.prettyCode}">
        <button type="submit">Send code</button>
      </form>
    </body>
  `

  function clear () {
    emit('clear')
  }

  function setBrightness (e) {
    emit('updateBrightness', e.target.value)
  }

  function setName (e) {
    emit('updateName', e.target.value)
  }
}

function globalStore (state, emitter) {
  const stateCode = localStorage.getItem('state-code')
  const stateBright = localStorage.getItem('state-brightness')
  const statePretty = localStorage.getItem('state-pretty')
  const stateName = localStorage.getItem('state-name')
  state.brightness = stateBright ? Number(stateBright) : 10
  state.name = stateName || ''
  state.colors = [
    { id: 'a', name: 'red', value: '255, 0, 0' },
    { id: 'b', name: 'orange', value: '255, 89, 0' },
    { id: 'c', name: 'yellow', value: '255, 255, 0' },
    { id: 'd', name: 'green', value: '0, 255, 0' },
    { id: 'e', name: 'blue', value: '0, 0, 255' },
    { id: 'f', name: 'purple', value: '221, 0, 255' }
  ]
  state.code = stateCode ? JSON.parse(stateCode) : [
    { action: 'set color', value: 'a' }
  ]
  state.prettyCode = statePretty || ''

  emitter.on('DOMContentLoaded', function() {
    prettify()
  })

  emitter.on('updateBrightness', function (value) {
    state.brightness = value
    emitter.emit('render')
  })

  emitter.on('updateName', function (value) {
    state.name = value
    emitter.emit('render')
  })

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
    } else if (action === 'pause') {
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
    state.prettyCode = genCode(state.code, state.colors, state.brightness, state.name)
    localStorage.setItem('state-code', stateCode)
    localStorage.setItem('state-brightness', brightness)
    localStorage.setItem('state-pretty', state.prettyCode)
    localStorage.setItem('state-name', state.name)
    setTimeout(prettify, 0)
  })
}

function prettify () {
  document.querySelectorAll('pre code').forEach((block) => {
    hljs.highlightBlock(block)
  })
}

function genCode (items, colors, brightness, name) {
  const seed = { value: 0 }
  const loopCode = genCodeHelp(items, colors, seed)
  return `/*------------------------------
  Code by ${name}
------------------------------*/
#include <Adafruit_NeoPixel.h>
#define LED_PIN 6
#define LED_COUNT 1

Adafruit_NeoPixel pixels(LED_COUNT, LED_PIN, NEO_GRB + NEO_KHZ800);
int analogPin = 9;
int cR = 0;
int cG = 0;
int cB = 0;

void setup() {
  Serial.begin(9600);
  pixels.begin();
  lightOff();
  pixels.setBrightness(${brightness});
}

void loop() {
${loopCode}}

void setColor(int r, int g, int b) {
  while(cR != r || cG != g || cB != b) {
    cR = adjustColor(cR, r);
    cG = adjustColor(cG, g);
    cB = adjustColor(cB, b);
    pixels.setPixelColor(0, pixels.Color(cR, cG, cB));
    pixels.show();
    delay(100);
  }
}

int adjustColor(int current, int dest) {
  if (current == dest) {
    return dest;
  }
  int delta = dest - current;
  int adjustment = (delta / 10);
  if (adjustment == 0) {
    if (delta > 0) {
      adjustment = 5;
    } else {
      adjustment = -5;
    }
  }
  int newVal = current + adjustment;
  if (delta == 0) {
    return dest;
  } else if ((delta > 0 && newVal < dest) || (delta < 0 && newVal > dest)) {
    return newVal;
  } else {
    return dest;
  }
}

void lightOff() {
  setColor(0, 0, 0);
  pixels.clear();
  pixels.show();
}`
}

function genCodeHelp (items, colors, seed, level = 1) {
  let tabs = ''
  for (let i = 0; i < level; i++) {
    tabs = tabs + '  '
  }
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
          ${genCodeHelp(item.items, colors, seed, level + 1)}
        }
      `
    } else if (item.action === 'pause') {
      const ms = item.value * 1000
      return `${tabs}delay(${ms});\n`
    } else if (item.action === 'set color') {
      const color = colors.filter(c => {
        return c.id === item.value
      })[0].value
      return `${tabs}setColor(${color});\n`
    } else if (item.action === 'repeat') {
      const count = Number(item.value)
      let counter = 'i'
      for (let i = 0; i < seed.value; i++) {
        counter = `${counter}i`
      }
      seed.value++
      return `${tabs}for (int ${counter} = 0; ${counter} < ${count}; ${counter}++) {
${genCodeHelp(item.items, colors, seed, level + 1)}${tabs}}
`
    } else if (item.action === 'light off') {
      return `${tabs}lightOff();\n`
    }
  }).join('')
}
