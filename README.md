# @gltf-transform/render

[![Latest NPM release](https://img.shields.io/npm/v/@gltf-transform/render.svg)](https://www.npmjs.com/package/@gltf-transform/render)
[![Minzipped size](https://badgen.net/bundlephobia/minzip/@gltf-transform/render)](https://bundlephobia.com/result?p=@gltf-transform/render)
[![License](https://img.shields.io/badge/license-MIT-007ec6.svg)](https://github.com/donmccurdy/glTF-Transform-Render/blob/main/LICENSE)
[![Build Status](https://github.com/donmccurdy/glTF-Transform-Render/workflows/build/badge.svg?branch=main&event=push)](https://github.com/donmccurdy/glTF-Transform-Render/actions?query=workflow%3Abuild)

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

**`@gltf-transform/render` provides a tighter integration between a glTF
Document and a three.js scene graph**, so that changes within the Document
(e.g. to a [Material](https://gltf-transform.donmccurdy.com/classes/material.html)
settings) are shown _instantly_ in the rendered result. In addition, any
features that three.js doesn't support won't be lost — they just aren't
rendered in the preview.

> *NOTE: The fast edit/refresh loop requires some additional memory overhead, so this
> project is not meant to replace THREE.GLTFLoader for one-time loading.*

## Quickstart

Install:

```
npm install --save @gltf-transform/render
```

## API

```typescript
import { Scene, WebGLRenderer, PerspectiveCamera } from 'three';
import { WebIO } from '@gltf-transform/core';
import { KHRONOS_EXTENSIONS } from '@gltf-transform/extensions';
import { GLTFRenderer } from '@gltf-transform/render';

// Set up three.js scene.

const scene = new Scene();
const camera = new PerspectiveCamera(50, window.innerWidth / window.innerHeight, .1, 100);
const renderer = new WebGLRenderer();
// ...

// Load glTF Document.
const io = new WebIO().registerExtensions(KHRONOS_EXTENSIONS);
const document = await io.read('./input.glb');
const documentRenderer = new GLTFRenderer(document);

// Add the GLTFRenderer's output to the scene (just once).
const groupDef = document.getRoot().listScenes()[0];
const group = documentRenderer.render(scene);
scene.add(group);

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

### Bindings

| binding     | status | comments    |
|-------------|--------|-------------|
| Scene       | ✅      | Dynamic     |
| Node        | ✅      | Dynamic     |
| Mesh        | ✅      | Dynamic     |
| Primitive   | ✅      | Dynamic     |
| Accessor    | ✅      | Dynamic     |
| Material    | ✅      | Dynamic     |
| Texture     | ✅      | Dynamic     |
| TextureInfo | 🚧     | Static      |
| Animation   | ❌      | No bindings |
| Camera      | ❌      | No bindings |
| Light       | ❌      | No bindings |

**Legend:**

- ✅&nbsp;&nbsp;Renders and updates
- 🚧&nbsp;&nbsp;Static render, no updates
- ❌&nbsp;&nbsp;Not rendered

## Bugs / Limitations / To Do

See https://github.com/donmccurdy/glTF-Transform-Render/issues/8.

### Extensions Supported

See https://github.com/donmccurdy/glTF-Transform-Render/issues/7.

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
