'use client'

// ThreeDViewer — React Three Fiber alternative to ModelViewer.
// Uses @react-three/fiber (WebGL canvas) + @react-three/drei helpers.
//
// NOTE: This component is NOT currently used in the app — ModelViewer (which
// uses Google's <model-viewer> web component) was chosen instead because it
// natively handles iOS/Android AR launch and has simpler loading management.
// ThreeDViewer remains in the codebase as a fallback if model-viewer is ever dropped.

import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, useGLTF, Stage } from '@react-three/drei'
import { Skeleton } from '@/components/ui/skeleton'

// Model — inner component that actually loads and renders the GLB scene graph.
// `useGLTF` is a Drei hook that fetches and caches the file; it suspends
// (throws a Promise) while loading, which lets the Suspense boundary above show the fallback.
function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url)
  return <primitive object={scene} />
}

// Preloads a GLB into the Drei/Three.js cache before the component mounts.
// Calling this early (e.g. when the item card enters view) means the model
// is already parsed by the time the viewer opens.
export function preloadGLB(url: string) {
  useGLTF.preload(url)
}

interface ThreeDViewerProps {
  glbUrl: string
}

export default function ThreeDViewer({ glbUrl }: ThreeDViewerProps) {
  return (
    <div className="w-full h-72 rounded-xl overflow-hidden bg-muted">
      {/*
        Outer Suspense: catches the Canvas itself suspending (rare but possible).
        Inner Suspense (inside Canvas): catches the Model's useGLTF fetch —
        passing `fallback={null}` means nothing renders in the 3D scene while loading.

        Camera: positioned 2.5 units back with a 50° field of view.
        Stage: provides automatic environment lighting + centers/scales the model.
        OrbitControls: allows touch/mouse rotation but not panning;
          clamped between 0.5 and 4 units, auto-rotates at speed 1.
      */}
      <Suspense fallback={<Skeleton className="w-full h-full" />}>
        <Canvas camera={{ position: [0, 0, 2.5], fov: 50 }}>
          <Suspense fallback={null}>
            <Stage environment="city" intensity={0.6} adjustCamera={0.6}>
              <Model url={glbUrl} />
            </Stage>
            <OrbitControls
              enablePan={false}
              minDistance={0.5}
              maxDistance={4}
              autoRotate
              autoRotateSpeed={1}
            />
          </Suspense>
        </Canvas>
      </Suspense>
    </div>
  )
}
