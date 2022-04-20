import { BufferGeometry, Line, LineLoop, LineSegments, Material, Mesh, Points, SkinnedMesh } from 'three';

export type Subscription = () => void;

export type MeshLike = Mesh<BufferGeometry, Material>
	| SkinnedMesh<BufferGeometry, Material>
	| Points<BufferGeometry, Material>
	| Line<BufferGeometry, Material>
	| LineSegments<BufferGeometry, Material>
	| LineLoop<BufferGeometry, Material>;

export interface THREEObject { name: string; type: string; };
