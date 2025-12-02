// Modified NodeBundle to use local imports instead of "capnp-es"
import * as $ from "./src/index.js";
import { Node } from "./src/capnp/schema.js";

export const _capnpFileId = BigInt("0xf7a0f8a7c41d8b1e");

export class NodeBundle extends $.Struct {
  static _capnp = {
    displayName: "NodeBundle",
    id: "9da0f4c06ad9cb67",
    size: new $.ObjectSize(8, 2),
  };

  static _Nodes;

  _adoptNodes(value) {
    $.utils.adopt(value, $.utils.getPointer(0, this));
  }

  _disownNodes() {
    return $.utils.disown(this.nodes);
  }

  get nodes() {
    return $.utils.getList(0, NodeBundle._Nodes, this);
  }

  _hasNodes() {
    return !$.utils.isNull($.utils.getPointer(0, this));
  }

  _initNodes(length) {
    return $.utils.initList(0, NodeBundle._Nodes, length, this);
  }

  set nodes(value) {
    $.utils.copyFrom(value, $.utils.getPointer(0, this));
  }

  get format() {
    return $.utils.getText(1, this);
  }

  set format(value) {
    $.utils.setText(1, value, this);
  }

  get version() {
    return $.utils.getUint32(0, this);
  }

  set version(value) {
    $.utils.setUint32(0, value, this);
  }

  toString() {
    return "NodeBundle_" + super.toString();
  }
}

NodeBundle._Nodes = $.CompositeList(Node);
