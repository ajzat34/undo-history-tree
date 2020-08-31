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
history.add('add', {number: 1});
history.add('add', {number: 2});
history.undo();
history.add('add', {number: 3});
history.undo();
history.redoOld();
```
