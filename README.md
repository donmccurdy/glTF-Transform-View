# @gltf-transform/render

> _**IN DEVELOPMENT:** This project is currently in development, and missing some functionality._

Syncs a glTF-Transform [Document](https://gltf-transform.donmccurdy.com/classes/document.html)
with a [three.js](https://threejs.org/) scene graph, keeping three.js updated
over time as changes are made to the Document. After changes are complete,
export the exact glTF document — losslessly — with the
[glTF-Transform NodeIO / WebIO](https://gltf-transform.donmccurdy.com/classes/core.platformio.html)
tools.

## Motivation

While three.js can render glTF 2.0 files out of the box with
[THREE.GLTFLoader](https://threejs.org/docs/index.html#examples/en/loaders/GLTFLoader),
and export them with [THREE.GLTFLoader](https://threejs.org/docs/index.html#examples/en/loaders/GLTFLoader),
this approach has an important limitation: the GLTFExporter → GLTFLoader
trip is lossy, and doesn't support all features of glTF. For a small set
of closely-controlled assets, this might be a good workflow. But in
general, it is error-prone.

Another alternative might be to apply changes in glTF-Transform, export with
[WebIO](https://gltf-transform.donmccurdy.com/classes/core.webio.html),
and reload with THREE.GLTFLoader. This workflow is accurate, but slow to
repeat — even a simple change to a material parameter requires reloading the
entire file.

**The goal of `@gltf-transform/render` is to provide a tighter integration
between a glTF Document and a three.js scene graph**, so that changes to the
Document (e.g. [Material](https://gltf-transform.donmccurdy.com/classes/material.html)
settings) are shown _instantly_ in the rendered result. In addition, any
features that three.js doesn't support won't be lost — they just aren't
rendered in the preview.

Basic workflow:

1. Load a glTF [Document](https://gltf-transform.donmccurdy.com/classes/core.document.html) with glTF-Transform's [WebIO](https://gltf-transform.donmccurdy.com/classes/core.webio.html)
2. Construct three.js scene with `DocumentRenderer`
3. Begin ~60 FPS render loop
4. Apply changes to [Document](https://gltf-transform.donmccurdy.com/classes/core.document.html); update `DocumentRenderer` state

The cost of this fast edit/refresh loop is a somewhat slower first-time load
and additional memory overhead, so the project is not meant to replace
THREE.GLTFLoader for most users.

 ## Quickstart

```shell
# Install dependencies.
yarn

# Build source, watch for changes.
yarn watch

# Build source, watch for changes, and run examples.
yarn dev
```

## API

```typescript
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
documentRenderer.updateAll(); // (a) full update
documentRenderer.update(mesh); // (b) partial update

// Render.
function animate () {
	requestAnimationFrame(animate);
	renderer.render(scene, camera);
}
```

## Bindings

| binding   | status | comments     |
|-----------|--------|--------------|
| Scene     | ✅     | Complete     |
| Node      | ✅     | Complete     |
| Material  | ✅     | Complete     |
| Texture   | 🚧     | Static       |
| Mesh      | 🚧     | Static       |
| Primitive | 🚧     | Static       |
| Animation | ❌     | No bindings  |
| Camera    | ❌     | No bindings  |
| Light     | ❌     | No bindings  |

**Legend:**

- ✅&nbsp;&nbsp;Renders and updates
- 🚧&nbsp;&nbsp;Static render, no updates
- ❌&nbsp;&nbsp;Not rendered

## Bugs / Limitations / To Do

**P0:**

- [ ] Correct tangent space normal maps
- [ ] Dispose of resources removed from PropertyGraph
- [ ] Granular update process (e.g. vertex data flag)
- [ ] Unit tests

### Extensions Supported

**Complete:**

- [x] KHR_draco_mesh_compression
- [x] KHR_mesh_quantization
- [x] KHR_materials_clearcoat
- [x] KHR_materials_ior
- [x] KHR_materials_transmission
- [x] KHR_materials_unlit
- [x] EXT_texture_webp

**P0:**

- [ ] KHR_materials_volume
- [ ] KHR_texture_transform
- [ ] KHR_texture_basisu

**P2:**

- [ ] KHR_lights_punctual
- [ ] KHR_materials_pbrSpecularGlossiness
- [ ] KHR_materials_sheen
- [ ] KHR_materials_specular
- [ ] KHR_materials_variants
- [ ] EXT_mesh_gpu_instancing
- [ ] EXT_meshopt_compression
