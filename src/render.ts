import { BufferAttribute, BufferGeometry, DoubleSide, FrontSide, Group, Mesh, MeshStandardMaterial, Object3D, SkinnedMesh, Texture, TextureLoader } from 'three';
import { assignFinalMaterial, assignFinalTexture, semanticToAttributeName } from 'utils';
import { Accessor as AccessorDef, Document, Material as MaterialDef, Mesh as MeshDef, Node as NodeDef, Texture as TextureDef } from '@gltf-transform/core';

/**
 * Constructs a THREE.Group hierarchy for a given glTF-Transform {@link Document}.
 *
 * Next:
 * - assignFinalMaterial()
 * - TRS Animation
 * - Skinning
 * - Morph targets
 * - Non-TRIANGLES modes
 *
 * Later:
 * - Cameras
 * - Extensions
 *
 * @param doc
 */
export async function render(doc: Document): Promise<Group> {
	const root = doc.getRoot();

	const sceneDef = root.listScenes()[0];
	const scene = new Group();
	scene.name = sceneDef.getName();

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
	const texturesPending: Promise<void>[] = [];
	for (const textureDef of root.listTextures()) {
		const blob = new Blob([textureDef.getImage()!], {type: textureDef.getMimeType()});
		const blobURL = URL.createObjectURL(blob);
		texturesPending.push(new Promise((resolve, reject) => {
			textureLoader.load(blobURL, (texture) => {
				textures.set(textureDef, texture);
				resolve();
				URL.revokeObjectURL(blobURL);
			}, undefined, reject);
		}));
	}
	await Promise.all(texturesPending);

	// Materials.

	const materials = new Map<MaterialDef, MeshStandardMaterial>();
	for (const materialDef of root.listMaterials()) {
		const material = new MeshStandardMaterial({
			name: materialDef.getName(),

			color: materialDef.getBaseColorHex(),
			opacity: materialDef.getAlpha(),
			alphaTest: materialDef.getAlphaMode() === 'MASK' ? materialDef.getAlphaCutoff() : 0,
			transparent: materialDef.getAlphaMode() === 'BLEND',

			emissive: materialDef.getEmissiveHex(),

			roughness: materialDef.getRoughnessFactor(),
			metalness: materialDef.getMetallicFactor(),
			aoMapIntensity: materialDef.getOcclusionStrength(),

			side: materialDef.getDoubleSided() ? DoubleSide : FrontSide
		});

		material.map = assignFinalTexture('baseColorTexture', materialDef.getBaseColorTexture(), materialDef.getBaseColorTextureInfo(), textures);
		material.emissiveMap = assignFinalTexture('emissiveTexture', materialDef.getEmissiveTexture(), materialDef.getEmissiveTextureInfo(), textures);
		material.roughnessMap = material.metalnessMap = assignFinalTexture('metallicRoughnessTexture', materialDef.getMetallicRoughnessTexture(), materialDef.getMetallicRoughnessTextureInfo(), textures);
		material.normalMap = assignFinalTexture('normalTexture', materialDef.getNormalTexture(), materialDef.getNormalTextureInfo(), textures);
		material.aoMap = assignFinalTexture('occlusionTexture', materialDef.getOcclusionTexture(), materialDef.getOcclusionTextureInfo(), textures);

		materials.set(materialDef, material);
	}

	// Meshes.

	const meshes = new Map<MeshDef, Group>();
	let defaultMaterial: MaterialDef;
	for (const meshDef of root.listMeshes()) {
		const mesh = new Group();
		mesh.name = meshDef.getName();

		for (const primDef of meshDef.listPrimitives()) {
			const primGeometry = new BufferGeometry();
			const prim = primDef.getAttribute('JOINTS_0')
				? new SkinnedMesh(primGeometry)
				: new Mesh(primGeometry);
			// TODO(bug): Assign default materials when missing.
			prim.material = assignFinalMaterial(primDef, materials.get(primDef.getMaterial()!)!, prim);
			prim.name = primDef.getName();

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
		node.name = nodeDef.getName();
		node.position.fromArray(nodeDef.getTranslation());
		node.quaternion.fromArray(nodeDef.getRotation());
		node.scale.fromArray(nodeDef.getScale());

		const meshDef = nodeDef.getMesh();
		if (meshDef) node.add(meshes.get(meshDef)!);

		nodes.set(nodeDef, node);
		scene.add(node);
	});

	//

	return scene;
}
