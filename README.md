# @gltf-transform/render

Renders a glTF-Transform [Document](https://gltf-transform.donmccurdy.com/classes/document.html) with three.js / WebGL.

three.js provides glTF 2.0 support out of the box, [THREE.GLTFLoader](https://threejs.org/docs/index.html#examples/en/loaders/GLTFLoader), which is both more efficient (it will parse a glTF file faster) and better tested (it supports many extensions) compared to this package. But for applications that want to preview the effect of changes made to a glTF 2.0 file using the glTF-Transform SDK, serializing the Document to a glTF file and loading it in THREE.GLTFLoader creates a slow edit/preview cycle, because THREE.GLTFLoader has to process the glTF file "from scratch" each time a change is made.

 The goal of `@gltf-transform/render` is to provide a tighter integration between a Document and a three.js scene graph, so that changes to the Document are reflected quickly in the rendered result. For example, changes to a [Material](https://gltf-transform.donmccurdy.com/classes/material.html) property can be applied instantly. The cost of this integration is a slower first-time load — interleaved accessors are unpacked, and more intermediate structures are created — so the project is not meant to replace THREE.GLTFLoader for most users.

 ## Quickstart

```
yarn watch

npm install --global parcel-cli
parcel index.html
```

## API

Proposed:

```
...
```
