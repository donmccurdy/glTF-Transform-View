import test from 'ava';
import { Document } from '@gltf-transform/core';
import { DocumentView, NullImageProvider } from '@gltf-transform/view';
import { BufferGeometry, Group, Mesh, MeshStandardMaterial, Texture } from 'three';

const imageProvider = new NullImageProvider();

test('DocumentView', t => {
    t.truthy(new DocumentView(new Document(), {imageProvider}), 'constructor');
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
    const prim = mesh.children[0] as Mesh<BufferGeometry, MeshStandardMaterial>;
    let material = prim.material;
    let texture = material.map as Texture;

    t.true(scene instanceof Group, 'scene → THREE.Group');
    t.deepEqual(documentView.listViews(sceneDef), [scene], 'scene views');
    t.is(documentView.listViews(nodeDef).length, 1, 'node views');
    t.is(documentView.listViews(meshDef).length, 1, 'mesh views');
    // 1 external prim, 1 internal prim. See SingleUserPool.
    t.is(documentView.listViews(primDef).length, 2, 'prim views');
    t.is(documentView.listViews(materialDef).length, 1, 'material views');
    t.is(documentView.listViews(textureDef).length, 2, 'texture views');
    t.is(documentView.getProperty(scene), sceneDef, 'scene → source');
    t.is(documentView.getProperty(node), nodeDef, 'node → source');
    t.is(documentView.getProperty(mesh), meshDef, 'mesh → source');
    t.is(documentView.getProperty(prim), primDef, 'prim → source');
    t.is(documentView.getProperty(material), materialDef, 'material → source');
    t.is(documentView.getProperty(texture), textureDef, 'texture → source');

    material = documentView.view(materialDef) as MeshStandardMaterial;
    t.is(material.type, 'MeshStandardMaterial', 'material → THREE.MeshStandardMaterial');
    t.is(documentView.listViews(materialDef).length, 2, 'material views');
    t.is(documentView.listViews(textureDef).length, 2, 'texture views');
    t.is(documentView.getProperty(material), materialDef, 'material → source');

    texture = documentView.view(textureDef);
    t.true(texture.isTexture, 'texture → THREE.Texture');
    t.is(documentView.listViews(textureDef).length, 3, 'texture views');
    t.is(documentView.getProperty(texture), textureDef, 'texture → source');
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
    const mesh = scene.getObjectByName('Mesh')!.children[0] as
        Mesh<BufferGeometry, MeshStandardMaterial>;
    const {geometry, material} = mesh;
    const {map, emissiveMap} = material as {map: Texture, emissiveMap: Texture};

    const disposed = new Set();
    geometry.addEventListener('dispose', () => disposed.add(geometry));
    material.addEventListener('dispose', () => disposed.add(material));
    map.addEventListener('dispose', () => disposed.add(map));
    emissiveMap.addEventListener('dispose', () => disposed.add(emissiveMap));

    t.is(disposed.size, 0, 'initial resources');

    documentView.dispose();

    t.is(disposed.size, 4);
    t.true(disposed.has(geometry), 'disposed geometry');
    t.true(disposed.has(material), 'disposed material');
    t.true(disposed.has(map), 'disposed baseColorTexture');
    t.true(disposed.has(emissiveMap), 'disposed emissiveTexture');
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

//     t.deepEqual(documentView.stats(), expectedStats, 'stats (after)');
//     console.log(documentView.stats());
// });
