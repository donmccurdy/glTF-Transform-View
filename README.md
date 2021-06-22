# @gltf-transform/render

> _**IN DEVELOPMENT:** This project is currently in development, and missing key functionality.

Syncs a glTF-Transform [Document](https://gltf-transform.donmccurdy.com/classes/document.html)
with three.js / WebGL, keeping the three.js scene graph in sync over time as
changes are made to the Document.

three.js can render glTF 2.0 files out of the box, with
[THREE.GLTFLoader](https://threejs.org/docs/index.html#examples/en/loaders/GLTFLoader),
which is both more efficient (it will parse a glTF file faster) and better
tested (it supports many extensions) compared to this package. However, for
applications that need to preview the effect of changes to a glTF 2.0 file,
existing options have major limitations:

- **A.** Load with THREE.GLTFLoader, apply changes in three.js, export with
  THREE.GLTFExporter. For a small set of closely-controlled assets, this might
  be a good workflow. However, GLTFExporter<->GLTFLoader round-trip loading is
  lossy, and doesn't support all features of glTF.
- **B.** Apply changes in glTF-Transform, export with WebIO after each change,
  and load with THREE.GLTFLoader. This workflow is accurate, but slow — even a
  simple change to a material parameter requires reloading the entire file.

The goal of `@gltf-transform/render` is to provide a tighter integration
between a Document and a three.js scene graph, so that changes to the Document
are reflected quickly in the rendered result. For example, changes to a
[Material](https://gltf-transform.donmccurdy.com/classes/material.html)
can be applied instantly. The cost of this integration is a somewhat slower
first-time load — interleaved accessors are unpacked, and more intermediate
structures are created — so the project is not meant to replace
THREE.GLTFLoader for most users.

The workflow will:

1. Load a glTF Document with glTF-Transform API.
2. Construct initial three.js scene state.
3. Apply changes to glTF Document with glTF-Tranform API.
4. Sync, render, and repeat at 60+ FPS.

 ## Quickstart

```
# Build source.
yarn watch

# Run demo.
npm install --global parcel-cli
parcel index.html
```

## API

```
import { DocumentRenderer } from '@gltf-transform/render';
import { WebIO } from '@gltf-transform/core';
import { KHRONOS_EXTENSIONS } from '@gltf-transform/extensions';

// Load glTF Document.
const io = new WebIO().registerExtensions(KHRONOS_EXTENSIONS);
const document = await io.read('./input.glb');
const documentRenderer = new DocumentRenderer(document);

// Add the DocumentRenderer's output to the scene (just once).
const group = documentRenderer.toObject3D();
scene.add(group);

// When glTF Document is edited, trigger change detection.
documentRenderer.updateAll(); // full update (not yet implemented)
documentRenderer.update(mesh); // partial update

// Render.
function animate () {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
```

## Bugs / Limitations / To Do

- [ ] Dispose of resources removed from PropertyGraph.
- [ ] `.updateAll()` not yet implemented.
- [ ] Support more control of the update process. For example, flags for
    whether to re-upload vertex data or not.
- [ ] Certain bindings are not 1:1, for example multiple three.js Material
    instances may be needed to represent a single glTF Material. Currently
    these cases are handled naively.
- [ ] Animation not yet implemented.
- [ ] Material changes are incompletely supported. For example, Clearcoat
    and Transmission extensions are not fully observed.

### Extensions Supported

- [x] KHR_draco_mesh_compression
- [ ] KHR_lights_punctual
- [x] KHR_mesh_quantization
- [ ] KHR_materials_clearcoat
- [ ] KHR_materials_ior
- [ ] KHR_materials_pbrSpecularGlossiness
- [ ] KHR_materials_sheen
- [ ] KHR_materials_specular
- [ ] KHR_materials_transmission
- [x] KHR_materials_unlit
- [ ] KHR_materials_variants
- [ ] KHR_materials_volume
- [ ] KHR_texture_basisu
- [ ] KHR_texture_transform
