const Undo = require('./index.js');

let total = 0;
const events = [];

/**
* Handle undo/redo events
* @param {String} direction "FORWARD" or "BACKWARD"
* @param {Object} data
*/
function handler(direction, data) {
  events.push({
    direction: direction,
    data: data,
  });

  if (direction == 'FORWARD') {
    total += data.number;
  } else {
    total -= data.number;
  }
}

const history = new Undo(handler);

history.add({number: 1});
history.add({number: 2});
history.undo();
history.add({number: 3});

console.log(`Total: ${total}`);
console.log(events);
console.log(require('util').inspect(history.list(), {depth: null}));
console.log(history.current);
