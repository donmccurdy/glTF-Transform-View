# @gltf-transform/view

[![Latest NPM release](https://img.shields.io/npm/v/@gltf-transform/view.svg)](https://www.npmjs.com/package/@gltf-transform/view)
[![Minzipped size](https://badgen.net/bundlephobia/minzip/@gltf-transform/view)](https://bundlephobia.com/result?p=@gltf-transform/view)
[![License](https://img.shields.io/badge/license-MIT-007ec6.svg)](https://github.com/donmccurdy/glTF-Transform-Render/blob/main/LICENSE)
[![Build Status](https://github.com/donmccurdy/glTF-Transform-View/workflows/build/badge.svg?branch=main&event=push)](https://github.com/donmccurdy/glTF-Transform-View/actions?query=workflow%3Abuild)

> _**IN DEVELOPMENT:** This project is currently in development, and missing some functionality._

View glTF-Transform [Scene](https://gltf-transform.donmccurdy.com/classes/scene.html),
[Node](https://gltf-transform.donmccurdy.com/classes/node.html),
[Mesh](https://gltf-transform.donmccurdy.com/classes/mesh.html),
[Material](https://gltf-transform.donmccurdy.com/classes/material.html),
[Texture](https://gltf-transform.donmccurdy.com/classes/material.html),
or other resources as [three.js](https://threejs.org/) objects,
keeping the three.js objects updated automatically as changes are made to the glTF-Transform
[Document](https://gltf-transform.donmccurdy.com/classes/document.html). Combined with
glTF-Transform's [WebIO](https://gltf-transform.donmccurdy.com/classes/core.platformio.html),
`@gltf-transform/view` provides a lossless workflow to load, view, edit, and export glTF assets,
particularly useful in editor-like applications on the web. Changes within a Document are reflected
in three.js immediately, and any features three.js doesn't support won't be lost — they just aren't rendered
in the preview.

> **NOTE:** While three.js can load glTF 2.0 models with [THREE.GLTFLoader](https://threejs.org/docs/index.html#examples/en/loaders/GLTFLoader)
> and export them with [THREE.GLTFExporter](https://threejs.org/docs/index.html#examples/en/loaders/GLTFExporter),
> the GLTFExporter step is lossy, and not a robust workflow for editing. On the other hand, the
> fast edit/refresh loop provided by `@gltf-transform/view` requires some additional memory overhead,
> and so this project is not meant to replace THREE.GLTFLoader for general-purpose loading.*

## Quickstart

Install:

```
npm install --save @gltf-transform/view
```

## API

```typescript
import { Scene, WebGLRenderer, PerspectiveCamera } from 'three';
import { WebIO } from '@gltf-transform/core';
import { KHRONOS_EXTENSIONS } from '@gltf-transform/extensions';
import { DocumentView } from '@gltf-transform/view';

// Set up three.js scene.

const scene = new Scene();
const camera = new PerspectiveCamera(50, window.innerWidth / window.innerHeight, .1, 100);
const renderer = new WebGLRenderer();
// ...

// Load glTF Document.
const io = new WebIO().registerExtensions(KHRONOS_EXTENSIONS);
const document = await io.read('./input.glb');
const documentView = new DocumentView(document);

// Add glTF content to the scene (just once).
const sceneDef = document.getRoot().listScenes()[0];
scene.add(documentView.view(sceneDef));

// Render.
function animate () {
	requestAnimationFrame(animate);
	renderer.render(scene, camera);
}

// When glTF Document is edited, scene updates automatically.
buttonEl.addEventListener('click', () => {
	const materialDef = document.getRoot().listMaterials()[0];
	materialDef.setBaseColorHex(0xFF0000);
});
```

> **NOTE:** Each DocumentView instance maintains reference counts and disposes of three.js WebGL
> resources (textures, geometry, materials) when the underlying glTF Transform properties are
> disposed. Unused resources are *not* disposed immediately, in case they might be used again later.
> To manually dispose of unused resources — e.g. to free up GPU memory — call  `documentView.gc()`.
> Resources will be re-allocated automatically if they are used again.

### Bindings

| binding       | status | comments    |
|---------------|--------|-------------|
| Scene         | ✅      | Dynamic     |
| Node          | ✅      | Dynamic     |
| Mesh          | ✅      | Dynamic     |
| Primitive     | ✅      | Dynamic     |
| Accessor      | ✅      | Dynamic     |
| Material      | ✅      | Dynamic     |
| Texture       | ✅      | Dynamic     |
| TextureInfo   | 🚧     | Static      |
| Morph Targets | ❌      | No bindings |
| Animation     | ❌      | No bindings |
| Camera        | ❌      | No bindings |
| Light         | ❌      | No bindings |

**Legend:**

- ✅&nbsp;&nbsp;Renders and updates
- 🚧&nbsp;&nbsp;Static render, no updates
- ❌&nbsp;&nbsp;Not rendered

### Extensions Supported

See https://github.com/donmccurdy/glTF-Transform-View/issues/7.

## Contributing

```shell
# Install dependencies.
yarn

# Build source, watch for changes.
yarn watch

# Build source, watch for changes, and run examples.
yarn dev

# Run tests.
yarn test
```
