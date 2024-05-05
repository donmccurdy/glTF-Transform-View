# @gltf-transform/view

> ⚠️ Package moved to the [glTF-Transform monorepo](https://github.com/donmccurdy/glTF-Transform).

## Overview

Creates three.js objects from a glTF Transform [Document](https://gltf-transform.donmccurdy.com/classes/core.document.html), then keeps the three.js scene graph updated — in realtime ⚡️ — as changes are made to the Document. Combined with import/export using [WebIO](https://gltf-transform.donmccurdy.com/classes/core.platformio.html), `@gltf-transform/view` provides a lossless workflow to load, view, edit, and export glTF assets. It's meant for editor-like applications on the web. Unlike using [THREE.GLTFExporter](https://threejs.org/docs/index.html#examples/en/loaders/GLTFExporter), any glTF features that three.js doesn't support won't be lost, they just aren't rendered in the preview.

## License

Published under [Blue Oak Model License 1.0.0](/LICENSE.md).
