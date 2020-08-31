# undo-history-tree
undo history with a binary tree in NodeJS/Electron

# Usage
``` js
const Undo = require('./index.js');

// create an undo tree
const history = new Undo();

// we will change this value with undo/redo events
let total = 0;

// create handlers
history.handle('add', 'forward', (data)=>{
  total += data.number;
});
history.handle('add', 'backward', (data)=>{
  total -= data.number;
});

// feed it some data
// feed it some data
history.add('add', {number: 1});  // 0+1 = 1
history.add('add', {number: 2});  // 1+2 = 3
history.undo();                   // 3-2 = 1
history.add('add', {number: 3});  // 1+3 = 4
history.undo();                   // 4-3 = 1
history.redoOld();                // 1+2 = 3
history.add('add', {number: 10}); // 3+10 = 13
history.undo();                   // 13-10 = 3
history.redo();                   // 13+10 = 13

console.log('total', total)
```
