import test from 'tape';
import { Document } from '@gltf-transform/core';
import { DocumentView } from '../dist/view.modern.js';
import { Group } from 'three';

test('DocumentView', t => {
    t.ok(new DocumentView(new Document()), 'constructor');
    t.end();
});

test('DocumentView | view', t => {
    const document = new Document();
    const sceneDef = document.createScene();
    const textureDef = document.createTexture();
    const materialDef = document.createMaterial()
        .setBaseColorTexture(textureDef)
        .setMetallicRoughnessTexture(textureDef);

    const documentView = new DocumentView(document);
    const scene = documentView.view(sceneDef);
    t.ok(scene instanceof Group, 'scene → THREE.Group')
    t.deepEquals(documentView.listViews(sceneDef), [scene], '1 scene view');
    t.equals(documentView.listViews(materialDef).length, 0, '0 material views');
    t.equals(documentView.listViews(textureDef).length, 0, '0 texture views');
    t.equals(documentView.getProperty(scene), sceneDef, 'scene → source');

    const material = documentView.view(materialDef);
    t.equals(material.type, 'MeshStandardMaterial', 'material → THREE.MeshStandardMaterial');
    t.equals(documentView.listViews(materialDef).length, 1, '1 material view');
    t.equals(documentView.listViews(textureDef).length, 2, '2 texture views');
    t.equals(documentView.getProperty(material), materialDef, 'material → source');

    const texture = documentView.view(textureDef);
    t.ok(texture.isTexture, 'texture → THREE.Texture');
    t.equals(documentView.listViews(textureDef).length, 3, '3 texture views');
    t.equals(documentView.getProperty(texture), textureDef, 'texture → source');
    t.end();
});

test('DocumentView | dispose', t => {
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

    const documentView = new DocumentView(document);
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
