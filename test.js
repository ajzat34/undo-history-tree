const Undo = require('./index.js');

// create an undo tree
const history = new Undo();

// we will change this value with undo/redo events
let total = 0;

// increment for each .add .undo .redo ect.
let step = 0;

// create handlers
history.handle('add', 'forward', (data)=>{
  total += data.number;
});
history.handle('add', 'backward', (data)=>{
  total -= data.number;
});

function shouldBe(n) {
  step++;
  if (total !== n) {
    console.log(require('util').inspect(history.list(), {depth: null}));
    throw new Error(`Error on step ${step}: current value is ${n}, should be ${n}`);
  }
}

// feed it some data
history.add('add', {number: 1}); // 0+1 = 1
shouldBe(1);
history.add('add', {number: 2}); // 1+2 = 3
shouldBe(3);
history.undo(); // 3-2 = 1
shouldBe(1);
history.add('add', {number: 3}); // 1+3 = 4
shouldBe(4);
history.undo(); // 4-3 = 1
shouldBe(1);
history.redoOld(); // 1+2 = 3
shouldBe(3);
history.add('add', {number: 10}); // 3+10 = 13
shouldBe(13);
history.undo(); // 13-10 = 3
shouldBe(3);
history.redo(); // 13+10 = 13
shouldBe(13);

console.log(`Total: ${total}`);
console.log(`Successfull!`);
