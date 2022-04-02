import test from 'tape';
import { Document, Primitive as PrimitiveDef } from '@gltf-transform/core';
import { DocumentView } from '../dist/view.modern.js';

test('PrimitiveBinding', t => {
    const document = new Document();
    const position = document.createAccessor()
    .setType('VEC3')
    .setArray(new Float32Array([
        0, 0, 0,
        0, 0, 1,
        0, 1, 1,
        0, 1, 0,
        0, 0, 0,
    ]));
    const primDef = document.createPrimitive()
    .setAttribute('POSITION', position);

    const documentView = new DocumentView(document);
    let prim = documentView.view(primDef);
    const geometry = prim.geometry;

    const disposed = new Set();
    geometry.addEventListener('dispose', () => disposed.add(geometry));

    t.equals(prim.type, 'Mesh', 'Mesh');

    primDef.setMode(PrimitiveDef.Mode.POINTS);
    prim = documentView.view(primDef);

    t.equals(prim.type, 'Points', 'Points');

    primDef.setMode(PrimitiveDef.Mode.LINES);
    prim = documentView.view(primDef);

    t.equals(prim.type, 'LineSegments', 'LineSegments');

    primDef.setMode(PrimitiveDef.Mode.LINE_LOOP);
    prim = documentView.view(primDef);

    t.equals(prim.type, 'LineLoop', 'LineLoop');

    primDef.setMode(PrimitiveDef.Mode.LINE_STRIP);
    prim = documentView.view(primDef);

    t.equals(prim.type, 'Line', 'Line');

    t.equals(disposed.size, 0, 'preserve geometry');

    primDef.dispose();

    t.equals(disposed.size, 1, 'dispose geometry');

    t.end();
});
