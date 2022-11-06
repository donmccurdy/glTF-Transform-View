import test from 'tape';
import { Document } from '@gltf-transform/core';
import { DocumentView, NullImageProvider } from '../dist/view.modern.js';

const imageProvider = new NullImageProvider();

test('SceneBinding', async t => {
	const document = new Document();
	let nodeDef;
	const sceneDef = document.createScene('MyScene')
		.addChild(document.createNode('Node1'))
		.addChild(nodeDef = document.createNode('Node2'))
		.addChild(document.createNode('Node3'));
	nodeDef.addChild(document.createNode('Node4'));

	const documentView = await new DocumentView().init(document, {imageProvider});
	const scene = documentView.view(sceneDef);

	t.equals(scene.name, 'MyScene', 'scene → name');
	sceneDef.setName('MySceneRenamed');
	t.equals(scene.name, 'MySceneRenamed', 'scene → name (renamed)');
	t.equals(scene.children.length, 3, 'scene → children → 3');

	t.equals(scene.children[1].children[0].name, 'Node4', 'scene → ... → grandchild');
	nodeDef.listChildren()[0].dispose();
	t.equals(scene.children[1].children.length, 0, 'scene → ... → grandchild (dispose)');

	nodeDef.dispose();
	t.equals(scene.children.length, 2, 'scene → children → 2');
	sceneDef.removeChild(sceneDef.listChildren()[0]);
	t.equals(scene.children.length, 1, 'scene → children → 1');

	t.end();
});
