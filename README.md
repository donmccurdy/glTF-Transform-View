# @gltf-transform/view

[![Latest NPM release](https://img.shields.io/npm/v/@gltf-transform/view.svg)](https://www.npmjs.com/package/@gltf-transform/view)
[![Minzipped size](https://badgen.net/bundlephobia/minzip/@gltf-transform/view)](https://bundlephobia.com/result?p=@gltf-transform/view)
[![License](https://img.shields.io/badge/license-MIT-007ec6.svg)](https://github.com/donmccurdy/glTF-Transform-Render/blob/main/LICENSE)
[![Build Status](https://github.com/donmccurdy/glTF-Transform-View/workflows/build/badge.svg?branch=main&event=push)](https://github.com/donmccurdy/glTF-Transform-View/actions?query=workflow%3Abuild)

Creates three.js objects from glTF [Scene](https://gltf-transform.donmccurdy.com/classes/scene.html),
[Node](https://gltf-transform.donmccurdy.com/classes/node.html),
[Mesh](https://gltf-transform.donmccurdy.com/classes/mesh.html),
[Material](https://gltf-transform.donmccurdy.com/classes/material.html)
and other properties, and keeps those three.js objects updated in realtime as changes are made
through the [glTF Transform](https://gltf-transform.donmccurdy.com/) library. Combined with
import/export using [WebIO](https://gltf-transform.donmccurdy.com/classes/core.platformio.html), `@gltf-transform/view`
provides a lossless workflow to load, view, edit, and export glTF assets — particularly useful in
editor-like applications on the web. Changes to a glTF Document are reflected in three.js
immediately, and any features three.js doesn't support won't be lost — they just aren't rendered
in the preview.

> **NOTICE:** three.js can load glTF 2.0 files with [THREE.GLTFLoader](https://threejs.org/docs/index.html#examples/en/loaders/GLTFLoader)
> and export them with [THREE.GLTFExporter](https://threejs.org/docs/index.html#examples/en/loaders/GLTFExporter),
> the GLTFExporter step is lossy and slow. In comparison, the fast edit/refresh loop provided by
>  `@gltf-transform/view` requires some additional memory overhead, and so this project is not
> meant to replace THREE.GLTFLoader for one-time resource loading.

## Quickstart

Installation:

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
// ...

// Load glTF Document.
const io = new WebIO().registerExtensions(KHRONOS_EXTENSIONS);
const document = await io.read('path/to/input.glb');
const documentView = new DocumentView(document);

// Add glTF content to the scene (just once).
const sceneDef = document.getRoot().listScenes()[0];
const sceneGroup = documentView.view(sceneDef);
scene.add(sceneGroup);

// Render.
function animate () {
	requestAnimationFrame(animate);
	renderer.render(scene, camera);
}

// When glTF Document is edited, scene updates automatically.
const materialDef = document.getRoot().listMaterials()
	.find((mat) => mat.getName() === 'MyMaterial');
buttonEl.addEventListener('click', () => {
	materialDef.setBaseColorHex(0xFF0000);
});
```

Each DocumentView instance maintains reference counts and disposes of three.js WebGL resources
(textures, geometry, materials) when the underlying glTF Transform properties are disposed.
Unused resources are *not* disposed immediately, in case they might be used again later. To
manually dispose of unused resources — e.g. to free up GPU memory — call  `documentView.gc()`.
Resources will be re-allocated automatically if they are used again.

### Bindings

- ✅&nbsp;&nbsp;Renders and updates
- 🚧&nbsp;&nbsp;Static render, no updates
- ❌&nbsp;&nbsp;Not rendered

| binding       | status |
|---------------|--------|
| Scene         | ✅      |
| Node          | ✅      |
| Mesh          | ✅      |
| Primitive     | ✅      |
| Accessor      | ✅      |
| Material      | ✅      |
| Texture       | ✅      |
| TextureInfo   | 🚧     |
| Morph Targets | ❌      |
| Animation     | ❌      |
| Camera        | ❌      |
| Light         | ❌      |

### Extensions supported

See [glTF-Transform-View#7](https://github.com/donmccurdy/glTF-Transform-View/issues/7).

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
