import test from 'tape';
import { Document, NodeIO } from '@gltf-transform/core';
import { DocumentView, NullImageProvider } from '../dist/view.modern.js';
import { Group } from 'three';

const imageProvider = new NullImageProvider();

test('DocumentView', t => {
    t.ok(new DocumentView(new Document(), {imageProvider}), 'constructor');
    t.end();
});

test('DocumentView | view', async t => {
    const document = new Document();
    const textureDef = document.createTexture();
    const materialDef = document.createMaterial()
        .setBaseColorTexture(textureDef)
        .setMetallicRoughnessTexture(textureDef);
    const primDef = document.createPrimitive()
        .setMaterial(materialDef);
    const meshDef = document.createMesh()
        .addPrimitive(primDef);
    const nodeDef = document.createNode()
        .setMesh(meshDef);
    const sceneDef = document.createScene()
        .addChild(nodeDef);

    const documentView = new DocumentView(document, {imageProvider});

    const scene = documentView.view(sceneDef);
    const node = scene.children[0];
    const mesh = node.children[0];
    const prim = mesh.children[0];
    let material = prim.material;
    let texture = material.map;

    t.ok(scene instanceof Group, 'scene → THREE.Group')
    t.deepEquals(documentView.listViews(sceneDef), [scene], 'scene views');
    t.equals(documentView.listViews(nodeDef).length, 1, 'node views');
    t.equals(documentView.listViews(meshDef).length, 1, 'mesh views');
    // 1 external prim, 1 internal prim. See SingleUserPool.
    t.equals(documentView.listViews(primDef).length, 2, 'prim views');
    t.equals(documentView.listViews(materialDef).length, 1, 'material views');
    t.equals(documentView.listViews(textureDef).length, 2, 'texture views');
    t.equals(documentView.getProperty(scene), sceneDef, 'scene → source');
    t.equals(documentView.getProperty(node), nodeDef, 'node → source');
    t.equals(documentView.getProperty(mesh), meshDef, 'mesh → source');
    t.equals(documentView.getProperty(prim), primDef, 'prim → source');
    t.equals(documentView.getProperty(material), materialDef, 'material → source');
    t.equals(documentView.getProperty(texture), textureDef, 'texture → source');

    material = documentView.view(materialDef);
    t.equals(material.type, 'MeshStandardMaterial', 'material → THREE.MeshStandardMaterial');
    t.equals(documentView.listViews(materialDef).length, 2, 'material views');
    t.equals(documentView.listViews(textureDef).length, 2, 'texture views');
    t.equals(documentView.getProperty(material), materialDef, 'material → source');

    texture = documentView.view(textureDef);
    t.ok(texture.isTexture, 'texture → THREE.Texture');
    t.equals(documentView.listViews(textureDef).length, 3, 'texture views');
    t.equals(documentView.getProperty(texture), textureDef, 'texture → source');

    t.end();
});

test('DocumentView | dispose', async t => {
    const document = new Document();
    const texDef1 = document.createTexture('Tex1')
    .setMimeType('image/png')
    .setImage(new Uint8Array(0));
    const texDef2 = document.createTexture('Tex2')
    .setMimeType('image/png')
    .setImage(new Uint8Array(0));
    const materialDef = document.createMaterial('Material')
    .setBaseColorTexture(texDef1)
    .setEmissiveTexture(texDef2);
    const primDef = document.createPrimitive().setMaterial(materialDef);
    const sceneDef = document.createScene('Scene').addChild(
        document.createNode('Node')
            .setMesh(document.createMesh('Mesh').addPrimitive(primDef))
    );

    const documentView = new DocumentView(document, {imageProvider});
    const scene = documentView.view(sceneDef);
    const mesh = scene.getObjectByName('Mesh').children[0];
    const {geometry, material} = mesh;
    const {map, emissiveMap} = material;

    const disposed = new Set();
    geometry.addEventListener('dispose', () => disposed.add(geometry));
    material.addEventListener('dispose', () => disposed.add(material));
    map.addEventListener('dispose', () => disposed.add(map));
    emissiveMap.addEventListener('dispose', () => disposed.add(emissiveMap));

    t.equals(disposed.size, 0, 'initial resources')

    documentView.dispose();

    t.equals(disposed.size, 4);
    t.ok(disposed.has(geometry), 'disposed geometry');
    t.ok(disposed.has(material), 'disposed material');
    t.ok(disposed.has(map), 'disposed baseColorTexture');
    t.ok(disposed.has(emissiveMap), 'disposed emissiveTexture');
    t.end();
});

// test.skip('DocumentView | alloc', async t => {
//     // TODO(bug): It's OK for allocations to happen here,
//     // but make sure they're properly gc'd...
//     nodeDef.setMesh(meshDef);
//     nodeDef.setMesh(null);
//     nodeDef.setMesh(meshDef);
//     nodeDef.setMesh(null);
//     nodeDef.setMesh(meshDef);
//     nodeDef.setMesh(null);
//     nodeDef.setMesh(meshDef);
//     nodeDef.setMesh(null);

//     documentView.gc();

//     t.deepEquals(documentView.stats(), expectedStats, 'stats (after)');
//     console.log(documentView.stats());
//     t.end();
// });
