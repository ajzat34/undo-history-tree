const {v4: uuid} = require('uuid');
const events = require('events');

/** Store a single undo step */
class Node {
  /**
  * @constructor
  * @param {string} type the event name
  * @param {Object} data anything
  * @param {String} parent the id of the node that this one should undo to
  */
  constructor(type, data, parent) {
    this.type = type;
    this.data = data;
    this.parent = parent;
    this.id = uuid().toString();

    this.recent = null;
    this.old = null;
  }

  /**
  * Add a child step
  * @param {String} nodeid the id of the step to add
  */
  next(nodeid) {
    this.old = this.recent;
    this.recent = nodeid;
  }

  /**
  * Convert to JSON
  * @return {Object} json version of document
  */
  toJSON() {
    return {
      type: 'Node',
      id: this.id,
      data: this.data,
      parent: this.parent,
      recent: this.recent,
      old: this.old,
    };
  }
}

/**
* Holds and manages an undo tree
*/
class Tree extends events.EventEmitter {
  /**
   * Callback for Tree class to handle undoing
   * @callback handler
   * @param {String} direction will be either "FORWARD" or "BACKWARD"
   * @param {Object} data
   */

  /**
  * @param {Object} options
  */
  constructor(options={}) {
    super();
    this.options = options;
    this.tree = new Map();
    this.counter = 0;
    this.current = this.node('ROOT', {ROOT: true}, null);
    this.keep = options.keep || 500;
    this.tail = this.current;
  }

  /**
  * Create a node
  * all same as Node.constructor
  * @param {string} type
  * @param {Object} data
  * @param {String} parent
  * @return {String} id of new node
  */
  node(type, data, parent) {
    this.counter++;
    const n = new Node(type, data, parent);
    this.tree.set(n.id, n);
    return n.id;
  }

  // same as Map.get()
  get(node) {
    return this.tree.get(node);
  }
  // same as Map.has()
  has(node) {
    return this.tree.has(node);
  }
  // get the current node
  get cn() {
    return this.get(this.current);
  }

  /**
  * Dispatch an event for an undo node
  * @param {string} event the name of the event
  * @param {string} direction the direction of the data,
      (forward, or backward) (not case sensitive)
  * @param {object} data
  */
  dispatch(event, direction, data) {
    direction = direction.toLowerCase();
    if (direction !== 'forward' && direction !== 'backward') {
      throw new Error(
          `value for direction must be one of 'forward' or 'backward', got ${direction}`);
    }
    this.emit(`${event}//${direction}`, data, event, direction);
  }

  dispatchUpdateEvent() {
    this.emit('__update');
  }

  /**
  * Handle a undo node
  * @param {string} event the name of the event
  * @param {string} direction the direction of the data,
      (forward, or backward) (not case sensitive)
  * @param {Function} callback a handler(data)
  */
  handle(event, direction, callback) {
    direction = direction.toLowerCase();
    if (direction !== 'forward' && direction !== 'backward') {
      throw new Error(
          `value for direction must be one of 'forward' or 'backward', got ${direction}`);
    }
    this.on(`${event}//${direction}`, callback);
  }

  /**
  * Handle all events
  * @param {function} callback
  */
  onUpdate(callback) {
    this.on('__update', callback);
  }

  /**
  * Add the next undo/redo step
  * @param {string} type the event name
  * @param {Object} data whatever you want
  * @return {string} the id of the new token
  */
  add(type, data) {
    const n = this.node(type, data, this.current);
    this.cn.next(n);
    this.current = n;
    const node = this.get(n);
    this.dispatch(node.type, 'FORWARD', node.data);
    if (this.counter > this.keep) this.purgeTail();
    this.dispatchUpdateEvent();
    return n;
  }

  /**
  * Modify a tokens data
  * @param {string} n the id of the target node
  * @param {function(object)} callback as function(data)
  */
  mutate(n, callback) {
    callback(this.get(n).data);
  }

  /**
  * Remove a node by id
  * @param {String} nodeid the target node
  */
  remove(nodeid) {
    this.counter--;
    this.tree.delete(nodeid);
  }

  /**
  * Poison an entire branch. Removes the top node,
      and all of its children, and all of their
      children, ect...
  * @param {String} nodeid the target node
  */
  poison(nodeid) {
    const n = this.get(nodeid);
    if (n) {
      this.poison(n.recent);
      this.poison(n.old);
      this.remove(nodeid);
    }
  }

  /**
  * Removes the oldest node. Also poisons the old-branch,
  and sets the new tail to the base of the recent-branch.
  */
  purgeTail() {
    const n = this.get(this.tail);
    // poison the old branch
    this.poison(n.old);
    // remove the tail node
    this.remove(this.tail);
    // make the recent branch the new tail
    this.tail = n.recent;
    this.dispatchUpdateEvent();
  }

  /**
  * Call this when you want to undo
  * @return {Bool} was the undo successfull
  */
  undo() {
    const n = this.cn.parent;
    // check some stuff
    if (!n) return false;
    if (!this.has(n)) return false;
    // make this the new current
    this.current = n;
    // call the handler
    const node = this.cn;
    this.dispatch(node.type, 'BACKWARD', node.data);
    this.dispatchUpdateEvent();
    return true;
  }

  /**
  * Call this when you want to redo
  * @return {Bool} was the redo successfull
  */
  redo() {
    const n = this.cn.recent;
    if (!n) return false;
    if (!this.has(n)) return false;
    // make this the new current
    this.current = n;
    // call the handler
    const node = this.get(n);
    this.dispatch(node.type, 'FORWARD', node.data);
    this.dispatchUpdateEvent();
    return true;
  }

  /**
  * Call this when you want to redo
  * @return {Bool} was the redo successfull
  */
  redoOld() {
    const n = this.cn.old;
    if (!n) return false;
    if (!this.has(n)) return false;
    // make this the new current
    this.current = n;
    // call the handler
    const node = this.get(n);
    this.dispatch(node.type, 'FORWARD', node.data);
    this.dispatchUpdateEvent();
    return true;
  }

  /**
  * Get all children of a node
  * @param {String} nodeid the id of the node to start on
  * @return {null | Object} this nodes data, and ID,
    recursivly combined with the same information for it's children
  */
  getChildrenTree(nodeid) {
    if (!nodeid) return null;
    const n = this.get(nodeid);
    return {
      id: nodeid,
      type: n.type,
      data: n.data,
      recent: this.getChildrenTree(n.recent),
      old: this.getChildrenTree(n.old),
    };
  }

  /**
  * Lists the full undo tree
  * @return {Object} a representation of the entire undo history:
    {id, data, recent{id,data,recent...}, old{id,data,recent..}
  */
  list() {
    return this.getChildrenTree(this.tail);
  }
}

module.exports = Tree;
