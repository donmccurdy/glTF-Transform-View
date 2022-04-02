import { BufferGeometry, Line, LineBasicMaterial, LineLoop, LineSegments, Material, Mesh, Points, PointsMaterial, SkinnedMesh } from 'three';

export type MeshLike = Mesh<BufferGeometry, Material>
	| SkinnedMesh<BufferGeometry, Material>
	| Points<BufferGeometry, Material>
	| Line<BufferGeometry, Material>
	| LineSegments<BufferGeometry, Material>
	| LineLoop<BufferGeometry, Material>;

export interface THREEObject {
	name: string;
}
