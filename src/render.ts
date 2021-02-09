import { BufferAttribute, BufferGeometry, DoubleSide, FrontSide, Group, Mesh, MeshStandardMaterial, Object3D, SkinnedMesh, Texture, TextureLoader } from 'three';
import { Accessor as AccessorDef, Document, Material as MaterialDef, Mesh as MeshDef, Node as NodeDef, Texture as TextureDef } from '@gltf-transform/core';

export function render(doc: Document): Group {
	const root = doc.getRoot();

	const sceneDef = root.listScenes()[0];
	const scene = new Group();

	// Accessors.

	const accessors = new Map<AccessorDef, BufferAttribute>();
	for (const accessorDef of root.listAccessors()) {
		accessors.set(accessorDef, new BufferAttribute(
			accessorDef.getArray()!,
			accessorDef.getElementSize(),
			accessorDef.getNormalized()
		));
	}

	// Textures.

	const textures = new Map<TextureDef, Texture>();
	const textureLoader = new TextureLoader();
	for (const textureDef of root.listTextures()) {
		const blob = new Blob([textureDef.getImage()!], {type: textureDef.getMimeType()});
		const blobURL = URL.createObjectURL(blob);
		const texture = textureLoader.load(blobURL, () => {
			URL.revokeObjectURL(blobURL); // TODO: Firefox?
		});
		textures.set(textureDef, texture);
	}

	// Materials.

	const materials = new Map<MaterialDef, MeshStandardMaterial>();
	for (const materialDef of root.listMaterials()) {
		const material = new MeshStandardMaterial({
			color: materialDef.getBaseColorHex(),
			map: materialDef.getBaseColorTexture() ? textures.get(materialDef.getBaseColorTexture()!) : null,
			opacity: materialDef.getBaseColorFactor()[3],
			alphaTest: materialDef.getAlphaCutoff(),
			transparent: materialDef.getAlphaMode() === 'BLEND',

			emissive: materialDef.getEmissiveHex(),
			emissiveMap: materialDef.getEmissiveTexture() ? textures.get(materialDef.getEmissiveTexture()!) : null,

			roughness: materialDef.getRoughnessFactor(),
			roughnessMap: materialDef.getMetallicRoughnessTexture() ? textures.get(materialDef.getMetallicRoughnessTexture()!) : null,
			metalness: materialDef.getMetallicFactor(),
			metalnessMap: materialDef.getMetallicRoughnessTexture() ? textures.get(materialDef.getMetallicRoughnessTexture()!) : null,
			aoMapIntensity: materialDef.getOcclusionStrength(),
			aoMap: materialDef.getOcclusionTexture() ? textures.get(materialDef.getOcclusionTexture()!) : null,

			side: materialDef.getDoubleSided() ? DoubleSide : FrontSide
		})

		materials.set(materialDef, material);
		// TODO(bug): Textures.
		// TODO(bug): TextureInfos.
		// TODO(bug): All that assignFinalMaterial() reconciliation.
	}

	// Meshes.

	const meshes = new Map<MeshDef, Group>();
	for (const meshDef of root.listMeshes()) {
		const mesh = new Group();
		for (const primDef of meshDef.listPrimitives()) {
			const primGeometry = new BufferGeometry();
			const primMaterial = materials.get(primDef.getMaterial()!);
			const prim = primDef.getAttribute('JOINTS_0')
				? new SkinnedMesh(primGeometry, primMaterial)
				: new Mesh(primGeometry, primMaterial);

			// Attributes.
			for (const semantic of primDef.listSemantics()) {
				const attributeDef = primDef.getAttribute(semantic)!;
				primGeometry.setAttribute(
					semanticToAttributeName(semantic),
					accessors.get(attributeDef)!
				);
			}

			// Indices.
			const indexDef = primDef.getIndices();
			if (indexDef) primGeometry.setIndex(accessors.get(indexDef)!);

			mesh.add(prim);
		}
		meshes.set(meshDef, mesh);
	}

	// Nodes.

	const nodes = new Map<NodeDef, Object3D>();
	sceneDef.traverse((nodeDef) => {
		const node = new Object3D();
		// node.matrix.fromArray(nodeDef.getMatrix());
		node.position.fromArray(nodeDef.getTranslation());
		node.rotation.fromArray(nodeDef.getRotation());
		node.scale.fromArray(nodeDef.getScale());

		const meshDef = nodeDef.getMesh();
		if (meshDef) node.add(meshes.get(meshDef)!);

		nodes.set(nodeDef, node);
		scene.add(node);
	});

	//

	return scene;
}

function semanticToAttributeName(semantic: string): string {
	switch (semantic) {
		case 'POSITION': return 'position';
		case 'NORMAL': return 'normal';
		case 'TANGENT': return 'tangent';
		case 'COLOR_0': return 'color';
		case 'JOINTS_0': return 'skinIndex';
		case 'WEIGHTS_0': return 'skinWeight';
		case 'TEXCOORD_0': return 'uv';
		case 'TEXCOORD_1': return 'uv2';
		default: return '_' + semantic.toLowerCase();
	}
}
