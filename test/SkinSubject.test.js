import test from 'tape';
import { Document } from '@gltf-transform/core';
import { DocumentView, NullImageProvider } from '../dist/view.modern.js';

const imageProvider = new NullImageProvider();

test('SkinSubject', async t => {
	const document = new Document();
	const positionDef = document.createAccessor('POSITION')
		.setArray(new Float32Array([0, 0, 0, 1, 1, 1, 2, 2, 2]))
		.setType('VEC3');
	const jointsDef = document.createAccessor('JOINTS_0')
		.setArray(new Uint16Array([0, 1, 0, 0]))
		.setType('VEC4');
	const weightsDef = document.createAccessor('WEIGHTS_0')
		.setArray(new Float32Array([0.5, 0.5, 0, 0]))
		.setType('VEC4');
	const primDef = document.createPrimitive()
		.setAttribute('POSITION', positionDef)
		.setAttribute('JOINTS_0', jointsDef)
		.setAttribute('WEIGHTS_0', weightsDef);
	const meshDef = document.createMesh('Mesh').addPrimitive(primDef);
	const jointBDef = document.createNode('JointB');
	const jointADef = document.createNode('JointA').addChild(jointBDef);
	const skin = document.createSkin()
		.addJoint(jointADef)
		.addJoint(jointBDef);
	const armatureDef = document.createNode('Armature')
		.addChild(jointADef)
		.setSkin(skin)
		.setMesh(meshDef);

	const documentView = new DocumentView(document, {imageProvider});
	const armature = documentView.view(armatureDef);
	const boneA = armature.children.find((child) => child.name === 'JointA');
	const boneB = boneA.children[0];
	const mesh = armature.children.find((child) => child.name === 'Mesh');
	const prim = mesh.children.find((child) => child.type === 'SkinnedMesh');

	t.equals(armature.name, 'Armature', 'armature → name');
	t.equals(mesh.type, 'Group', 'armature → mesh');
	t.equals(prim.type, 'SkinnedMesh', 'armature → mesh → prim');
	t.equals(boneA.type, 'Bone', 'armature → jointA');
	t.equals(boneB.type, 'Bone', 'armature → jointA → jointB');
	t.ok(prim.skeleton, 'skeleton');
	t.deepEqual(prim.skeleton.bones, [boneA, boneB], 'skeleton.bones');
	t.equals(prim.skeleton.boneInverses.length, 2, 'skeleton.boneInverses');
	t.end();
});
