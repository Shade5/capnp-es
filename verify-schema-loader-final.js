#!/usr/bin/env node
import { Message } from "./src/serialization/message.js";
import { SchemaLoader } from "./src/serialization/schema-loader.js";
import { NodeBundle } from "./NodeBundle.js";
import { readFileSync } from "node:fs";

// Type enum values (from schema.capnp)
const Type = {
  VOID: 0, BOOL: 1, INT8: 2, INT16: 3, INT32: 4, INT64: 5,
  UINT8: 6, UINT16: 7, UINT32: 8, UINT64: 9, FLOAT32: 10, FLOAT64: 11,
  TEXT: 12, DATA: 13, LIST: 14, ENUM: 15, STRUCT: 16, INTERFACE: 17, ANY_POINTER: 18
};

const TYPE_NAMES = {
  [Type.VOID]: 'Void', [Type.BOOL]: 'Bool', [Type.INT8]: 'Int8', [Type.INT16]: 'Int16',
  [Type.INT32]: 'Int32', [Type.INT64]: 'Int64', [Type.UINT8]: 'UInt8', [Type.UINT16]: 'UInt16',
  [Type.UINT32]: 'UInt32', [Type.UINT64]: 'UInt64', [Type.FLOAT32]: 'Float32', [Type.FLOAT64]: 'Float64',
  [Type.TEXT]: 'Text', [Type.DATA]: 'Data', [Type.LIST]: 'List', [Type.ENUM]: 'Enum',
  [Type.STRUCT]: 'Struct', [Type.INTERFACE]: 'Interface', [Type.ANY_POINTER]: 'AnyPointer'
};

function printSchemaStructure(node, nodesById, prefix = '', visited = new Set()) {
  if (!node._isStruct) return;
  
  const nodeId = node.id.toString();
  if (visited.has(nodeId)) {
    console.log(`${prefix} (recursive ref)`);
    return;
  }
  visited.add(nodeId);

  const fields = node.struct.fields;
  for (let i = 0; i < fields.length; i++) {
    const field = fields.get(i);
    if (!field._isSlot) continue;

    const slot = field.slot;
    const fieldType = slot.type;
    const typeWhich = fieldType.which();
    const fieldPath = prefix ? `${prefix}.${field.name}` : field.name;

    if (typeWhich === Type.STRUCT) {
      const structTypeId = fieldType.struct.typeId.toString();
      const nestedNode = nodesById.get(structTypeId);
      if (nestedNode) {
        const nestedName = nestedNode.displayName.split(":").pop();
        console.log(`${fieldPath}: ${nestedName}`);
        printSchemaStructure(nestedNode, nodesById, fieldPath, new Set(visited));
      } else {
        console.log(`${fieldPath}: Struct(unknown)`);
      }
    } else if (typeWhich === Type.LIST) {
      const elementType = fieldType.list.elementType;
      const elementTypeWhich = elementType.which();
      if (elementTypeWhich === Type.STRUCT) {
        const structTypeId = elementType.struct.typeId.toString();
        const nestedNode = nodesById.get(structTypeId);
        if (nestedNode) {
          const nestedName = nestedNode.displayName.split(":").pop();
          console.log(`${fieldPath}[:]: List<${nestedName}>`);
          printSchemaStructure(nestedNode, nodesById, `${fieldPath}[:]`, new Set(visited));
        } else {
          console.log(`${fieldPath}[:]: List<Struct(unknown)>`);
        }
      } else {
        console.log(`${fieldPath}[:]: List<${TYPE_NAMES[elementTypeWhich] || 'Unknown'}>`);
      }
    } else {
      console.log(`${fieldPath}: ${TYPE_NAMES[typeWhich] || 'Unknown'}`);
    }
  }
}

try {
  // Read JSON file and extract schemaData and msgRaw
  const data = JSON.parse(readFileSync('wbs_data.json', 'utf8'));
  const schemaData = data.schemaData;
  const msgB64 = data.msgRaw;

  // Decode base64
  const schemaRaw = Buffer.from(schemaData, 'base64');
  const msgRaw = Buffer.from(msgB64, 'base64');

  // Parse NodeBundle
  const message = new Message(schemaRaw, false);
  const bundle = message.getRoot(NodeBundle);
  const nodes = bundle.nodes;

  // Build maps of nodes
  const schemaLoader = new SchemaLoader();
  const schemasByName = new Map();
  const nodesById = new Map();
  const nodesByName = new Map();

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes.get(i);
    nodesById.set(node.id.toString(), node);
    
    if (!node._isStruct) continue;

    const loaded = schemaLoader.loadDynamic(node);
    if (node.displayName) {
      const simpleName = node.displayName.split(":").pop();
      schemasByName.set(simpleName, loaded);
      nodesByName.set(simpleName, node);
    }
  }

  // Print the schema structure
  const schemaName = 'WholeBodyState';
  const wbsNode = nodesByName.get(schemaName);
  
  if (!wbsNode) {
    throw new Error(`Schema '${schemaName}' not found`);
  }

  console.log(`\n=== Schema Structure: ${schemaName} ===\n`);
  printSchemaStructure(wbsNode, nodesById, schemaName);

  // Also decode and print a sample value
  const wbsSchema = schemasByName.get(schemaName);
  const wbsMessage = new Message(msgRaw, false, true);
  const wbs = wbsMessage.getRoot(wbsSchema.structCtor);

  console.log(`\n=== Sample Values ===\n`);
  console.log(`${schemaName}.header.stamp.sec:`, wbs.header.stamp.sec);
  console.log(`${schemaName}.header.stamp.nanosec:`, wbs.header.stamp.nanosec);
  console.log(`${schemaName}.jointStates[5].position:`, wbs.jointStates.get(5).position);

  process.exit(0);
} catch (error) {
  console.error("Error:", error.message);
  if (error.stack) {
    console.error(error.stack);
  }
  process.exit(1);
}
