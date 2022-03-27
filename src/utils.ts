import { Line, LineLoop, LineSegments, Mesh, Points, SkinnedMesh } from 'three';

export type MeshLike = Mesh | SkinnedMesh | Points | Line | LineSegments | LineLoop;

export function eq(a: number[], b: number[]): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

export interface THREEObject {
	name: string;
}
