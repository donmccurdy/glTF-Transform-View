import { Line, LineLoop, LineSegments, Mesh, Points, SkinnedMesh } from 'three';

export type MeshLike = Mesh | SkinnedMesh | Points | Line | LineSegments | LineLoop;

export interface THREEObject {
	name: string;
}
