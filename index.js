const {v4: uuid} = require('uuid');

/** Store a single undo step */
class Node {
  /**
  * @constructor
  * @param {Object} data wharever you want!
  * @param {String} parent the id of the node that this one should undo to
  */
  constructor(data, parent) {
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
class Tree {
  /**
   * Callback for Tree class to handle undoing
   * @callback handler
   * @param {String} direction will be either "FORWARD" or "BACKWARD"
   * @param {Object} data
   */

  /**
  * @param {Handler} handler a callback to handle undo and redo events
  * @param {Object} options
  */
  constructor(handler, options) {
    this.handler = handler;
    this.options = options;
    this.tree = new Map();
    this.counter = 0;
    this.current = this.node({ROOT: true}, null);
    if (!options) options={};
    this.keep = options.keep || 500;
    this.tail = this.current;
  }

  /**
  * Create a node
  * @param {Object} data
  * @param {String} parent
  * @return {String} id of new node
  */
  node(data, parent) {
    this.counter++;
    const n = new Node(data, parent);
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
  * Add the next undo/redo step
  * @param {Object} data whatever you want
  */
  add(data) {
    const n = this.node(data, this.current);
    this.cn.next(n);
    this.handler('FORWARD', this.get(n).data);
    this.current = n;
    if (this.counter > this.keep) this.purgeTail();
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
    // call the handler
    this.handler('BACKWARD', this.cn.data);
    // make this the new current
    this.current = n;
    return true;
  }

  /**
  * Call this when you want to redo
  * @return {Bool} was the undo successfull
  */
  redo() {
    const n = this.cn.recent;
    if (!n) return false;
    if (!this.has(n)) return false;
    // make this the new current
    this.current = n;
    // call the handler
    this.handler('FORWARD', this.cn.data);
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
