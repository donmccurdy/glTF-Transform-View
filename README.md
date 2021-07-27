# @gltf-transform/render

> _**IN DEVELOPMENT:** This project is currently in development, and missing key functionality._

Syncs a glTF-Transform [Document](https://gltf-transform.donmccurdy.com/classes/document.html)
with a [three.js](https://threejs.org/) scene graph, keeping three.js in sync
over time as changes are made to the Document. When changes are complete,
export the exact glTF model — losslessly — with the
[glTF-Transform I/O](https://gltf-transform.donmccurdy.com/classes/core.platformio.html) tools.

three.js can render glTF 2.0 files without this package. However, for
web applications that need to preview repeated changes to a glTF 2.0 file,
existing options have major limitations:

- **A.** Load with [THREE.GLTFLoader](https://threejs.org/docs/index.html#examples/en/loaders/GLTFLoader),
  apply changes in three.js, export with [THREE.GLTFExporter](https://threejs.org/docs/#examples/en/exporters/GLTFExporter).
  For a small set of closely-controlled assets, this might
  be a good workflow. However, THREE.GLTFExporter↔THREE.GLTFLoader round-trip
  loading is lossy, and doesn't support all features of glTF.
- **B.** Apply changes in glTF-Transform, export with [WebIO](https://gltf-transform.donmccurdy.com/classes/core.webio.html)
  after each change, and load with THREE.GLTFLoader. This workflow is accurate,
  but slow to repeat — even a simple change to a material parameter requires
  reloading the entire file.

The goal of `@gltf-transform/render` is to provide a tighter integration
between a glTF Document and a three.js scene graph, so that changes to the Document
are reflected quickly in the rendered result. For example, changes to a
[Material](https://gltf-transform.donmccurdy.com/classes/material.html)
can be applied instantly. In addition, any features that three.js doesn't
support won't be lost — they just aren't rendered in the preview. The cost of
this integration is a somewhat slower first-time load, so the project is not
meant to replace THREE.GLTFLoader for most users.

Basic workflow:

1. Load a glTF Document with glTF-Transform API.
2. Construct initial three.js scene state.
3. Apply changes to glTF Document with glTF-Tranform API.
4. Sync, render, and repeat at 60+ FPS.

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
| Material  | ✅     | Complete     |
| Texture   | 🚧     | Static       |
| Mesh      | 🚧     | Static       |
| Primitive | 🚧     | Static       |
| Animation | ❌     | No bindings  |
| Camera    | ❌     | No bindings  |
| Light     | ❌     | No bindings  |

**Legend:**

- ✅ Supports initial render and updates.
- 🚧 Supports initial render, but no updates.
- ❌ No support.

## Bugs / Limitations / To Do

**P0:**

- [ ] Dispose of resources removed from PropertyGraph
- [ ] Correct tangent space normal maps
- [ ] Unit tests

**P2:**

- [ ] Granular update process (e.g. vertex data flag)
- [ ] Animation
- [ ] Cameras
- [ ] Extras / Custom Properties

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

- [ ] KHR_materials_specular
- [ ] KHR_materials_volume
- [ ] KHR_texture_transform
- [ ] KHR_texture_basisu

**P2:**

- [ ] KHR_lights_punctual
- [ ] KHR_materials_pbrSpecularGlossiness
- [ ] KHR_materials_sheen
- [ ] KHR_materials_variants
- [ ] EXT_mesh_gpu_instancing
- [ ] EXT_meshopt_compression
