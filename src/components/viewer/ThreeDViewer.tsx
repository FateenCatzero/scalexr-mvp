'use client'

import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, useGLTF, Stage } from '@react-three/drei'
import { Skeleton } from '@/components/ui/skeleton'

function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url)
  return <primitive object={scene} />
}

export function preloadGLB(url: string) {
  useGLTF.preload(url)
}

interface ThreeDViewerProps {
  glbUrl: string
}

export default function ThreeDViewer({ glbUrl }: ThreeDViewerProps) {
  return (
    <div className="w-full h-72 rounded-xl overflow-hidden bg-muted">
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
