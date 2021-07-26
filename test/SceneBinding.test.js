import test from 'tape';
import { Document } from '@gltf-transform/core';
import { DocumentRenderer } from '../dist/render.modern.js';

test('SceneBinding', t => {
	const document = new Document();
	let nodeDef;
	const sceneDef = document.createScene('MyScene')
		.addChild(document.createNode('Node1'))
		.addChild(nodeDef = document.createNode('Node2'))
		.addChild(document.createNode('Node3'));

	const renderer = new DocumentRenderer(document);
	const scene = renderer.toObject3D();

	t.equals(scene.name, 'MyScene');
	t.equals(scene.children.length, 3, 'scene → children → 3');

	nodeDef.dispose();
	renderer.update(sceneDef);
	t.equals(scene.children.length, 2, 'scene → children → 2');

	t.end();
});
